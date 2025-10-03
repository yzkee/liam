import { describe, expect, it } from 'vitest'
import type { AnalyzedRequirements } from '../../utils/schema/analyzedRequirements'
import { convertRequirementsToPrompt } from './convertAnalyzedRequirementsToPrompt'

describe('convertAnalyzedRequirementsToPrompt', () => {
  const sampleAnalyzedRequirements: AnalyzedRequirements = {
    goal: 'Build a user management system',
    testcases: {
      authentication: [
        {
          title: 'User login',
          type: 'SELECT',
          sql: '',
          testResults: [],
        },
        {
          title: 'User logout',
          type: 'UPDATE',
          sql: '',
          testResults: [],
        },
        {
          title: 'Password reset',
          type: 'UPDATE',
          sql: '',
          testResults: [],
        },
      ],
      userManagement: [
        {
          title: 'Create new user',
          type: 'INSERT',
          sql: '',
          testResults: [],
        },
        {
          title: 'Update user info',
          type: 'UPDATE',
          sql: '',
          testResults: [],
        },
        {
          title: 'Delete user',
          type: 'DELETE',
          sql: '',
          testResults: [],
        },
      ],
    },
  }

  it('should convert analyzed requirements to formatted text prompt', () => {
    const result = convertRequirementsToPrompt(sampleAnalyzedRequirements)

    expect(result).toMatchInlineSnapshot(`
      "Session Goal: Build a user management system

      Test Cases:
      - authentication: User login (SELECT), User logout (UPDATE), Password reset (UPDATE)
      - userManagement: Create new user (INSERT), Update user info (UPDATE), Delete user (DELETE)"
    `)
  })

  it('should handle empty testcases objects', () => {
    const analyzedRequirements: AnalyzedRequirements = {
      goal: 'Simple system',
      testcases: {},
    }

    const result = convertRequirementsToPrompt(analyzedRequirements)

    expect(result).toMatchInlineSnapshot(`
      "Session Goal: Simple system

      Test Cases:"
    `)
  })

  it('should handle empty goal', () => {
    const analyzedRequirements: AnalyzedRequirements = {
      goal: '',
      testcases: {
        basic: [
          {
            title: 'Basic feature test',
            type: 'INSERT',
            sql: '',
            testResults: [],
          },
        ],
      },
    }

    const result = convertRequirementsToPrompt(analyzedRequirements)

    expect(result).toMatchInlineSnapshot(`
      "Session Goal:

      Test Cases:
      - basic: Basic feature test (INSERT)"
    `)
  })
})
