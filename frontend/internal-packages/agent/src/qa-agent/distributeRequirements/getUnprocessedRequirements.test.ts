import { describe, expect, test } from 'vitest'
import type { QaAgentState } from '../shared/qaAgentAnnotation'
import { getUnprocessedRequirements } from './getUnprocessedRequirements'

// Test helper to create mock state
const createMockState = (
  testcases: Record<
    string,
    Array<{
      title: string
      type: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT'
      sql: string
      testResults: Array<{
        executedAt: string
        success: boolean
        resultSummary: string
      }>
    }>
  >,
  goal = 'Test business goal',
): QaAgentState => ({
  analyzedRequirements: {
    goal,
    testcases,
  },
  testcases: [],
  schemaData: { tables: {}, enums: {}, extensions: {} },
  messages: [],
  designSessionId: 'test-session',
  buildingSchemaId: 'test-schema',
  schemaIssues: [],
  next: 'END',
})

describe('getUnprocessedRequirements', () => {
  test('returns all testcases when no SQL is present', () => {
    const state = createMockState({
      user: [
        {
          title: 'User login functionality',
          type: 'SELECT',
          sql: '',
          testResults: [],
        },
        {
          title: 'User profile management',
          type: 'UPDATE',
          sql: '',
          testResults: [],
        },
      ],
    })

    const result = getUnprocessedRequirements(state)

    expect(result).toEqual([
      {
        category: 'user',
        testcase: {
          title: 'User login functionality',
          type: 'SELECT',
        },
        goal: 'Test business goal',
      },
      {
        category: 'user',
        testcase: {
          title: 'User profile management',
          type: 'UPDATE',
        },
        goal: 'Test business goal',
      },
    ])
  })

  test('filters out testcases with SQL', () => {
    const state = createMockState({
      user: [
        {
          title: 'User login functionality',
          type: 'SELECT',
          sql: '',
          testResults: [],
        },
        {
          title: 'User profile management',
          type: 'UPDATE',
          sql: 'UPDATE users SET name = $1 WHERE id = $2',
          testResults: [],
        },
        {
          title: 'User settings',
          type: 'SELECT',
          sql: '',
          testResults: [],
        },
      ],
    })

    const result = getUnprocessedRequirements(state)

    expect(result).toEqual([
      {
        category: 'user',
        testcase: {
          title: 'User login functionality',
          type: 'SELECT',
        },
        goal: 'Test business goal',
      },
      {
        category: 'user',
        testcase: {
          title: 'User settings',
          type: 'SELECT',
        },
        goal: 'Test business goal',
      },
    ])
  })

  test('returns empty array when all testcases have SQL', () => {
    const state = createMockState({
      user: [
        {
          title: 'User login functionality',
          type: 'SELECT',
          sql: 'SELECT * FROM users WHERE email = $1',
          testResults: [],
        },
        {
          title: 'User profile management',
          type: 'UPDATE',
          sql: 'UPDATE users SET name = $1',
          testResults: [],
        },
      ],
    })

    const result = getUnprocessedRequirements(state)

    expect(result).toEqual([])
  })

  test('handles multiple categories', () => {
    const state = createMockState({
      user: [
        {
          title: 'User functionality',
          type: 'SELECT',
          sql: '',
          testResults: [],
        },
      ],
      admin: [
        {
          title: 'Admin functionality',
          type: 'INSERT',
          sql: '',
          testResults: [],
        },
      ],
    })

    const result = getUnprocessedRequirements(state)

    expect(result).toEqual([
      {
        category: 'user',
        testcase: {
          title: 'User functionality',
          type: 'SELECT',
        },
        goal: 'Test business goal',
      },
      {
        category: 'admin',
        testcase: {
          title: 'Admin functionality',
          type: 'INSERT',
        },
        goal: 'Test business goal',
      },
    ])
  })

  test('returns empty array when no testcases exist', () => {
    const state = createMockState({})

    const result = getUnprocessedRequirements(state)

    expect(result).toEqual([])
  })
})
