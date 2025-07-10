import { DMLGenerationAgent } from '../../../langchain/agents/dmlGenerationAgent/agent'
import { getWorkflowNodeProgress } from '../shared/getWorkflowNodeProgress'
import type { WorkflowState } from '../types'

/**
 * Prepare DML Node - Generates DML statements based on schema and use cases
 * Performed by DMLGenerationAgent
 */
export async function prepareDmlNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  // Update progress message if available
  if (state.progressTimelineItemId) {
    await state.repositories.schema.updateTimelineItem(
      state.progressTimelineItemId,
      {
        content: 'Processing: prepareDML',
        progress: getWorkflowNodeProgress('prepareDML'),
      },
    )
  }

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

  // Log input statistics
  const tableCount = (state.ddlStatements.match(/CREATE TABLE/gi) || []).length
  const useCaseCount = state.generatedUsecases.length
  state.logger.info(
    `Generating DML for ${tableCount} tables and ${useCaseCount} use cases`,
  )

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

  // Validate result
  if (!result.dmlStatements || result.dmlStatements.trim().length === 0) {
    state.logger.warn('DML generation returned empty statements')
    return state
  }

  state.logger.info('DML statements generated successfully')

  return {
    ...state,
    dmlStatements: result.dmlStatements,
  }
}
