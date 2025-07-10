import type { RunnableConfig } from '@langchain/core/runnables'
import { DMLGenerationAgent } from '../../../langchain/agents/dmlGenerationAgent/agent'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'
import { logAssistantMessage } from '../utils/timelineLogger'

const NODE_NAME = 'prepareDmlNode'

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

  // Create DML generation agent
  const dmlAgent = new DMLGenerationAgent({ logger })

  // Format use cases for the agent
  const formattedUseCases = state.generatedUsecases
    .map((uc) => `- ${uc.title}: ${uc.description}`)
    .join('\n')

  // Generate DML statements
  const result = await dmlAgent.generate({
    schemaSQL: state.ddlStatements,
    formattedUseCases,
  })

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
