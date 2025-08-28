import type { BaseMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import type { WorkflowState } from '../../chat/workflow/types'
import { saveTestcasesAndDmlTool } from '../tools/saveTestcasesAndDmlTool'

const toolNode = new ToolNode([saveTestcasesAndDmlTool])

export const invokeSaveTestcasesAndDmlToolNode = async (
  state: WorkflowState,
  config: RunnableConfig,
): Promise<{ messages: BaseMessage[] }> => {
  // Unlike the previous saveDmlTool, we don't need to pass testcases in configurable
  // because the tool itself generates them along with DML operations
  return toolNode.invoke(state, config)
}
