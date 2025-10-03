import { describe, expect, it } from 'vitest'
import type { AnalyzedRequirements } from '../../utils/schema/analyzedRequirements'
import { formatValidationErrors } from './formatValidationErrors'

describe('formatValidationErrors', () => {
  it('should format single failed test case', () => {
    const analyzedRequirements: AnalyzedRequirements = {
      goal: 'Test goal',
      testcases: {
        users: [
          {
            id: 'test-1',
            title: 'Test Insert Operation',
            type: 'INSERT',
            sql: "INSERT INTO users (id, name) VALUES (1, 'John')",
            testResults: [
              {
                executedAt: '2024-01-01T00:00:00Z',
                success: false,
                resultSummary:
                  'Test Case "Test Insert Operation" failed: duplicate key value violates unique constraint',
              },
            ],
          },
        ],
      },
    }

    const formatted = formatValidationErrors(analyzedRequirements)

    expect(formatted).toMatchInlineSnapshot(`
      "### ❌ **Test Case:** Test Insert Operation
      Test Case "Test Insert Operation" failed: duplicate key value violates unique constraint"
    `)
  })

  it('should format multiple failed test cases', () => {
    const analyzedRequirements: AnalyzedRequirements = {
      goal: 'Test goal',
      testcases: {
        users: [
          {
            id: 'test-1',
            title: 'First Test Case',
            type: 'INSERT',
            sql: 'INSERT INTO table1 VALUES (1)',
            testResults: [
              {
                executedAt: '2024-01-01T00:00:00Z',
                success: false,
                resultSummary:
                  'Test Case "First Test Case" failed: table1 does not exist',
              },
            ],
          },
          {
            id: 'test-2',
            title: 'Second Test Case',
            type: 'SELECT',
            sql: 'SELECT * FROM table2',
            testResults: [
              {
                executedAt: '2024-01-01T00:00:00Z',
                success: true,
                resultSummary:
                  'Test Case "Second Test Case" operations completed successfully',
              },
            ],
          },
        ],
        accounts: [
          {
            id: 'test-3',
            title: 'Third Test Case',
            type: 'UPDATE',
            sql: 'UPDATE table2 SET col = 1',
            testResults: [
              {
                executedAt: '2024-01-01T00:00:00Z',
                success: false,
                resultSummary:
                  'Test Case "Third Test Case" failed: permission denied',
              },
            ],
          },
        ],
      },
    }

    const formatted = formatValidationErrors(analyzedRequirements)

    expect(formatted).toMatchInlineSnapshot(`
      "### ❌ **Test Case:** First Test Case
      Test Case "First Test Case" failed: table1 does not exist

      ### ❌ **Test Case:** Third Test Case
      Test Case "Third Test Case" failed: permission denied"
    `)
  })

  it('should return success message when no failures', () => {
    const analyzedRequirements: AnalyzedRequirements = {
      goal: 'Test goal',
      testcases: {
        users: [
          {
            id: 'test-1',
            title: 'Successful Test',
            type: 'INSERT',
            sql: 'INSERT INTO users VALUES (1)',
            testResults: [
              {
                executedAt: '2024-01-01T00:00:00Z',
                success: true,
                resultSummary:
                  'Test Case "Successful Test" operations completed successfully',
              },
            ],
          },
        ],
      },
    }

    const formatted = formatValidationErrors(analyzedRequirements)

    expect(formatted).toBe(
      'Database validation complete: all checks passed successfully',
    )
  })

  it('should return success message when no test cases', () => {
    const analyzedRequirements: AnalyzedRequirements = {
      goal: 'Test goal',
      testcases: {},
    }

    const formatted = formatValidationErrors(analyzedRequirements)

    expect(formatted).toBe(
      'Database validation complete: all checks passed successfully',
    )
  })

  it('should use latest test result when multiple results exist', () => {
    const analyzedRequirements: AnalyzedRequirements = {
      goal: 'Test goal',
      testcases: {
        users: [
          {
            id: 'test-1',
            title: 'Test with Multiple Results',
            type: 'INSERT',
            sql: 'INSERT INTO users VALUES (1)',
            testResults: [
              {
                executedAt: '2024-01-01T00:00:00Z',
                success: false,
                resultSummary: 'First execution failed',
              },
              {
                executedAt: '2024-01-01T01:00:00Z',
                success: true,
                resultSummary: 'Second execution succeeded',
              },
            ],
          },
        ],
      },
    }

    const formatted = formatValidationErrors(analyzedRequirements)

    expect(formatted).toBe(
      'Database validation complete: all checks passed successfully',
    )
  })
})
