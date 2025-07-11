import { executeQuery } from '@liam-hq/pglite-server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Repositories } from '../../../repositories'
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
      configurable: { repositories },
    })

    expect(executeQuery).not.toHaveBeenCalled()
    expect(result).toEqual(state)
  })
})
