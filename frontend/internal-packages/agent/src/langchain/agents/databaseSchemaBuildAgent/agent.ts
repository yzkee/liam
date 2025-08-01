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
import { hasMatchingToolCallId } from '../../../utils/messageHelpers'
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
