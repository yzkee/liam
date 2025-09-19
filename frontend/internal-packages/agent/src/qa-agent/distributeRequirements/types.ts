/**
 * Requirement data structure for parallel processing
 */
export type RequirementData = {
  type: 'functional' | 'non_functional'
  category: string
  requirement: string
  businessContext: string
  requirementId: string
}
