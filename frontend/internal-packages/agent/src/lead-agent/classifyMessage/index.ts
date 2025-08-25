import { SystemMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import { END } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { ResultAsync } from 'neverthrow'
import { getConfigurable } from '../../chat/workflow/shared/getConfigurable'
import type { WorkflowConfigurable } from '../../chat/workflow/types'
import { WorkflowTerminationError } from '../../shared/errorHandling'
import type { LeadAgentState } from '../annotation'
import { routeToAgent } from '../tools/routeToAgent'
import { prompt } from './prompt'
import { hasToolCalls } from './utils'

const model = new ChatOpenAI({
  model: 'gpt-5-nano',
}).bindTools([routeToAgent], {
  parallel_tool_calls: false,
  tool_choice: 'auto',
})

export async function classifyMessage(
  state: LeadAgentState,
  config: RunnableConfig,
): Promise<Partial<LeadAgentState>> {
  const invoke = ResultAsync.fromThrowable(
    (configurable: WorkflowConfigurable) => {
      return model.invoke([new SystemMessage(prompt), ...state.messages], {
        configurable,
      })
    },
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )

  const result = await getConfigurable(config).asyncAndThen(invoke)

  if (result.isErr()) {
    throw new WorkflowTerminationError(result.error, 'classifyMessage')
  }

  const response = result.value

  if (!hasToolCalls(response)) {
    return {
      messages: [response],
      next: END,
    }
  }

  return {
    messages: [response],
  }
}

export const toolNode = new ToolNode([routeToAgent])
