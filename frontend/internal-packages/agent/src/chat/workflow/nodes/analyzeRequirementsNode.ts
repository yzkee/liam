import * as v from 'valibot'
import { PMAgent } from '../../../langchain/agents'
import type { BasePromptVariables } from '../../../langchain/utils/types'
import { convertSchemaToText } from '../../../utils/convertSchemaToText'
import type { WorkflowState } from '../types'

const NODE_NAME = 'analyzeRequirementsNode'

const requirementsAnalysisSchema = v.object({
  businessRequirement: v.string(),
  functionalRequirements: v.record(v.string(), v.array(v.string())),
  nonFunctionalRequirements: v.record(v.string(), v.array(v.string())),
})

/**
 * Analyze Requirements Node - Requirements Organization
 * Performed by pmAgent
 */
export async function analyzeRequirementsNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  state.logger.log(`[${NODE_NAME}] Started`)

  const pmAgent = new PMAgent()
  const schemaText = convertSchemaToText(state.schemaData)

  const promptVariables: BasePromptVariables = {
    schema_text: schemaText,
    chat_history: state.formattedHistory,
    user_message: state.userInput,
  }

  const response = await pmAgent.analyzeRequirements(promptVariables)

  // Parse and validate JSON response
  let analysisResult: v.InferOutput<typeof requirementsAnalysisSchema>
  try {
    const parsed = JSON.parse(response)
    analysisResult = v.parse(requirementsAnalysisSchema, parsed)
  } catch (error) {
    const errorMessage = `Failed to parse requirements analysis response: ${error instanceof Error ? error.message : String(error)}`
    state.logger.error(`[${NODE_NAME}] ${errorMessage}`)
    state.logger.error(`[${NODE_NAME}] Raw response: ${response}`)
    throw new Error(errorMessage)
  }

  // Log the analysis result for debugging/monitoring purposes
  // Currently not used elsewhere in the workflow, but useful for observability
  state.logger.log(`[${NODE_NAME}] Analysis Result:`)
  state.logger.log(`[${NODE_NAME}] BRD: ${analysisResult.businessRequirement}`)
  state.logger.log(
    `[${NODE_NAME}] Functional Requirements: ${JSON.stringify(analysisResult.functionalRequirements)}`,
  )
  state.logger.log(
    `[${NODE_NAME}] Non-Functional Requirements: ${JSON.stringify(analysisResult.nonFunctionalRequirements)}`,
  )

  state.logger.log(`[${NODE_NAME}] Completed`)

  return {
    ...state,
    analyzedRequirements: {
      businessRequirement: analysisResult.businessRequirement,
      functionalRequirements: analysisResult.functionalRequirements,
      nonFunctionalRequirements: analysisResult.nonFunctionalRequirements,
    },
  }
}
