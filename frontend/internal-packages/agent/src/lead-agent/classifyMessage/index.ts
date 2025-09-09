import { dispatchCustomEvent } from '@langchain/core/callbacks/dispatch'
import {
  type AIMessageChunk,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import { Command, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { fromAsyncThrowable } from '@liam-hq/neverthrow'
import { v4 as uuidv4 } from 'uuid'
import { SSE_EVENTS } from '../../client'
import type { WorkflowConfigurable, WorkflowState } from '../../types'
import { WorkflowTerminationError } from '../../utils/errorHandling'
import { getConfigurable } from '../../utils/getConfigurable'
import { streamLLMResponse } from '../../utils/streamingLlmUtils'
import { routeToAgent } from '../tools/routeToAgent'
import { isQACompleted } from '../utils/workflowStatus'
import { prompt } from './prompt'

const AGENT_NAME = 'lead' as const

export async function classifyMessage(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<Command> {
  // 1. Check if QA is completed first (highest priority)
  if (isQACompleted(state)) {
    return new Command({ goto: 'summarizeWorkflow' })
  }

  // 2. Analyze initial request with LLM
  const model = new ChatOpenAI({
    model: 'gpt-5-nano',
  }).bindTools([routeToAgent], {
    parallel_tool_calls: false,
    tool_choice: 'auto',
  })

  const stream = fromAsyncThrowable((configurable: WorkflowConfigurable) =>
    model.stream([new SystemMessage(prompt), ...state.messages], {
      configurable,
    }),
  )

  const response = fromAsyncThrowable((stream: AsyncIterable<AIMessageChunk>) =>
    streamLLMResponse(stream, {
      agentName: AGENT_NAME,
      eventType: SSE_EVENTS.MESSAGES,
    }),
  )

  const result = await getConfigurable(config)
    .asyncAndThen(stream)
    .andThen(response)

  if (result.isErr()) {
    throw new WorkflowTerminationError(result.error, 'classifyMessage')
  }

  const aiMessage = result.value

  // 3. Check if database design request (tool call to routeToAgent)
  if (aiMessage.tool_calls?.[0]?.name === 'routeToAgent') {
    // Create ToolMessage to properly complete the tool call
    const id = uuidv4()
    const toolMessage = new ToolMessage({
      id,
      status: 'success',
      content: aiMessage.tool_calls[0].args?.['targetAgent'] || 'pmAgent',
      tool_call_id: aiMessage.tool_calls[0].id ?? '',
    })
    await dispatchCustomEvent(SSE_EVENTS.MESSAGES, toolMessage)

    // Route to PM Agent with both the AI response and tool completion
    return new Command({
      update: {
        messages: [aiMessage, toolMessage],
        next: 'pmAgent',
      },
      goto: END,
    })
  }

  // 4. Regular response without routing
  return new Command({
    update: {
      messages: [aiMessage],
      next: END,
    },
    goto: END,
  })
}
