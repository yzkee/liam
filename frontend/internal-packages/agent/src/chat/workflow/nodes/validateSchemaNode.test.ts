import { executeQuery } from '@liam-hq/pglite-server'
import type { SqlResult } from '@liam-hq/pglite-server/src/types'
import { aColumn, aSchema, aTable } from '@liam-hq/schema'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Repositories } from '../../../repositories'
import { InMemoryRepository } from '../../../repositories/InMemoryRepository'
import type { WorkflowState } from '../types'
import { validateSchemaNode } from './validateSchemaNode'

vi.mock('@liam-hq/pglite-server', () => ({
  executeQuery: vi.fn(),
}))

describe('validateSchemaNode', () => {
  const createMockState = (
    overrides?: Partial<WorkflowState>,
  ): WorkflowState => {
    return {
      messages: [],
      userInput: 'test',
      schemaData: aSchema({ tables: {} }),
      buildingSchemaId: 'test-id',
      latestVersionNumber: 1,
      organizationId: 'test-org-id',
      userId: 'user-id',
      designSessionId: 'session-id',
      ...overrides,
    }
  }

  const createRepositories = (): Repositories => {
    return {
      schema: new InMemoryRepository(),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle empty statements', async () => {
    const state = createMockState({
      dmlStatements: '',
    })

    const repositories = createRepositories()
    const result = await validateSchemaNode(state, {
      configurable: { repositories, thread_id: 'test-thread' },
    })

    expect(executeQuery).not.toHaveBeenCalled()
    expect(result).toEqual(state)
  })

  it('should execute only DML when DDL is empty', async () => {
    const mockResults: SqlResult[] = [
      {
        success: true,
        sql: 'INSERT INTO users VALUES (1, "test");',
        result: { rows: [], columns: [] },
        id: 'result-1',
        metadata: {
          executionTime: 5,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    vi.mocked(executeQuery).mockResolvedValue(mockResults)

    const state = createMockState({
      generatedUsecases: [
        {
          id: 'usecase-1',
          requirementType: 'functional',
          requirementCategory: 'data_management',
          requirement: 'Insert user data',
          title: 'Insert User',
          description: 'Insert a new user record',
          dmlOperations: [
            {
              useCaseId: 'usecase-1',
              operation_type: 'INSERT',
              sql: 'INSERT INTO users VALUES (1, "test");',
              dml_execution_logs: [],
            },
          ],
        },
      ],
    })

    const repositories = createRepositories()
    const result = await validateSchemaNode(state, {
      configurable: { repositories, thread_id: 'test-thread' },
    })

    expect(executeQuery).toHaveBeenCalledWith(
      'session-id',
      expect.stringContaining('INSERT INTO users VALUES (1, "test");'),
    )
    expect(result.dmlExecutionSuccessful).toBe(true)
  })

  it('should execute only DDL when DML is empty', async () => {
    const mockResults: SqlResult[] = [
      {
        success: true,
        sql: 'CREATE TABLE users (id INT);',
        result: { rows: [], columns: [] },
        id: 'result-1',
        metadata: {
          executionTime: 10,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    vi.mocked(executeQuery).mockResolvedValue(mockResults)

    const state = createMockState({
      schemaData: aSchema({
        tables: {
          users: aTable({
            name: 'users',
            columns: {
              id: aColumn({ name: 'id', type: 'INT', notNull: true }),
            },
          }),
        },
      }),
      dmlStatements: '',
    })

    const repositories = createRepositories()
    const result = await validateSchemaNode(state, {
      configurable: { repositories, thread_id: 'test-thread' },
    })

    expect(executeQuery).toHaveBeenCalledWith(
      'session-id',
      expect.stringContaining('CREATE TABLE "users"'),
    )
    expect(result.dmlExecutionSuccessful).toBe(true)
  })

  it('should execute DDL first then DML individually', async () => {
    const ddlMockResults: SqlResult[] = [
      {
        success: true,
        sql: 'CREATE TABLE users (id INT);',
        result: { rows: [], columns: [] },
        id: 'result-1',
        metadata: {
          executionTime: 10,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    const dmlMockResults: SqlResult[] = [
      {
        success: true,
        sql: 'INSERT INTO users VALUES (1);',
        result: { rows: [], columns: [] },
        id: 'result-2',
        metadata: {
          executionTime: 5,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    vi.mocked(executeQuery)
      .mockResolvedValueOnce(ddlMockResults)
      .mockResolvedValueOnce(dmlMockResults)

    const state = createMockState({
      schemaData: aSchema({
        tables: {
          users: aTable({
            name: 'users',
            columns: {
              id: aColumn({ name: 'id', type: 'INT', notNull: true }),
            },
          }),
        },
      }),
      generatedUsecases: [
        {
          id: 'usecase-1',
          requirementType: 'functional',
          requirementCategory: 'data_management',
          requirement: 'Insert user data',
          title: 'Insert User',
          description: 'Insert a new user record',
          dmlOperations: [
            {
              useCaseId: 'usecase-1',
              operation_type: 'INSERT',
              sql: 'INSERT INTO users VALUES (1);',
              dml_execution_logs: [],
            },
          ],
        },
      ],
    })

    const repositories = createRepositories()
    const result = await validateSchemaNode(state, {
      configurable: { repositories, thread_id: 'test-thread' },
    })

    expect(executeQuery).toHaveBeenCalledTimes(2)
    // First call should be DDL only
    expect(executeQuery).toHaveBeenNthCalledWith(
      1,
      'session-id',
      expect.stringContaining('CREATE TABLE "users"'),
    )
    // Second call should include both DDL and DML combined
    expect(executeQuery).toHaveBeenNthCalledWith(
      2,
      'session-id',
      expect.stringContaining('-- DDL Statements'),
    )
    expect(executeQuery).toHaveBeenNthCalledWith(
      2,
      'session-id',
      expect.stringContaining('INSERT INTO users VALUES (1);'),
    )
    expect(result.dmlExecutionSuccessful).toBe(true)
  })

  it('should handle execution errors', async () => {
    const ddlMockResults: SqlResult[] = [
      {
        success: true,
        sql: 'CREATE TABLE users (id INT);',
        result: { rows: [], columns: [] },
        id: 'result-1',
        metadata: {
          executionTime: 10,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    const dmlMockResults: SqlResult[] = [
      {
        success: false,
        sql: 'INSERT INTO invalid_table VALUES (1);',
        result: { error: 'Table not found' },
        id: 'result-2',
        metadata: {
          executionTime: 2,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    vi.mocked(executeQuery)
      .mockResolvedValueOnce(ddlMockResults)
      .mockResolvedValueOnce(dmlMockResults)

    const state = createMockState({
      schemaData: aSchema({
        tables: {
          users: aTable({
            name: 'users',
            columns: {
              id: aColumn({ name: 'id', type: 'INT', notNull: true }),
            },
          }),
        },
      }),
      generatedUsecases: [
        {
          id: 'usecase-1',
          requirementType: 'functional',
          requirementCategory: 'data_management',
          requirement: 'Insert invalid data',
          title: 'Insert Invalid Data',
          description: 'Attempt to insert data into invalid table',
          dmlOperations: [
            {
              useCaseId: 'usecase-1',
              operation_type: 'INSERT',
              sql: 'INSERT INTO invalid_table VALUES (1);',
              dml_execution_logs: [],
            },
          ],
        },
      ],
    })

    const repositories = createRepositories()
    const result = await validateSchemaNode(state, {
      configurable: { repositories, thread_id: 'test-thread' },
    })

    expect(result.dmlExecutionSuccessful).toBeUndefined()
    expect(result.dmlExecutionErrors).toContain('SQL: UseCase:')
    expect(result.dmlExecutionErrors).toContain('Error:')
  })

  it('should trim whitespace from statements', async () => {
    const state = createMockState({
      dmlStatements: '   ',
    })

    const repositories = createRepositories()
    const result = await validateSchemaNode(state, {
      configurable: { repositories, thread_id: 'test-thread' },
    })

    expect(executeQuery).not.toHaveBeenCalled()
    expect(result).toEqual(state)
  })

  it('should generate detailed error message with usecase information', async () => {
    const ddlMockResults: SqlResult[] = [
      {
        success: true,
        sql: 'CREATE TABLE users (id INT);',
        result: { rows: [], columns: [] },
        id: 'result-1',
        metadata: {
          executionTime: 10,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    const dmlMockResults: SqlResult[] = [
      {
        success: false,
        sql: 'INSERT INTO users VALUES (1);',
        result: { error: 'column "name" does not exist' },
        id: 'result-2',
        metadata: {
          executionTime: 2,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    vi.mocked(executeQuery)
      .mockResolvedValueOnce(ddlMockResults)
      .mockResolvedValueOnce(dmlMockResults)

    const state = createMockState({
      ddlStatements: 'CREATE TABLE users (id INT);',
      generatedUsecases: [
        {
          id: 'usecase-1',
          requirementType: 'functional',
          requirementCategory: 'data_management',
          requirement: 'Insert user data',
          title: 'User Registration',
          description: 'Register new user in the system',
          dmlOperations: [
            {
              useCaseId: 'usecase-1',
              operation_type: 'INSERT',
              sql: 'INSERT INTO users VALUES (1);',
              dml_execution_logs: [],
            },
          ],
        },
      ],
    })

    const repositories = createRepositories()
    const result = await validateSchemaNode(state, {
      configurable: { repositories, thread_id: 'test-thread' },
    })

    // Verify error message contains usecase information
    expect(result.messages).toHaveLength(1)
    const message = result.messages[0]
    const expectedMessage = `Database validation found 1 issues. Please fix the following errors:

- "User Registration":
  - column "name" does not exist`
    expect(message?.content).toBe(expectedMessage)
  })

  it('should handle multiple usecase errors with detailed messages', async () => {
    const ddlMockResults: SqlResult[] = [
      {
        success: true,
        sql: 'CREATE TABLE users (id INT);',
        result: { rows: [], columns: [] },
        id: 'result-1',
        metadata: {
          executionTime: 10,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    const dmlMockResults1: SqlResult[] = [
      {
        success: false,
        sql: 'INSERT INTO users VALUES (1);',
        result: { error: 'relation "users" does not exist' },
        id: 'result-2',
        metadata: {
          executionTime: 2,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    const dmlMockResults2: SqlResult[] = [
      {
        success: false,
        sql: 'UPDATE products SET price = 100;',
        result: { error: 'relation "products" does not exist' },
        id: 'result-3',
        metadata: {
          executionTime: 2,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    vi.mocked(executeQuery)
      .mockResolvedValueOnce(ddlMockResults)
      .mockResolvedValueOnce(dmlMockResults1)
      .mockResolvedValueOnce(dmlMockResults2)

    const state = createMockState({
      ddlStatements: 'CREATE TABLE users (id INT);',
      generatedUsecases: [
        {
          id: 'usecase-1',
          requirementType: 'functional',
          requirementCategory: 'data_management',
          requirement: 'Insert user data',
          title: 'User Registration',
          description: 'Register new user',
          dmlOperations: [
            {
              useCaseId: 'usecase-1',
              operation_type: 'INSERT',
              sql: 'INSERT INTO users VALUES (1);',
              dml_execution_logs: [],
            },
          ],
        },
        {
          id: 'usecase-2',
          requirementType: 'non_functional',
          requirementCategory: 'performance',
          requirement: 'Update product prices',
          title: 'Bulk Price Update',
          description: 'Update all product prices',
          dmlOperations: [
            {
              useCaseId: 'usecase-2',
              operation_type: 'UPDATE',
              sql: 'UPDATE products SET price = 100;',
              dml_execution_logs: [],
            },
          ],
        },
      ],
    })

    const repositories = createRepositories()
    const result = await validateSchemaNode(state, {
      configurable: { repositories, thread_id: 'test-thread' },
    })

    // Verify error message contains information for both usecases
    expect(result.messages).toHaveLength(1)
    const message = result.messages[0]
    const expectedMessage = `Database validation found 2 issues. Please fix the following errors:

- "User Registration":
  - relation "users" does not exist
- "Bulk Price Update":
  - relation "products" does not exist`
    expect(message?.content).toBe(expectedMessage)
  })

  it('should execute DML operations from each usecase', async () => {
    // This test verifies that validateSchemaNode executes DML operations
    // found in each usecase's dmlOperations array

    const sqlResults: SqlResult[] = [
      {
        success: true,
        sql: 'INSERT INTO users VALUES (1, "test");',
        result: { rows: [], columns: [] },
        id: 'result-1',
        metadata: {
          executionTime: 5,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    vi.mocked(executeQuery).mockResolvedValue(sqlResults)

    const state = createMockState({
      dmlStatements: 'INSERT INTO users VALUES (1, "test");',
      generatedUsecases: [
        {
          id: 'usecase-1',
          requirementType: 'functional',
          requirementCategory: 'data_management',
          requirement: 'Insert user data',
          title: 'Insert User',
          description: 'Insert a new user record',
          dmlOperations: [
            {
              useCaseId: 'usecase-1',
              operation_type: 'INSERT',
              sql: 'INSERT INTO users VALUES (1, "test");',
              dml_execution_logs: [],
            },
          ],
        },
      ],
    })

    const repositories = createRepositories()
    const result = await validateSchemaNode(state, {
      configurable: { repositories, thread_id: 'test-thread' },
    })

    // Verify that DML operations were executed
    expect(executeQuery).toHaveBeenCalledWith(
      'session-id',
      expect.stringContaining('INSERT INTO users VALUES (1, "test");'),
    )

    // Verify execution was successful
    expect(result.dmlExecutionSuccessful).toBe(true)

    // Verify execution logs were added to the usecase's DML operations
    expect(result.generatedUsecases).toBeDefined()
    const firstUsecase = result.generatedUsecases?.[0]
    expect(firstUsecase).toBeDefined()
    expect(firstUsecase?.dmlOperations).toBeDefined()
    const firstDmlOp = firstUsecase?.dmlOperations?.[0]
    expect(firstDmlOp).toBeDefined()
    expect(firstDmlOp?.dml_execution_logs).toBeDefined()
    const executionLogs = firstDmlOp?.dml_execution_logs
    expect(executionLogs).toBeDefined()
    expect(executionLogs).toHaveLength(1)
    expect(executionLogs?.[0]?.success).toBe(true)
  })
})
