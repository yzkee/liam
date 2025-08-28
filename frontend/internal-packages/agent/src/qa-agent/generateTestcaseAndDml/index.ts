import {
  type BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { ResultAsync } from 'neverthrow'
import type { WorkflowState } from '../../chat/workflow/types'
import { WorkflowTerminationError } from '../../shared/errorHandling'
import { convertSchemaToText } from '../../utils/convertSchemaToText'
import { removeReasoningFromMessages } from '../../utils/messageCleanup'
import { saveTestcasesAndDmlTool } from '../tools/saveTestcasesAndDmlTool'
import { humanPromptTemplate, SYSTEM_PROMPT } from './prompt'

/**
 * Format analyzed requirements for the prompt
 */
function formatAnalyzedRequirements(
  analyzedRequirements: WorkflowState['analyzedRequirements'],
): string {
  if (!analyzedRequirements) {
    return 'No requirements available.'
  }

  const sections = []

  // Business Requirement
  if (analyzedRequirements.businessRequirement) {
    sections.push(
      '## Business Requirement',
      analyzedRequirements.businessRequirement,
      '',
    )
  }

  // Functional Requirements
  if (
    analyzedRequirements.functionalRequirements &&
    Object.keys(analyzedRequirements.functionalRequirements).length > 0
  ) {
    sections.push('## Functional Requirements')
    for (const [category, requirements] of Object.entries(
      analyzedRequirements.functionalRequirements,
    )) {
      if (requirements && requirements.length > 0) {
        sections.push(`### ${category}`)
        for (const req of requirements) {
          sections.push(`- ${req}`)
        }
        sections.push('')
      }
    }
  }

  // Non-Functional Requirements
  if (
    analyzedRequirements.nonFunctionalRequirements &&
    Object.keys(analyzedRequirements.nonFunctionalRequirements).length > 0
  ) {
    sections.push('## Non-Functional Requirements')
    for (const [category, requirements] of Object.entries(
      analyzedRequirements.nonFunctionalRequirements,
    )) {
      if (requirements && requirements.length > 0) {
        sections.push(`### ${category}`)
        for (const req of requirements) {
          sections.push(`- ${req}`)
        }
        sections.push('')
      }
    }
  }

  return sections.join('\n').trim()
}

// Create the model with the tool bound
const model = new ChatOpenAI({
  model: 'gpt-5-mini',
  useResponsesApi: true,
}).bindTools([saveTestcasesAndDmlTool], {
  parallel_tool_calls: false,
  tool_choice: 'required',
})

/**
 * Generate Test Case and DML Node - Unified generation
 * Generates both test cases and their corresponding DML operations in a single LLM call
 */
export async function generateTestcaseAndDmlNode(
  state: WorkflowState,
): Promise<{ messages: BaseMessage[] }> {
  if (!state.analyzedRequirements) {
    throw new WorkflowTerminationError(
      new Error(
        'No analyzed requirements found. Cannot generate test cases and DML.',
      ),
      'generateTestcaseAndDmlNode',
    )
  }

  // Prepare the context message
  const contextMessage = await humanPromptTemplate.format({
    schemaContext: convertSchemaToText(state.schemaData),
    analyzedRequirements: formatAnalyzedRequirements(
      state.analyzedRequirements,
    ),
  })

  // Remove reasoning field from AIMessages to avoid API issues
  const cleanedMessages = removeReasoningFromMessages(state.messages)

  // Invoke the model with tool binding
  const invokeModel = ResultAsync.fromThrowable(
    () =>
      model.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(contextMessage),
        ...cleanedMessages,
      ]),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )

  const result = await invokeModel()

  if (result.isErr()) {
    throw new WorkflowTerminationError(
      result.error,
      'generateTestcaseAndDmlNode',
    )
  }

  // The response contains tool calls
  // We'll return the messages and let the routing handle the tool invocation
  return {
    messages: [result.value],
  }
}
