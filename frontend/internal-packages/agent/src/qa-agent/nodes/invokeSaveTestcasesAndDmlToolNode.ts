import { ToolNode } from '@langchain/langgraph/prebuilt'
import { saveTestcasesAndDmlTool } from '../tools/saveTestcasesAndDmlTool'

export const invokeSaveTestcasesAndDmlToolNode = new ToolNode([
  saveTestcasesAndDmlTool,
])
