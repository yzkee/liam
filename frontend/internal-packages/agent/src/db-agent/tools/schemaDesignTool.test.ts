import type { RunnableConfig } from '@langchain/core/runnables'
import { describe, expect, it, vi } from 'vitest'
import type { Repositories } from '../../repositories'
import { schemaDesignTool } from './schemaDesignTool'

describe('schemaDesignTool', () => {
  const mockRepositories: Repositories = {
    schema: {
      getSchema: vi.fn(),
      getDesignSession: vi.fn(),
      createVersion: vi.fn(),
      createTimelineItem: vi.fn(),
      updateTimelineItem: vi.fn(),
      createArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      getArtifact: vi.fn(),
      createValidationQuery: vi.fn(),
      createValidationResults: vi.fn(),
      createWorkflowRun: vi.fn(),
      updateWorkflowRunStatus: vi.fn(),
    },
  }

  const createMockConfig = (
    buildingSchemaId: string,
    latestVersionNumber: number,
    repositories: Repositories = mockRepositories,
  ): RunnableConfig => ({
    configurable: {
      buildingSchemaId,
      latestVersionNumber,
      repositories,
      logger: {
        log: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    },
  })

  it('should successfully update schema version', async () => {
    const mockCreateVersion = vi.fn().mockResolvedValue({
      success: true,
      newSchema: { tables: [], relations: [] },
    })
    mockRepositories.schema.createVersion = mockCreateVersion

    const config = createMockConfig('test-version-id', 1)
    const input = {
      operations: [
        {
          op: 'add',
          path: '/tables/users',
          value: {
            name: 'users',
            comment: null,
            columns: {
              id: {
                name: 'id',
                type: 'integer',
                default: null,
                check: null,
                notNull: true,
                comment: null,
              },
              name: {
                name: 'name',
                type: 'varchar(255)',
                default: null,
                check: null,
                notNull: false,
                comment: null,
              },
            },
            indexes: {},
            constraints: {},
          },
        },
      ],
    }

    const result = await schemaDesignTool.invoke(input, config)

    expect(result).toBe(
      'Schema successfully updated. The operations have been applied to the database schema.',
    )
    expect(mockCreateVersion).toHaveBeenCalledWith({
      buildingSchemaId: 'test-version-id',
      latestVersionNumber: 1,
      patch: input.operations,
    })
  })

  it('should throw error when update fails', async () => {
    const mockCreateVersion = vi.fn().mockResolvedValue({
      success: false,
      error: 'Database connection failed',
    })
    mockRepositories.schema.createVersion = mockCreateVersion

    const config = createMockConfig('test-version-id', 1)
    const input = {
      operations: [
        {
          op: 'add',
          path: '/tables/users',
          value: {
            name: 'users',
            comment: null,
            columns: {
              id: {
                name: 'id',
                type: 'integer',
                default: null,
                check: null,
                notNull: true,
                comment: null,
              },
            },
            indexes: {},
            constraints: {},
          },
        },
      ],
    }

    await expect(schemaDesignTool.invoke(input, config)).rejects.toThrow(
      'Schema update failed: Database connection failed. Please fix the error and try again.',
    )
  })

  it('should throw unknown error when update fails without error message', async () => {
    const mockCreateVersion = vi.fn().mockResolvedValue({
      success: false,
      error: null,
    })
    mockRepositories.schema.createVersion = mockCreateVersion

    const config = createMockConfig('test-version-id', 1)
    const input = {
      operations: [
        {
          op: 'add',
          path: '/tables/users',
          value: {
            name: 'users',
            comment: null,
            columns: {
              id: {
                name: 'id',
                type: 'integer',
                default: null,
                check: null,
                notNull: true,
                comment: null,
              },
            },
            indexes: {},
            constraints: {},
          },
        },
      ],
    }

    await expect(schemaDesignTool.invoke(input, config)).rejects.toThrow(
      'Schema update failed: Unknown error occurred. Please fix the error and try again.',
    )
  })

  it('should handle missing configurable object', async () => {
    const config: RunnableConfig = {}
    const input = {
      operations: [],
    }

    const result = await schemaDesignTool.invoke(input, config)

    expect(result).toBe(
      'Configuration error: Missing configurable object in RunnableConfig. Please check the tool configuration and try again.',
    )
  })

  it('should handle invalid configurable object', async () => {
    const config: RunnableConfig = {
      configurable: {
        // Missing required fields
      },
    }
    const input = {
      operations: [],
    }

    const result = await schemaDesignTool.invoke(input, config)

    expect(result).toContain('Missing repositories in configurable object')
  })

  it('should handle malformed input', async () => {
    const config = createMockConfig('test-version-id', 1)
    const input = {
      operations: 'invalid-operations', // Should be an array
    }

    // LangChain validates schema before our tool function is called
    await expect(schemaDesignTool.invoke(input, config)).rejects.toThrow(
      'Received tool input did not match expected schema',
    )
  })

  it('should handle empty operations array', async () => {
    const mockCreateVersion = vi.fn().mockResolvedValue({
      success: true,
      newSchema: { tables: [], relations: [] },
    })
    mockRepositories.schema.createVersion = mockCreateVersion

    const config = createMockConfig('test-version-id', 1)
    const input = {
      operations: [],
    }

    const result = await schemaDesignTool.invoke(input, config)

    expect(result).toBe(
      'Schema successfully updated. The operations have been applied to the database schema.',
    )
    expect(mockCreateVersion).toHaveBeenCalledWith({
      buildingSchemaId: 'test-version-id',
      latestVersionNumber: 1,
      patch: [],
    })
  })
})
