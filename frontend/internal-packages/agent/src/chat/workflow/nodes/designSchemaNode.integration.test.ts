import { AIMessage } from '@langchain/core/messages'
import type { Schema } from '@liam-hq/db-structure'
import { ok } from 'neverthrow'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkflowState } from '../types'
import { designSchemaNode } from './designSchemaNode'
import { executeDdlNode } from './executeDdlNode'

// Mock the design agent
vi.mock('../../../langchain/agents/databaseSchemaBuildAgent/agent', () => ({
  invokeDesignAgent: vi.fn(),
}))

// Mock executeQuery for DDL execution
vi.mock('@liam-hq/pglite-server', () => ({
  executeQuery: vi.fn(),
}))

describe('designSchemaNode -> executeDdlNode integration', () => {
  const mockLogger = {
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }

  const mockRepository = {
    schema: {
      updateVersion: vi.fn(),
      createEmptyPatchVersion: vi.fn(),
      createTimelineItem: vi.fn(),
      getSchema: vi.fn(),
      getDesignSession: vi.fn(),
      updateTimelineItem: vi.fn(),
      createArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      getArtifact: vi.fn(),
      createValidationQuery: vi.fn().mockResolvedValue({
        success: true,
        queryId: 'mock-query-id',
      }),
      createValidationResults: vi.fn().mockResolvedValue({
        success: true,
      }),
    },
  }

  const createMockState = (schemaData: Schema): WorkflowState => ({
    userInput: 'Add a users table with id and name fields',
    schemaData,
    messages: [],
    retryCount: {},
    buildingSchemaId: 'test-schema',
    latestVersionNumber: 1,
    userId: 'test-user',
    designSessionId: 'test-session',
    ddlStatements: '',
  })

  const createMockConfig = () => ({
    configurable: {
      repositories: mockRepository,
      logger: mockLogger,
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default successful timeline item creation
    mockRepository.schema.createTimelineItem.mockResolvedValue({
      success: true,
      timelineItem: { id: 'test-timeline-id' } as const,
    })
    // Setup default successful version creation
    mockRepository.schema.createEmptyPatchVersion.mockResolvedValue({
      success: true,
      versionId: 'test-version-id',
    })
    // Setup default successful version update
    mockRepository.schema.updateVersion.mockResolvedValue({
      success: true,
      newSchema: {
        tables: {
          users: {
            name: 'users',
            comment: null,
            columns: {
              id: {
                name: 'id',
                type: 'INTEGER',
                default: null,
                check: null,
                notNull: true,
                comment: null,
              },
              name: {
                name: 'name',
                type: 'VARCHAR',
                default: null,
                check: null,
                notNull: true,
                comment: null,
              },
            },
            constraints: {},
            indexes: {},
          },
        },
      },
    })
  })

  it('should update schemaData and execute DDL in executeDdlNode', async () => {
    // Mock empty initial schema
    const initialSchema: Schema = { tables: {} }

    // Mock AI agent response with schema changes
    const { invokeDesignAgent } = await import(
      '../../../langchain/agents/databaseSchemaBuildAgent/agent'
    )
    const mockInvokeDesignAgent = vi.mocked(invokeDesignAgent)
    mockInvokeDesignAgent.mockResolvedValue(
      ok({
        message: new AIMessage('Created users table with id and name fields'),
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
                  type: 'INTEGER',
                  default: null,
                  check: null,
                  notNull: true,
                  comment: null,
                },
                name: {
                  name: 'name',
                  type: 'VARCHAR',
                  default: null,
                  check: null,
                  notNull: true,
                  comment: null,
                },
              },
              constraints: {},
              indexes: {},
            },
          },
        ],
      }),
    )

    const initialState = createMockState(initialSchema)

    // Step 1: Design schema (should add users table)
    const afterDesign = await designSchemaNode(initialState, createMockConfig())

    // Verify schema was updated in workflow state
    expect(afterDesign.schemaData.tables['users']).toBeDefined()
    expect(afterDesign.schemaData.tables['users']?.name).toBe('users')
    expect(Object.keys(afterDesign.schemaData.tables)).toHaveLength(1)
    expect(afterDesign.error).toBeUndefined()

    // Mock successful DDL execution
    const { executeQuery } = await import('@liam-hq/pglite-server')
    vi.mocked(executeQuery).mockResolvedValue([
      {
        success: true,
        sql: 'CREATE TABLE "users"...',
        result: {},
        id: 'test-result-id',
        metadata: {
          executionTime: 10,
          timestamp: new Date().toISOString(),
          affectedRows: 0,
        },
      },
    ])

    // Step 2: Execute DDL (should generate DDL and execute it)
    const afterDDL = await executeDdlNode(afterDesign, createMockConfig())

    // Verify DDL generation and execution worked
    expect(afterDDL.ddlStatements).toContain('CREATE TABLE "users"')
    expect(afterDDL.ddlStatements).toContain('"id" INTEGER NOT NULL')
    expect(afterDDL.ddlStatements).toContain('"name" VARCHAR NOT NULL')
    expect(executeQuery).toHaveBeenCalledWith(
      'test-session',
      expect.stringContaining('CREATE TABLE "users"'),
    )
  })

  it('should handle schema validation errors gracefully', async () => {
    const initialSchema: Schema = { tables: {} }

    // Mock AI agent response with changes
    const { invokeDesignAgent } = await import(
      '../../../langchain/agents/databaseSchemaBuildAgent/agent'
    )
    const mockInvokeDesignAgent = vi.mocked(invokeDesignAgent)
    mockInvokeDesignAgent.mockResolvedValue(
      ok({
        message: new AIMessage('Schema validation will fail'),
        operations: [
          {
            op: 'add',
            path: '/tables/test',
            value: {
              name: 'test',
              comment: null,
              columns: {},
              constraints: {},
              indexes: {},
            },
          },
        ],
      }),
    )

    // Mock repository operation that returns validation error
    mockRepository.schema.updateVersion.mockResolvedValue({
      success: false,
      error: 'Invalid schema after applying changes: validation failed',
    })

    const initialState = createMockState(initialSchema)

    // Step 1: Design schema (should fail during validation)
    const result = await designSchemaNode(initialState, createMockConfig())

    // Verify error handling
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe(
      'Invalid schema after applying changes: validation failed',
    )
    expect(result.schemaData).toEqual(initialSchema)
  })

  it('should handle repository errors gracefully', async () => {
    const initialSchema: Schema = { tables: {} }

    // Mock AI agent response
    const { invokeDesignAgent } = await import(
      '../../../langchain/agents/databaseSchemaBuildAgent/agent'
    )
    const mockInvokeDesignAgent = vi.mocked(invokeDesignAgent)
    mockInvokeDesignAgent.mockResolvedValue(
      ok({
        message: new AIMessage('Repository will fail'),
        operations: [
          {
            op: 'add',
            path: '/tables/test',
            value: {
              name: 'test',
              comment: null,
              columns: {},
              constraints: {},
              indexes: {},
            },
          },
        ],
      }),
    )

    // Mock repository failure
    mockRepository.schema.updateVersion.mockResolvedValue({
      success: false,
      error: 'Database connection failed',
    })

    const initialState = createMockState(initialSchema)

    // Step 1: Design schema (should fail at repository level)
    const result = await designSchemaNode(initialState, createMockConfig())

    // Verify error handling
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe('Database connection failed')
    expect(result.schemaData).toEqual(initialSchema)
  })
})
