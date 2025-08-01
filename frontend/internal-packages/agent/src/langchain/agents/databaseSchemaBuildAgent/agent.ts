import {
  type AIMessage,
  type BaseMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { err, ok, ResultAsync } from 'neverthrow'
import * as v from 'valibot'
import type { ToolConfigurable } from '../../../db-agent/getToolConfigurable'
import { schemaDesignTool } from '../../../db-agent/tools/schemaDesignTool'
import {
  extractToolCallIds,
  hasMatchingToolCallId,
} from '../../../utils/messageHelpers'
import { reasoningSchema } from '../../utils/schema'
import type { Reasoning } from '../../utils/types'
import { type DesignAgentPromptVariables, designAgentPrompt } from './prompts'

const model = new ChatOpenAI({
  model: 'o4-mini',
  reasoning: { effort: 'high', summary: 'detailed' },
  useResponsesApi: true,
}).bindTools([schemaDesignTool], { parallel_tool_calls: false })

type DesignAgentResult = {
  response: AIMessage
  reasoning: Reasoning | null
}

export const invokeDesignAgent = (
  variables: DesignAgentPromptVariables,
  messages: BaseMessage[],
  configurable: ToolConfigurable,
): ResultAsync<DesignAgentResult, Error> => {
  // Debug: Log messages being sent to the model
  if (process.env['NODE_ENV'] !== 'production') {
    // biome-ignore lint/suspicious/noConsole: Debug logging
    console.log('[DEBUG] invokeDesignAgent - Messages to model:', {
      messageCount: messages.length,
      messageTypes: messages.map((m) => m._getType()),
      messagesWithToolCalls: messages.map((m, idx) => ({
        index: idx,
        type: m._getType(),
        hasToolCalls:
          'tool_calls' in m &&
          Array.isArray(m.tool_calls) &&
          m.tool_calls.length > 0,
        toolCallIds: 'tool_calls' in m ? extractToolCallIds(m.tool_calls) : [],
      })),
      toolMessagesWithCallIds: messages
        .filter((m): m is ToolMessage => m._getType() === 'tool')
        .map((m) => ({
          tool_call_id: m.tool_call_id,
          name: m.name,
          contentPreview:
            typeof m.content === 'string'
              ? m.content.substring(0, 100)
              : m.content,
        })),
    })
  }

  const formatPrompt = ResultAsync.fromSafePromise(
    designAgentPrompt.format(variables),
  )

  const invokeWithRetry = (
    systemPrompt: string,
    currentMessages: BaseMessage[],
    retryCount = 0,
  ): ResultAsync<AIMessage, Error> => {
    const maxRetries = 3

    return ResultAsync.fromThrowable(
      () =>
        model.invoke([new SystemMessage(systemPrompt), ...currentMessages], {
          configurable,
        }),
      (error: unknown) =>
        error instanceof Error ? error : new Error(String(error)),
    )()
      .andThen((response) => {
        return ok(response)
      })
      .orElse((error) => {
        // Check if this is a tool call sync error
        if (
          error.message.includes(
            'No tool call found for function call output',
          ) &&
          retryCount < maxRetries
        ) {
          if (process.env['NODE_ENV'] !== 'production') {
            // biome-ignore lint/suspicious/noConsole: Debug logging
            console.log(
              `[DEBUG] invokeDesignAgent - Tool call sync error detected. Retrying (${retryCount + 1}/${maxRetries})...`,
            )
          }

          // Filter out orphaned tool messages
          const filteredMessages = currentMessages.filter((msg, idx) => {
            if (msg._getType() === 'tool' && msg instanceof ToolMessage) {
              // Check if there's a corresponding AI message with matching tool call
              const hasMatchingToolCall = currentMessages.some(
                (m, i) =>
                  i < idx &&
                  m._getType() === 'ai' &&
                  'tool_calls' in m &&
                  hasMatchingToolCallId(m.tool_calls, msg.tool_call_id),
              )
              if (
                !hasMatchingToolCall &&
                process.env['NODE_ENV'] !== 'production'
              ) {
                // biome-ignore lint/suspicious/noConsole: Debug logging
                console.log(
                  `[DEBUG] invokeDesignAgent - Filtering out orphaned tool message with call_id: ${msg.tool_call_id}`,
                )
              }
              return hasMatchingToolCall
            }
            return true
          })

          // Wait with exponential backoff
          return ResultAsync.fromSafePromise(
            new Promise<void>((resolve) =>
              setTimeout(resolve, 2 ** retryCount * 1000),
            ),
          ).andThen(() =>
            invokeWithRetry(systemPrompt, filteredMessages, retryCount + 1),
          )
        }
        return err(error)
      })
  }

  return formatPrompt
    .andThen((systemPrompt) => invokeWithRetry(systemPrompt, messages))
    .andThen((response) => {
      // Debug: Log the response from the model
      if (process.env['NODE_ENV'] !== 'production') {
        // biome-ignore lint/suspicious/noConsole: Debug logging
        console.log('[DEBUG] invokeDesignAgent - Model response:', {
          hasToolCalls: response.tool_calls && response.tool_calls.length > 0,
          toolCallCount: response.tool_calls?.length || 0,
          toolCallIds: response.tool_calls
            ? extractToolCallIds(response.tool_calls)
            : [],
          contentPreview:
            typeof response.content === 'string'
              ? response.content.substring(0, 100)
              : response.content,
        })
      }

      const parsedReasoning = v.safeParse(
        reasoningSchema,
        response.additional_kwargs['reasoning'],
      )
      const reasoning = parsedReasoning.success ? parsedReasoning.output : null

      return ok({
        response,
        reasoning,
      })
    })
}
