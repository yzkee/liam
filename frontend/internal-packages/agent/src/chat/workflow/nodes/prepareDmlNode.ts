import type { RunnableConfig } from '@langchain/core/runnables'
import { DMLGenerationAgent } from '../../../langchain/agents/dmlGenerationAgent/agent'
import type { Usecase } from '../../../langchain/agents/qaGenerateUsecaseAgent/agent'
import { convertSchemaToText } from '../../../utils/convertSchemaToText'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'
import { logAssistantMessage } from '../utils/timelineLogger'

const NODE_NAME = 'prepareDmlNode'

/**
 * Format use cases into a structured string for DML generation
 */
function formatUseCases(useCases: Usecase[]): string {
  // Group use cases by requirement category
  const groupedUseCases = useCases.reduce<Record<string, Usecase[]>>(
    (acc, uc) => {
      const category = uc.requirementCategory?.trim() || 'General'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(uc)
      return acc
    },
    {},
  )

  // Format grouped use cases
  const formattedGroups = Object.entries(groupedUseCases).map(
    ([category, cases]) => {
      const formattedCases = cases
        .map(
          (uc) =>
            `  - ${uc.title}: ${uc.description}${
              uc.requirement ? ` (Requirement: ${uc.requirement})` : ''
            }`,
        )
        .join('\n')
      return `${category}:\n${formattedCases}`
    },
  )

  return formattedGroups.join('\n\n')
}

/**
 * Prepare DML Node - Generates DML statements based on schema and use cases
 * Performed by DMLGenerationAgent
 */
export async function prepareDmlNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const configurableResult = getConfigurable(config)
  if (configurableResult.isErr()) {
    return {
      ...state,
      error: configurableResult.error,
    }
  }
  const { repositories, logger } = configurableResult.value

  logger.log(`[${NODE_NAME}] Started`)

  await logAssistantMessage(state, repositories, 'Preparing DML statements...')

  // Check if we have required inputs
  if (!state.ddlStatements) {
    logger.warn(`[${NODE_NAME}] No DDL statements available for DML generation`)
    await logAssistantMessage(
      state,
      repositories,
      'Missing DDL statements for DML generation',
    )
    logger.log(`[${NODE_NAME}] Completed`)
    return state
  }

  if (!state.generatedUsecases || state.generatedUsecases.length === 0) {
    logger.warn(`[${NODE_NAME}] No use cases available for DML generation`)
    await logAssistantMessage(
      state,
      repositories,
      'Missing use cases for DML generation',
    )
    logger.log(`[${NODE_NAME}] Completed`)
    return state
  }

  // Log input statistics
  const tableCount = (state.ddlStatements.match(/CREATE TABLE/gi) || []).length
  const useCaseCount = state.generatedUsecases.length
  logger.info(
    `[${NODE_NAME}] Generating DML for ${tableCount} tables and ${useCaseCount} use cases`,
  )

  // Create DML generation agent
  const dmlAgent = new DMLGenerationAgent({ logger })

  // Format use cases for the agent
  const formattedUseCases = formatUseCases(state.generatedUsecases)

  // Convert schema to text for additional context
  const schemaContext = convertSchemaToText(state.schemaData)

  // Generate DML statements
  const result = await dmlAgent.generate({
    schemaSQL: state.ddlStatements,
    formattedUseCases,
    schemaContext,
  })

  // Validate result
  if (!result.dmlStatements || result.dmlStatements.trim().length === 0) {
    logger.warn(`[${NODE_NAME}] DML generation returned empty statements`)
    await logAssistantMessage(
      state,
      repositories,
      'DML generation returned empty statements',
    )
    logger.log(`[${NODE_NAME}] Completed`)
    return state
  }

  logger.log(`[${NODE_NAME}] DML statements generated successfully`)

  await logAssistantMessage(
    state,
    repositories,
    'DML statements generated successfully',
  )

  logger.log(`[${NODE_NAME}] Completed`)

  return {
    ...state,
    dmlStatements: result.dmlStatements,
  }
}
