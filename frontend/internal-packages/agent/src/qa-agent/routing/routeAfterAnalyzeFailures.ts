import { END } from '@langchain/langgraph'
import type { QaAgentState } from '../shared/qaAgentAnnotation'

export const routeAfterAnalyzeFailures = (
  state: QaAgentState,
): 'prepareSqlRetry' | typeof END => {
  const { failureAnalysis, analyzedRequirements } = state

  if (!failureAnalysis || failureAnalysis.failedSqlTestIds.length === 0) {
    return END
  }

  const MAX_RETRY_ATTEMPTS = 3

  for (const testId of failureAnalysis.failedSqlTestIds) {
    for (const testcases of Object.values(analyzedRequirements.testcases)) {
      const testcase = testcases.find((tc) => tc.id === testId)
      if (testcase && testcase.testResults.length >= MAX_RETRY_ATTEMPTS) {
        return END
      }
    }
  }

  return 'prepareSqlRetry'
}
