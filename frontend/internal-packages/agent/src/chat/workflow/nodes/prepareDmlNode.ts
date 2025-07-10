import { DMLGenerationAgent } from '../../../langchain/agents/dmlGenerationAgent/agent'
import type { Usecase } from '../../../langchain/agents/qaGenerateUsecaseAgent/agent'
import { getWorkflowNodeProgress } from '../shared/getWorkflowNodeProgress'
import type { WorkflowState } from '../types'

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
  const formattedUseCases = formatUseCases(state.generatedUsecases)

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
