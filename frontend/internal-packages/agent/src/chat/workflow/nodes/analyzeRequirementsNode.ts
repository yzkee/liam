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
 * Execute requirements analysis with retry logic
 */
async function executeRequirementsAnalysisWithRetry(
  pmAgent: PMAgent,
  promptVariables: BasePromptVariables,
  logger: WorkflowState['logger'],
  maxRetries = 3,
): Promise<v.InferOutput<typeof requirementsAnalysisSchema>> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await pmAgent.analyzeRequirements(promptVariables)

      // Parse and validate JSON response
      const parsed = JSON.parse(response)
      return v.parse(requirementsAnalysisSchema, parsed)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        logger.warn(
          `[${NODE_NAME}] Attempt ${attempt} failed: ${lastError.message}. Retrying...`,
        )
      } else {
        logger.error(
          `[${NODE_NAME}] All ${maxRetries} attempts failed: ${lastError.message}`,
        )
      }
    }
  }

  throw new Error(
    `Failed to analyze requirements after ${maxRetries} attempts: ${lastError?.message}`,
  )
}

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

  // Execute analysis with retry logic
  const analysisResult = await executeRequirementsAnalysisWithRetry(
    pmAgent,
    promptVariables,
    state.logger,
  )

  // Log the analysis result for debugging/monitoring purposes
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
