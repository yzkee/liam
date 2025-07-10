import { executeQuery } from '@liam-hq/pglite-server'
import type { SqlResult } from '@liam-hq/pglite-server/src/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Repositories } from '../../../repositories'
import type { NodeLogger } from '../../../utils/nodeLogger'
import type { WorkflowState } from '../types'
import { validateSchemaNode } from './validateSchemaNode'

vi.mock('@liam-hq/pglite-server', () => ({
  executeQuery: vi.fn(),
}))

describe('validateSchemaNode', () => {
  const mockLogger: NodeLogger = {
    debug: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }

  const createMockState = (overrides?: Partial<WorkflowState>) => {
    const repositories: Repositories = {
      schema: {
        updateTimelineItem: vi.fn(),
        getSchema: vi.fn(),
        getDesignSession: vi.fn(),
        createVersion: vi.fn(),
        createTimelineItem: vi.fn(),
        createArtifact: vi.fn(),
        updateArtifact: vi.fn(),
        getArtifact: vi.fn(),
      },
    }

    return {
      userInput: 'test',
      formattedHistory: '',
      schemaData: { tables: {}, relationships: [] },
      buildingSchemaId: 'test-id',
      latestVersionNumber: 1,
      userId: 'user-id',
      designSessionId: 'session-id',
      retryCount: {},
      repositories,
      logger: mockLogger,
      progressTimelineItemId: 'progress-id',
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should execute DML statements successfully', async () => {
    const mockResults: SqlResult[] = [
      {
        success: true,
        sql: 'INSERT INTO users VALUES (1, "test");',
        result: { rows: [], columns: [] },
        id: 'result-1',
        metadata: {
          executionTime: 10,
          timestamp: new Date().toISOString(),
          affectedRows: 1,
        },
      },
      {
        success: true,
        sql: 'INSERT INTO posts VALUES (1, "post");',
        result: { rows: [], columns: [] },
        id: 'result-2',
        metadata: {
          executionTime: 5,
          timestamp: new Date().toISOString(),
          affectedRows: 1,
        },
      },
    ]

    vi.mocked(executeQuery).mockResolvedValue(mockResults)

    const state = createMockState({
      dmlStatements:
        'INSERT INTO users VALUES (1, "test"); INSERT INTO posts VALUES (1, "post");',
    })

    const result = await validateSchemaNode(state as WorkflowState)

    expect(executeQuery).toHaveBeenCalledWith(
      'session-id',
      'INSERT INTO users VALUES (1, "test"); INSERT INTO posts VALUES (1, "post");',
    )
    expect(result.dmlExecutionSuccessful).toBe(true)
    expect(result.dmlExecutionErrors).toBeUndefined()
    expect(mockLogger.log).toHaveBeenCalledWith(
      '[validateSchemaNode] DML executed successfully: 2 statements',
    )
    expect(mockLogger.info).toHaveBeenCalledWith(
      '[validateSchemaNode] Total rows affected: 2',
    )
  })

  it('should handle empty DML statements', async () => {
    const state = createMockState({
      dmlStatements: '',
    })

    const result = await validateSchemaNode(state as WorkflowState)

    expect(executeQuery).not.toHaveBeenCalled()
    expect(result).toEqual(state)
    expect(mockLogger.log).toHaveBeenCalledWith(
      '[validateSchemaNode] No DML statements to execute',
    )
  })

  it('should handle missing DML statements', async () => {
    const state = createMockState({
      dmlStatements: undefined,
    })

    const result = await validateSchemaNode(state as WorkflowState)

    expect(executeQuery).not.toHaveBeenCalled()
    expect(result).toEqual(state)
    expect(mockLogger.log).toHaveBeenCalledWith(
      '[validateSchemaNode] No DML statements to execute',
    )
  })

  it('should handle DML execution errors', async () => {
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

    vi.mocked(executeQuery).mockResolvedValue(mockResults)

    const state = createMockState({
      dmlStatements:
        'INSERT INTO users VALUES (1, "test"); INSERT INTO invalid_table VALUES (1);',
    })

    const result = await validateSchemaNode(state as WorkflowState)

    expect(result.dmlExecutionSuccessful).toBeUndefined()
    expect(result.dmlExecutionErrors).toContain('Table not found')
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('DML execution failed'),
    )
  })

  it('should update progress timeline item', async () => {
    const mockUpdateTimelineItem = vi.fn()
    const state = createMockState({
      dmlStatements: 'INSERT INTO users VALUES (1);',
      progressTimelineItemId: 'timeline-id',
      repositories: {
        schema: {
          updateTimelineItem: mockUpdateTimelineItem,
          getSchema: vi.fn(),
          getDesignSession: vi.fn(),
          createVersion: vi.fn(),
          createTimelineItem: vi.fn(),
          createArtifact: vi.fn(),
          updateArtifact: vi.fn(),
          getArtifact: vi.fn(),
        },
      },
    })

    vi.mocked(executeQuery).mockResolvedValue([
      {
        success: true,
        sql: 'INSERT INTO users VALUES (1);',
        result: { rows: [], columns: [] },
        id: 'result-1',
        metadata: {
          executionTime: 5,
          timestamp: new Date().toISOString(),
        },
      },
    ])

    await validateSchemaNode(state as WorkflowState)

    expect(mockUpdateTimelineItem).toHaveBeenCalledWith('timeline-id', {
      content: 'Processing: validateSchema',
      progress: expect.any(Number),
    })
  })

  it('should count DML statements correctly', async () => {
    const dmlStatements = `
      INSERT INTO users VALUES (1, 'user1');
      INSERT INTO users VALUES (2, 'user2');
      INSERT INTO posts VALUES (1, 'post1', 1);
    `
    const state = createMockState({ dmlStatements })

    vi.mocked(executeQuery).mockResolvedValue([])

    await validateSchemaNode(state as WorkflowState)

    expect(mockLogger.log).toHaveBeenCalledWith(
      '[validateSchemaNode] Executing 4 DML statements (143 characters)',
    )
  })

  it('should handle results without metadata', async () => {
    const mockResults: SqlResult[] = [
      {
        success: true,
        sql: 'INSERT INTO users VALUES (1);',
        result: { rows: [], columns: [] },
        id: 'result-1',
        metadata: {
          executionTime: 5,
          timestamp: new Date().toISOString(),
          // No affectedRows
        },
      },
      {
        success: true,
        sql: 'INSERT INTO posts VALUES (1);',
        result: { rows: [], columns: [] },
        id: 'result-2',
        metadata: {
          executionTime: 5,
          timestamp: new Date().toISOString(),
          // No affectedRows
        },
      },
    ]

    vi.mocked(executeQuery).mockResolvedValue(mockResults)

    const state = createMockState({
      dmlStatements:
        'INSERT INTO users VALUES (1); INSERT INTO posts VALUES (1);',
    })

    const result = await validateSchemaNode(state as WorkflowState)

    expect(result.dmlExecutionSuccessful).toBe(true)
    // Should not log affected rows since total is 0
    expect(mockLogger.info).not.toHaveBeenCalledWith(
      expect.stringContaining('Total rows affected'),
    )
  })
})
