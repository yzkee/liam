import { describe, expect, it } from 'vitest'
import type { AnalyzedRequirements } from '../../utils/schema/analyzedRequirements'
import { convertRequirementsToPrompt } from './convertAnalyzedRequirementsToPrompt'

describe('convertAnalyzedRequirementsToPrompt', () => {
  const sampleAnalyzedRequirements: AnalyzedRequirements = {
    goal: 'Build a user management system',
    testcases: {
      authentication: [
        {
          id: '1',
          title: 'User login',
          type: 'SELECT',
          sql: '',
          testResults: [],
        },
        {
          id: '2',
          title: 'User logout',
          type: 'UPDATE',
          sql: '',
          testResults: [],
        },
        {
          id: '3',
          title: 'Password reset',
          type: 'UPDATE',
          sql: '',
          testResults: [],
        },
      ],
      userManagement: [
        {
          id: '4',
          title: 'Create new user',
          type: 'INSERT',
          sql: '',
          testResults: [],
        },
        {
          id: '5',
          title: 'Update user info',
          type: 'UPDATE',
          sql: '',
          testResults: [],
        },
        {
          id: '6',
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
            id: '1',
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

  it('should filter testcases when schemaIssues are provided', () => {
    const schemaIssues = [
      { testcaseId: '1', description: 'Missing users table' },
      { testcaseId: '4', description: 'Missing email column' },
    ]

    const result = convertRequirementsToPrompt(
      sampleAnalyzedRequirements,
      schemaIssues,
    )

    expect(result).toMatchInlineSnapshot(`
      "Session Goal: Build a user management system

      Test Cases:
      - authentication: User login (SELECT)
      - userManagement: Create new user (INSERT)"
    `)
  })

  it('should handle schemaIssues with no matching testcases', () => {
    const schemaIssues = [
      { testcaseId: 'non-existent-id', description: 'Some issue' },
    ]

    const result = convertRequirementsToPrompt(
      sampleAnalyzedRequirements,
      schemaIssues,
    )

    expect(result).toMatchInlineSnapshot(`
      "Session Goal: Build a user management system

      Test Cases:"
    `)
  })

  it('should handle empty schemaIssues array', () => {
    const result = convertRequirementsToPrompt(sampleAnalyzedRequirements, [])

    expect(result).toMatchInlineSnapshot(`
      "Session Goal: Build a user management system

      Test Cases:
      - authentication: User login (SELECT), User logout (UPDATE), Password reset (UPDATE)
      - userManagement: Create new user (INSERT), Update user info (UPDATE), Delete user (DELETE)"
    `)
  })
})
