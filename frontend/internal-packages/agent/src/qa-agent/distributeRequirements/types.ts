/**
 * Test case data structure for parallel SQL generation
 */
export type TestCaseData = {
  category: string
  testcase: {
    title: string
    type: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT'
  }
  goal: string
}
