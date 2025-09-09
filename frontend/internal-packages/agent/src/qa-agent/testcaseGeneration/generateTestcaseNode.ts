import { dispatchCustomEvent } from '@langchain/core/callbacks/dispatch'
import {
  AIMessage,
  AIMessageChunk,
  type BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { fromAsyncThrowable } from '@liam-hq/neverthrow'
import { removeReasoningFromMessages } from '../../utils/messageCleanup'
import { saveTestcaseTool } from '../tools/saveTestcaseTool'
import {
  humanPromptTemplateForTestcaseGeneration,
  SYSTEM_PROMPT_FOR_TESTCASE_GENERATION,
} from './prompts'
import type { testcaseAnnotation } from './testcaseAnnotation'

const model = new ChatOpenAI({
  model: 'gpt-5-nano',
  reasoning: { effort: 'minimal', summary: 'auto' },
  verbosity: 'low',
  useResponsesApi: true,
}).bindTools([saveTestcaseTool], {
  parallel_tool_calls: false,
  tool_choice: 'auto',
})

/**
 * Generate Test Case Node for Subgraph
 * Generates test cases and DML operations for a single requirement
 * This node is part of the testcase subgraph with isolated message state
 */
export async function generateTestcaseNode(
  state: typeof testcaseAnnotation.State,
): Promise<{ messages: BaseMessage[] }> {
  const { currentRequirement, schemaContext, messages } = state

  const contextMessage = await humanPromptTemplateForTestcaseGeneration.format({
    schemaContext,
    businessContext: currentRequirement.businessContext,
    requirementType: currentRequirement.type,
    requirementCategory: currentRequirement.category,
    requirement: currentRequirement.requirement,
  })

  const cleanedMessages = removeReasoningFromMessages(messages)

  const streamModel = fromAsyncThrowable(() => {
    return model.stream([
      new SystemMessage(SYSTEM_PROMPT_FOR_TESTCASE_GENERATION),
      new HumanMessage(contextMessage),
      // Include all previous messages in this subgraph's scope
      ...cleanedMessages,
    ])
  })

  const streamResult = await streamModel()

  if (streamResult.isErr()) {
    // eslint-disable-next-line no-throw-error/no-throw-error -- Required for LangGraph retry mechanism
    throw new Error(
      `Failed to generate test case for ${currentRequirement.category}: ${streamResult.error.message}`,
    )
  }

  const stream = streamResult.value

  // OpenAI ("chatcmpl-...") and LangGraph ("run-...") use different id formats,
  // so we overwrite with a UUID to unify chunk ids for consistent handling.
  const id = crypto.randomUUID()
  let accumulatedChunk: AIMessageChunk | null = null

  for await (const _chunk of stream) {
    const chunk = new AIMessageChunk({ ..._chunk, id, name: 'qa-agent' })
    await dispatchCustomEvent('messages', chunk)

    // Accumulate chunks using concat method
    accumulatedChunk = accumulatedChunk ? accumulatedChunk.concat(chunk) : chunk
  }

  // Convert the final accumulated chunk to AIMessage
  const response = accumulatedChunk
    ? new AIMessage({
        content: accumulatedChunk.content,
        additional_kwargs: accumulatedChunk.additional_kwargs,
        ...(accumulatedChunk.tool_calls && {
          tool_calls: accumulatedChunk.tool_calls,
        }),
      })
    : new AIMessage('')

  return {
    messages: [response],
  }
}
