import type { RunnableConfig } from '@langchain/core/runnables'
import { aColumn, aSchema, aTable } from '@liam-hq/db-structure'
import { describe, expect, it, vi } from 'vitest'
import type { Repositories } from '../../repositories'
import { TestSchemaRepository } from '../../test-helpers/TestSchemaRepository'
import { schemaDesignTool } from './schemaDesignTool'

describe('schemaDesignTool', () => {
  const createMockConfig = (
    buildingSchemaVersionId: string,
    testRepositories: Repositories,
  ): RunnableConfig => ({
    configurable: {
      buildingSchemaVersionId,
      repositories: testRepositories,
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
    const repositories: Repositories = {
      schema: new TestSchemaRepository({
        schemas: {
          'test-schema': aSchema(),
        },
      }),
    }

    const versionResult = await repositories.schema.createEmptyPatchVersion({
      buildingSchemaId: 'test-schema',
      latestVersionNumber: 1,
    })

    expect(versionResult.success).toBe(true)
    if (!versionResult.success) return

    const config = createMockConfig(versionResult.versionId, repositories)
    const input = {
      operations: [
        {
          op: 'add',
          path: '/tables/users',
          value: aTable({
            name: 'users',
            columns: {
              id: aColumn({
                name: 'id',
                type: 'integer',
                notNull: true,
              }),
              name: aColumn({
                name: 'name',
                type: 'varchar(255)',
                notNull: false,
              }),
            },
          }),
        },
      ],
    }

    const result = await schemaDesignTool.invoke(input, config)

    expect(result).toBe(
      'Schema successfully updated. The operations have been applied to the database schema.',
    )

    // Verify the schema was actually updated in the repository by schemaDesignTool
    const versionData = await repositories.schema.getVersion(
      versionResult.versionId,
    )
    const version = versionData.unwrapOr(null)

    expect(version).toEqual({
      id: versionResult.versionId,
      versionNumber: 2,
      schema: aSchema({
        tables: {
          users: aTable({
            name: 'users',
            columns: {
              id: aColumn({
                name: 'id',
                type: 'integer',
                notNull: true,
              }),
              name: aColumn({
                name: 'name',
                type: 'varchar(255)',
                notNull: false,
              }),
            },
          }),
        },
      }),
    })
  })

  it('should throw error when update fails', async () => {
    const repositories: Repositories = {
      schema: new TestSchemaRepository(),
    }

    const config = createMockConfig('non-existent-version-id', repositories)
    const input = {
      operations: [
        {
          op: 'add',
          path: '/tables/users',
          value: aTable({
            name: 'users',
            columns: {
              id: aColumn({
                name: 'id',
                type: 'integer',
                notNull: true,
              }),
            },
          }),
        },
      ],
    }

    await expect(schemaDesignTool.invoke(input, config)).rejects.toThrow(
      'Schema update failed: Version not found. Please fix the error and try again.',
    )
  })

  it('should handle malformed input', async () => {
    const repositories: Repositories = {
      schema: new TestSchemaRepository(),
    }

    const config = createMockConfig('test-version-id', repositories)
    const input = {
      operations: 'invalid-operations', // Should be an array
    }

    // LangChain validates schema before our tool function is called
    await expect(schemaDesignTool.invoke(input, config)).rejects.toThrow(
      'Received tool input did not match expected schema',
    )
  })

  it('should handle empty operations array', async () => {
    const initialSchema = aSchema({ tables: {} })
    const repositories: Repositories = {
      schema: new TestSchemaRepository({
        schemas: {
          'test-schema': initialSchema,
        },
      }),
    }
    const versionResult = await repositories.schema.createEmptyPatchVersion({
      buildingSchemaId: 'test-schema',
      latestVersionNumber: 1,
    })

    expect(versionResult.success).toBe(true)
    if (!versionResult.success) return

    const config = createMockConfig(versionResult.versionId, repositories) // Pass repositories to config
    const input = {
      operations: [],
    }

    const result = await schemaDesignTool.invoke(input, config)

    expect(result).toBe(
      'Schema successfully updated. The operations have been applied to the database schema.',
    )
  })
})
