import { err, ok, type Result } from 'neverthrow'
import { WorkflowTerminationError } from '../../utils/errorHandling'
import type { RequirementItem } from '../../utils/schema/analyzedRequirements'
import type { QaAgentState } from '../shared/qaAgentAnnotation'
import type { Testcase } from '../types'
import type { RequirementData } from './types'

/**
 * Process requirements of a specific type
 */
function processRequirementsByType(
  requirements: RequirementData[],
  requirementsData: Record<string, RequirementItem[]> | undefined,
  type: 'functional' | 'non_functional',
  businessContext: string,
): void {
  if (!requirementsData) return

  for (const [category, reqList] of Object.entries(requirementsData)) {
    if (reqList?.length > 0) {
      for (const requirementItem of reqList) {
        requirements.push({
          type,
          category,
          requirement: requirementItem.desc,
          businessContext,
          requirementId: requirementItem.id,
        })
      }
    }
  }
}

/**
 * Prepare all requirements for processing
 */
function prepareRequirements(
  state: QaAgentState,
): Result<RequirementData[], WorkflowTerminationError> {
  const { analyzedRequirements } = state
  const allRequirements: RequirementData[] = []
  const businessContext = analyzedRequirements.businessRequirement || ''

  // Process functional requirements
  processRequirementsByType(
    allRequirements,
    analyzedRequirements.functionalRequirements,
    'functional',
    businessContext,
  )

  // If no requirements found, return error
  if (allRequirements.length === 0) {
    return err(
      new WorkflowTerminationError(
        new Error('No requirements to process after distribution.'),
        'continueToRequirements',
      ),
    )
  }

  return ok(allRequirements)
}

/**
 * Filter out requirements that already have corresponding testcases
 */
function filterByExistingTestcases(
  requirements: RequirementData[],
  existingTestcases: Testcase[],
): RequirementData[] {
  if (existingTestcases.length === 0) {
    return requirements
  }

  const processedRequirementIds = new Set(
    existingTestcases.map((testcase) => testcase.requirementId),
  )

  return requirements.filter(
    (requirement) => !processedRequirementIds.has(requirement.requirementId),
  )
}

/**
 * Get unprocessed requirements by filtering out those that already have testcases
 */
export function getUnprocessedRequirements(
  state: QaAgentState,
): RequirementData[] {
  const requirementsResult = prepareRequirements(state)

  if (requirementsResult.isErr()) {
    // If prepareRequirements fails (no requirements), return empty array
    return []
  }

  return filterByExistingTestcases(requirementsResult.value, state.testcases)
}
