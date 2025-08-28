import { SystemMessage, ToolMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import { Command, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { fromAsyncThrowable } from '@liam-hq/neverthrow'
import { getConfigurable } from '../../chat/workflow/shared/getConfigurable'
import type {
  WorkflowConfigurable,
  WorkflowState,
} from '../../chat/workflow/types'
import { WorkflowTerminationError } from '../../shared/errorHandling'
import { routeToAgent } from '../tools/routeToAgent'
import { isQACompleted } from '../utils/workflowStatus'
import { prompt } from './prompt'

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

  const invoke = fromAsyncThrowable((configurable: WorkflowConfigurable) => {
    return model.invoke([new SystemMessage(prompt), ...state.messages], {
      configurable,
    })
  })

  const result = await getConfigurable(config).asyncAndThen(invoke)

  if (result.isErr()) {
    throw new WorkflowTerminationError(result.error, 'classifyMessage')
  }

  const response = result.value

  // 3. Check if database design request (tool call to routeToAgent)
  if (response.tool_calls?.[0]?.name === 'routeToAgent') {
    // Create ToolMessage to properly complete the tool call
    const toolMessage = new ToolMessage({
      content: response.tool_calls[0].args?.['targetAgent'] || 'pmAgent',
      tool_call_id: response.tool_calls[0].id ?? '',
    })

    // Route to PM Agent with both the AI response and tool completion
    return new Command({
      update: {
        messages: [response, toolMessage],
        next: 'pmAgent',
      },
      goto: END,
    })
  }

  // 4. Regular response without routing
  return new Command({
    update: {
      messages: [response],
      next: END,
    },
    goto: END,
  })
}
