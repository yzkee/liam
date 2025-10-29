import type { QaAgentState } from '../shared/qaAgentAnnotation'

/**
 * Prepares SQL tests for retry by clearing their SQL field
 * This allows the testcaseGeneration subgraph to regenerate SQL with failure feedback
 * @param state - QA agent state containing failure analysis
 * @returns Updated state with cleared SQL for failed tests
 */
export const prepareSqlRetryNode = (state: QaAgentState) => {
  const { failureAnalysis, analyzedRequirements } = state

  if (!failureAnalysis || failureAnalysis.failedSqlTestIds.length === 0) {
    return {}
  }

  const updatedTestcases = { ...analyzedRequirements.testcases }

  for (const [category, testcases] of Object.entries(updatedTestcases)) {
    updatedTestcases[category] = testcases.map((testcase) => {
      if (failureAnalysis.failedSqlTestIds.includes(testcase.id)) {
        return {
          ...testcase,
          sql: '',
        }
      }
      return testcase
    })
  }

  return {
    analyzedRequirements: {
      ...analyzedRequirements,
      testcases: updatedTestcases,
    },
  }
}
