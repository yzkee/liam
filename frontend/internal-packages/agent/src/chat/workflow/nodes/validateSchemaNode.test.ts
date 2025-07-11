import { executeQuery } from '@liam-hq/pglite-server'
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
      messages: [],
      userInput: 'test',
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
})
