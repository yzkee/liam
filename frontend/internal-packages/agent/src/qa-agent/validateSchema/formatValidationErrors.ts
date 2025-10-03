import type { AnalyzedRequirements } from '../../utils/schema/analyzedRequirements'

type FailedTestCase = {
  title: string
  resultSummary: string
}

export function formatValidationErrors(
  analyzedRequirements: AnalyzedRequirements,
): string {
  const failedTestCases: FailedTestCase[] = []

  for (const testcases of Object.values(analyzedRequirements.testcases)) {
    for (const testcase of testcases) {
      // Check if the latest test result failed
      const latestResult = testcase.testResults[testcase.testResults.length - 1]
      if (latestResult && !latestResult.success) {
        failedTestCases.push({
          title: testcase.title,
          resultSummary: latestResult.resultSummary,
        })
      }
    }
  }

  if (failedTestCases.length === 0) {
    return 'Database validation complete: all checks passed successfully'
  }

  const errorDetails = failedTestCases
    .map((testCase) => {
      return `### ❌ **Test Case:** ${testCase.title}\n${testCase.resultSummary}`
    })
    .join('\n\n')

  return errorDetails
}
