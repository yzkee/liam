import { AIMessage, HumanMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import type { Schema } from '@liam-hq/db-structure'
import { okAsync } from 'neverthrow'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkflowState } from '../../chat/workflow/types'
import type { Repositories } from '../../repositories'
import type { NodeLogger } from '../../utils/nodeLogger'
import { invokeSchemaDesignToolNode } from './invokeSchemaDesignToolNode'

describe('invokeSchemaDesignToolNode', () => {
  let mockRepositories: Repositories
  let mockState: WorkflowState
  let mockConfig: RunnableConfig
  let mockLogger: NodeLogger

  beforeEach(() => {
    vi.clearAllMocks()

    mockLogger = {
      debug: vi.fn(),
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    mockRepositories = {
      schema: {
        getSchema: vi.fn(),
        getDesignSession: vi.fn(),
        createEmptyPatchVersion: vi.fn(),
        updateVersion: vi.fn(),
        createTimelineItem: vi.fn().mockResolvedValue({ success: true }),
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

    mockState = {
      messages: [
        new HumanMessage('Add a users table with id and name columns'),
        new AIMessage('I will add a users table for you.'),
      ],
      userInput: 'Add a users table',
      schemaData: { tables: {} },
      retryCount: {},
      buildingSchemaId: 'test-building-schema-id',
      latestVersionNumber: 1,
      buildingSchemaVersionId: 'test-version-id',
      organizationId: 'test-org-id',
      userId: 'test-user-id',
      designSessionId: 'test-session-id',
    }

    mockConfig = {
      configurable: {
        repositories: mockRepositories,
        logger: mockLogger,
        buildingSchemaVersionId: 'test-version-id',
      },
    }
  })

  it('should process tool execution and return result', async () => {
    const result = await invokeSchemaDesignToolNode(mockState, mockConfig)

    // Should return a result with messages
    expect(result.messages).toBeDefined()
    expect(Array.isArray(result.messages)).toBe(true)
    // Should preserve other state properties when not errored
    if ('buildingSchemaId' in result) {
      expect(result.buildingSchemaId).toBe(mockState.buildingSchemaId)
      expect(result.designSessionId).toBe(mockState.designSessionId)
    }
  })

  it('should update schema data when tool execution is successful', async () => {
    // Mock updateVersion to return success
    vi.mocked(mockRepositories.schema.updateVersion).mockResolvedValue({
      success: true,
      newSchema: { tables: {} },
    })

    // Mock successful schema fetch after tool execution
    const updatedSchema: Schema = {
      tables: {
        users: {
          name: 'users',
          comment: null,
          columns: {
            id: {
              name: 'id',
              type: 'int',
              default: null,
              check: null,
              notNull: true,
              comment: null,
            },
            name: {
              name: 'name',
              type: 'varchar',
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
    }

    vi.mocked(mockRepositories.schema.getSchema).mockReturnValue(
      okAsync({
        id: 'test-schema-id',
        schema: updatedSchema,
        latestVersionNumber: 2,
      }),
    )

    // Add tool call message to trigger the schema design tool
    const stateWithToolCall = {
      ...mockState,
      messages: [
        ...mockState.messages,
        new AIMessage({
          content: '',
          tool_calls: [
            {
              name: 'schemaDesignTool',
              args: {
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
                          type: 'int',
                          default: null,
                          check: null,
                          notNull: true,
                          comment: null,
                        },
                        name: {
                          name: 'name',
                          type: 'varchar',
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
              },
              id: 'test-call-id',
            },
          ],
        }),
      ],
    }

    await invokeSchemaDesignToolNode(stateWithToolCall, mockConfig)

    // Verify updateVersion was called
    expect(mockRepositories.schema.updateVersion).toHaveBeenCalled()
  })
})
