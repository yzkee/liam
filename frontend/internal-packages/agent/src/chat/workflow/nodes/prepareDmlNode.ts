import type { RunnableConfig } from '@langchain/core/runnables'
import { DMLGenerationAgent } from '../../../langchain/agents/dmlGenerationAgent/agent'
import type { WorkflowState } from '../types'

/**
 * Prepare DML Node - Generates DML statements based on schema and use cases
 * Performed by DMLGenerationAgent
 */
export async function prepareDmlNode(
  state: WorkflowState,
  _config: RunnableConfig,
): Promise<WorkflowState> {
  state.logger.info('Preparing DML statements')

  // Check if we have required inputs
  if (!state.ddlStatements) {
    state.logger.warn('No DDL statements available for DML generation')
    return state
  }

  if (!state.generatedUsecases || state.generatedUsecases.length === 0) {
    state.logger.warn('No use cases available for DML generation')
    return state
  }

  // Create DML generation agent
  const dmlAgent = new DMLGenerationAgent({ logger: state.logger })

  // Format use cases for the agent
  const formattedUseCases = state.generatedUsecases
    .map((uc) => `- ${uc.title}: ${uc.description}`)
    .join('\n')

  // Generate DML statements
  const result = await dmlAgent.generate({
    schemaSQL: state.ddlStatements,
    formattedUseCases,
  })

  state.logger.info('DML statements generated successfully')

  return {
    ...state,
    dmlStatements: result.dmlStatements,
  }
}