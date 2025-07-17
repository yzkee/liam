import { AIMessage } from '@langchain/core/messages'
import type { WorkflowState } from '../types'

/**
 * Format analyzed requirements into a structured string
 * Extracted from designSchemaNode for reusability
 */
const formatAnalyzedRequirements = (
  analyzedRequirements: NonNullable<WorkflowState['analyzedRequirements']>,
): string => {
  const formatRequirements = (
    requirements: Record<string, string[]>,
    title: string,
  ): string => {
    const entries = Object.entries(requirements)
    if (entries.length === 0) return ''

    return `${title}:
${entries
  .map(
    ([category, items]) =>
      `- ${category}:\n  ${items.map((item) => `  • ${item}`).join('\n')}`,
  )
  .join('\n')}`
  }

  const sections = [
    `Business Requirement:\n${analyzedRequirements.businessRequirement}`,
    formatRequirements(
      analyzedRequirements.functionalRequirements,
      'Functional Requirements',
    ),
    formatRequirements(
      analyzedRequirements.nonFunctionalRequirements,
      'Non-Functional Requirements',
    ),
  ].filter(Boolean)

  return sections.join('\n\n')
}

/**
 * Prepare user message for design schema node based on workflow state
 * Handles DDL execution failures and analyzed requirements
 */
export const prepareDesignSchemaUserMessage = (
  state: WorkflowState,
): string => {
  // DDL execution failure takes priority
  if (state.shouldRetryWithDesignSchema && state.ddlExecutionFailureReason) {
    return `The following DDL execution failed: ${state.ddlExecutionFailureReason}
Original request: ${state.userInput}
Please fix this issue by analyzing the schema and adding any missing constraints, primary keys, or other required schema elements to resolve the DDL execution error.`
  }

  // Include analyzed requirements if available
  if (state.analyzedRequirements) {
    return `Based on the following analyzed requirements:
${formatAnalyzedRequirements(state.analyzedRequirements)}
User Request: ${state.userInput}`
  }

  // Default to original user input
  return state.userInput
}

/**
 * Create a standardized AI message for requirements analysis results
 */
export const createRequirementsAnalysisMessage = (
  businessRequirement: string,
  agentName = 'PMAnalysisAgent',
): AIMessage => {
  return new AIMessage({
    content: businessRequirement,
    name: agentName,
  })
}

/**
 * Create timeline logging messages for different workflow phases
 */
export const TIMELINE_MESSAGES = {
  REQUIREMENTS_ANALYSIS: {
    START: 'Analyzing requirements...',
    ORGANIZING: 'Organizing business and functional requirements...',
    COMPLETED: 'Requirements analysis completed',
    ERROR: 'Error occurred during requirements analysis',
  },
  SCHEMA_DESIGN: {
    START: 'Designing database schema...',
    VERSION_CREATED: 'Created new schema version for updates...',
    ANALYZING_STRUCTURE: 'Analyzing table structure and relationships...',
    REDESIGNING_FOR_DDL: 'Redesigning schema to fix DDL execution errors...',
    COMPLETED: 'Schema design completed',
    ERROR: 'Schema design failed',
  },
} as const
