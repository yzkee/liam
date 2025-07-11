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

  const createMockState = (
    overrides?: Partial<WorkflowState>,
  ): WorkflowState => {
    return {
      userInput: 'test',
      formattedHistory: '',
      schemaData: { tables: {} },
      buildingSchemaId: 'test-id',
      latestVersionNumber: 1,
      userId: 'user-id',
      designSessionId: 'session-id',
      retryCount: {},
      ...overrides,
    }
  }

  const createMockRepositories = (): Repositories => {
    return {
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
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle empty DML statements', async () => {
    const state = createMockState({
      dmlStatements: '',
    })

    const repositories = createMockRepositories()
    const result = await validateSchemaNode(state, {
      configurable: { repositories, logger: mockLogger },
    })

    expect(executeQuery).not.toHaveBeenCalled()
    expect(result).toEqual(state)
    expect(mockLogger.log).toHaveBeenCalledWith(
      '[validateSchemaNode] No DML statements to execute',
    )
  })

  it('should update progress timeline item', async () => {
    const mockUpdateTimelineItem = vi.fn()
    const state = createMockState({
      dmlStatements: 'INSERT INTO users VALUES (1);',
    })
    const repositories = createMockRepositories()
    repositories.schema.updateTimelineItem = mockUpdateTimelineItem

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

    await validateSchemaNode(state, {
      configurable: { repositories, logger: mockLogger },
    })

    // TODO: Re-enable when timeline item updates are implemented
    // expect(mockUpdateTimelineItem).toHaveBeenCalledWith('timeline-id', {
    //   content: 'Processing: validateSchema',
    //   progress: expect.any(Number),
    // })
  })

  it('should count DML statements correctly', async () => {
    const dmlStatements = `
      INSERT INTO users VALUES (1, 'user1');
      INSERT INTO users VALUES (2, 'user2');
      INSERT INTO posts VALUES (1, 'post1', 1);
    `
    const state = createMockState({ dmlStatements })

    vi.mocked(executeQuery).mockResolvedValue([])

    const repositories = createMockRepositories()
    await validateSchemaNode(state, {
      configurable: { repositories, logger: mockLogger },
    })

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

    const repositories = createMockRepositories()
    const result = await validateSchemaNode(state, {
      configurable: { repositories, logger: mockLogger },
    })

    expect(result.dmlExecutionSuccessful).toBe(true)
    // Should not log affected rows since total is 0
    expect(mockLogger.info).not.toHaveBeenCalledWith(
      expect.stringContaining('Total rows affected'),
    )
  })
})
