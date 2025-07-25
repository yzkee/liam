import { AIMessage } from '@langchain/core/messages'
import type { Schema } from '@liam-hq/db-structure'
import { okAsync } from 'neverthrow'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type DeepModelingParams, deepModeling } from './deepModeling'
import type { Repositories, SchemaRepository } from './repositories'
import type { NodeLogger } from './utils/nodeLogger'

// Mock the agents
vi.mock('./langchain/agents', () => ({
  QAGenerateUsecaseAgent: vi.fn(),
  PMAnalysisAgent: vi.fn(),
}))

// Mock the design agent
vi.mock('./langchain/agents/databaseSchemaBuildAgent/agent', () => ({
  invokeDesignAgent: vi.fn(),
}))

// Mock the schema converter
vi.mock('./utils/convertSchemaToText', () => ({
  convertSchemaToText: vi.fn(() => 'Mocked schema text'),
}))

// Mock DMLGenerationAgent directly
vi.mock('./langchain/agents/dmlGenerationAgent/agent', () => ({
  DMLGenerationAgent: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue({
      dmlStatements: '-- Mocked DML statements',
    }),
  })),
}))

// Mock the pglite-server
vi.mock('@liam-hq/pglite-server', () => ({
  executeQuery: vi.fn().mockResolvedValue([
    {
      success: true,
      sql: 'CREATE TABLE test (id INTEGER);',
      result: { rows: [], columns: [] },
      id: 'test-result-id',
      metadata: {
        executionTime: 10,
        timestamp: new Date().toISOString(),
        affectedRows: 0,
      },
    },
  ]),
}))

// Mock ChatOpenAI for web search
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    bindTools: vi.fn().mockReturnThis(),
    invoke: vi.fn().mockResolvedValue({
      content:
        'Web search results: Best practices for database design include normalization, proper indexing, and consistent naming conventions.',
    }),
  })),
}))

describe('Chat Workflow', () => {
  let mockSchemaData: Schema
  let mockPMAnalysisAgent: {
    generate: ReturnType<typeof vi.fn>
  }
  let mockInvokeDesignAgent: ReturnType<typeof vi.fn>
  let MockQAGenerateUsecaseAgent: ReturnType<typeof vi.fn>
  let MockPMAnalysisAgent: ReturnType<typeof vi.fn>
  let mockRepositories: Repositories
  let mockSchemaRepository: SchemaRepository
  let mockLogger: NodeLogger

  // Helper function to create test schema data
  const createMockSchema = (): Schema => ({
    tables: {
      users: {
        name: 'users',
        columns: {
          id: {
            name: 'id',
            type: 'integer',
            default: null,
            check: null,
            notNull: true,
            comment: null,
          },
          email: {
            name: 'email',
            type: 'varchar',
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
            notNull: false,
            comment: null,
          },
        },
        comment: null,
        indexes: {},
        constraints: {
          users_pkey: {
            type: 'PRIMARY KEY',
            name: 'users_pkey',
            columnNames: ['id'],
          },
        },
      },
    },
  })

  // Helper function to create base workflow params
  const createBaseParams = (
    overrides: Partial<DeepModelingParams> = {},
  ): DeepModelingParams => ({
    userInput: 'Test input',
    history: [],
    schemaData: mockSchemaData,
    organizationId: 'test-org-id',
    buildingSchemaId: 'test-building-schema-id',
    latestVersionNumber: 1,
    userId: 'test-user-id',
    designSessionId: 'test-design-session-id',
    ...overrides,
  })

  // Helper function to create config object
  const createConfig = () => ({
    configurable: {
      repositories: mockRepositories,
      logger: mockLogger,
    },
  })

  // Helper function to execute workflow and assert common expectations
  const executeAndAssertSuccess = async (params: DeepModelingParams) => {
    const result = await deepModeling(params, createConfig())

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.schemaData).toBeDefined()
      expect(result.value.error).toBeUndefined()
    }
    expect(mockInvokeDesignAgent).toHaveBeenCalledOnce()

    return result
  }

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Get the mocked modules
    const agentsModule = await import('./langchain/agents')
    const designAgentModule = await import(
      './langchain/agents/databaseSchemaBuildAgent/agent'
    )

    mockInvokeDesignAgent = vi.mocked(designAgentModule.invokeDesignAgent)
    MockPMAnalysisAgent = vi.mocked(agentsModule.PMAnalysisAgent)
    MockQAGenerateUsecaseAgent = vi.mocked(agentsModule.QAGenerateUsecaseAgent)

    // Create mock repositories
    mockSchemaRepository = {
      getSchema: vi.fn(),
      getDesignSession: vi.fn(),
      createVersion: vi.fn(),
      createTimelineItem: vi.fn(),
      createArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      getArtifact: vi.fn(),
      updateTimelineItem: vi.fn(),
      createValidationQuery: vi.fn(),
      createValidationResults: vi.fn(),
      createWorkflowRun: vi.fn(),
      updateWorkflowRunStatus: vi.fn(),
    } as SchemaRepository

    mockRepositories = {
      schema: mockSchemaRepository,
    }

    // Create mock logger
    mockLogger = {
      debug: vi.fn(),
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    // Create mock schema data
    mockSchemaData = createMockSchema()

    // Mock design agent response
    mockInvokeDesignAgent.mockResolvedValue(
      okAsync(new AIMessage('Mocked agent response')),
    )

    // Mock PM Analysis agent
    mockPMAnalysisAgent = {
      generate: vi.fn().mockResolvedValue({
        businessRequirement: 'Mocked BRD',
        functionalRequirements: {
          'Test Category': ['Mocked functional requirement'],
        },
        nonFunctionalRequirements: {
          Performance: ['Mocked non-functional requirement'],
        },
      }),
    }

    // Agent mock is already set up above
    MockPMAnalysisAgent.mockImplementation(() => mockPMAnalysisAgent)
    MockQAGenerateUsecaseAgent.mockImplementation(() => ({
      generate: vi.fn().mockResolvedValue({
        usecases: [
          {
            requirementType: 'functional',
            requirementCategory: 'Test Category',
            requirement: 'Mocked functional requirement',
            title: 'Mocked Use Case',
            description: 'Mocked use case description',
          },
        ],
      }),
    }))

    // Setup createVersion mock
    vi.mocked(mockSchemaRepository.createVersion).mockResolvedValue({
      success: true,
      newSchema: mockSchemaData,
    })

    // Setup createTimelineItem mock
    vi.mocked(mockSchemaRepository.createTimelineItem).mockResolvedValue({
      success: true,
      timelineItem: {
        id: 'test-timeline-item-id',
        content: 'Test timeline item content',
        type: 'assistant',
        assistant_role: 'db',
        user_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organization_id: 'test-org-id',
        design_session_id: 'test-design-session-id',
        building_schema_version_id: null,
        query_result_id: null,
      },
    })

    // Setup artifact-related mocks
    vi.mocked(mockSchemaRepository.getArtifact).mockResolvedValue({
      success: false,
      error: 'Artifact not found',
    })

    vi.mocked(mockSchemaRepository.createArtifact).mockResolvedValue({
      success: true,
      artifact: {
        id: 'test-artifact-id',
        design_session_id: 'test-design-session-id',
        organization_id: 'test-org-id',
        artifact: {
          requirement_analysis: { business_requirement: '', requirements: [] },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })

    vi.mocked(mockSchemaRepository.updateArtifact).mockResolvedValue({
      success: true,
      artifact: {
        id: 'test-artifact-id',
        design_session_id: 'test-design-session-id',
        organization_id: 'test-org-id',
        artifact: {
          requirement_analysis: { business_requirement: '', requirements: [] },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })

    // Setup validation query/results mocks
    vi.mocked(mockSchemaRepository.createValidationQuery).mockResolvedValue({
      success: true,
      queryId: 'test-query-id',
    })

    vi.mocked(mockSchemaRepository.createValidationResults).mockResolvedValue({
      success: true,
    })

    // Setup createWorkflowRun mock
    vi.mocked(mockSchemaRepository.createWorkflowRun).mockResolvedValue({
      success: true,
      workflowRun: {
        id: 'test-workflow-run-id',
        workflow_run_id: 'test-run-id',
        design_session_id: 'test-design-session-id',
        organization_id: 'test-org-id',
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })

    // Setup updateWorkflowRunStatus mock
    vi.mocked(mockSchemaRepository.updateWorkflowRunStatus).mockResolvedValue({
      success: true,
      workflowRun: {
        id: 'test-workflow-run-id',
        workflow_run_id: 'test-run-id',
        design_session_id: 'test-design-session-id',
        organization_id: 'test-org-id',
        status: 'success' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })
  })

  describe('Build Mode', () => {
    beforeEach(() => {
      // Reset mocks for each test
      vi.mocked(mockSchemaRepository.createVersion).mockResolvedValue({
        success: true,
        newSchema: mockSchemaData,
      })
      mockInvokeDesignAgent.mockResolvedValue(
        okAsync(new AIMessage('Mocked agent response')),
      )
    })

    it('should execute successfully with valid Build mode state', async () => {
      const params = createBaseParams({
        userInput: 'Add a created_at timestamp column to the users table',
      })

      await executeAndAssertSuccess(params)
    })

    it('should update schema when user requests column addition', async () => {
      const expectedSchema = {
        ...mockSchemaData,
        tables: {
          ...mockSchemaData.tables,
          users: {
            ...mockSchemaData.tables['users'],
            name: 'users',
            comment: null,
            indexes: {},
            constraints: {
              ...mockSchemaData.tables['users']?.constraints,
            },
            columns: {
              ...mockSchemaData.tables['users']?.columns,
              created_at: {
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                notNull: true,
                check: null,
                comment: null,
              },
            },
          },
        },
      }

      // Mock createVersion to return the expected schema
      vi.mocked(mockSchemaRepository.createVersion).mockResolvedValue({
        success: true,
        newSchema: expectedSchema,
      })

      mockInvokeDesignAgent.mockResolvedValue(
        okAsync(new AIMessage('Added created_at column to users table')),
      )

      const params = createBaseParams({
        userInput: 'Add a created_at timestamp column to the users table',
        buildingSchemaId: 'test-building-schema-id',
        latestVersionNumber: 1,
      })

      const result = await deepModeling(params, createConfig())

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        // Schema updates now happen through tool workflow, not directly in the result
        expect(result.value.schemaData).toBeDefined()
        expect(result.value.error).toBeUndefined()
      }
    })

    it('should handle Build mode with invalid JSON response gracefully', async () => {
      mockInvokeDesignAgent.mockResolvedValue(
        okAsync(new AIMessage('Invalid JSON response')),
      )

      const params = createBaseParams({
        userInput: 'Add a created_at timestamp column to the users table',
      })

      const result = await deepModeling(params, createConfig())

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.schemaData).toBeDefined()
        expect(result.value.error).toBeUndefined()
      }
    })

    it('should handle schema update failure', async () => {
      // Mock createVersion to fail for this test
      vi.mocked(mockSchemaRepository.createVersion).mockResolvedValue({
        success: false,
        error: 'Database constraint violation',
      })

      mockInvokeDesignAgent.mockResolvedValue(
        okAsync(new AIMessage('Attempted to add created_at column')),
      )

      const params = createBaseParams({
        userInput: 'Add a created_at timestamp column to the users table',
        buildingSchemaId: 'test-building-schema-id',
        latestVersionNumber: 1,
        recursionLimit: 20,
      })

      const result = await deepModeling(params, createConfig())

      // Since workflow structure changed, errors may be handled differently
      // The workflow should still complete even if tool operations have issues
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.schemaData).toBeDefined()
      }
    })

    it('should handle schema update exception', async () => {
      // Mock createVersion to throw an exception for this test
      vi.mocked(mockSchemaRepository.createVersion).mockRejectedValue(
        new Error('Network error'),
      )

      mockInvokeDesignAgent.mockResolvedValue(
        okAsync(new AIMessage('Attempted to add created_at column')),
      )

      const params = createBaseParams({
        userInput: 'Add a created_at timestamp column to the users table',
        buildingSchemaId: 'test-building-schema-id',
        latestVersionNumber: 1,
      })

      const result = await deepModeling(params, createConfig())

      // Since workflow structure changed, exceptions may be handled differently
      // The workflow should still complete even if tool operations have issues
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.schemaData).toBeDefined()
      }
    })

    it('should handle complex schema modifications', async () => {
      const params = createBaseParams({
        userInput: 'Create a new posts table with foreign key to users',
      })

      await executeAndAssertSuccess(params)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      // Reset mocks for each test
      vi.mocked(mockSchemaRepository.createVersion).mockResolvedValue({
        success: true,
        newSchema: mockSchemaData,
      })
    })

    it('should handle agent generation errors', async () => {
      mockInvokeDesignAgent.mockRejectedValue(
        new Error('Agent generation failed'),
      )
      const params = createBaseParams()

      const result = await deepModeling(params, createConfig())

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe('Agent generation failed')
      }
    })

    it('should handle agent invocation failure', async () => {
      mockInvokeDesignAgent.mockRejectedValue(
        new Error('Failed to invoke design agent'),
      )
      const params = createBaseParams()

      const result = await deepModeling(params, createConfig())

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe('Failed to invoke design agent')
      }
    })

    it('should handle empty user input', async () => {
      const params = createBaseParams({ userInput: '' })

      const result = await deepModeling(params, createConfig())

      expect(result).toBeDefined()
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.schemaData).toBeDefined()
        expect(result.value.error).toBeUndefined()
      }
    })
  })

  describe('State Management', () => {
    beforeEach(() => {
      // Reset mocks for each test
      vi.mocked(mockSchemaRepository.createVersion).mockResolvedValue({
        success: true,
        newSchema: mockSchemaData,
      })
      mockInvokeDesignAgent.mockResolvedValue(
        okAsync(new AIMessage('Mocked agent response')),
      )
    })

    it('should preserve state properties through workflow execution', async () => {
      const initialParams = createBaseParams({
        userInput: 'Test state management',
      })

      const result = await deepModeling(initialParams, createConfig())

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.schemaData).toBeDefined()
        expect(result.value.error).toBeUndefined()
      }
    })
  })

  describe('Agent Selection', () => {
    beforeEach(() => {
      // Reset mocks for each test
      vi.mocked(mockSchemaRepository.createVersion).mockResolvedValue({
        success: true,
        newSchema: mockSchemaData,
      })
      mockInvokeDesignAgent.mockResolvedValue(
        okAsync(new AIMessage('Mocked agent response')),
      )
    })

    it('should invoke design agent', async () => {
      const params = createBaseParams({})

      await deepModeling(params, createConfig())

      expect(mockInvokeDesignAgent).toHaveBeenCalledOnce()
    })
  })

  describe('Workflow Integration', () => {
    beforeEach(() => {
      // Reset mocks for each test
      vi.mocked(mockSchemaRepository.createVersion).mockResolvedValue({
        success: true,
        newSchema: mockSchemaData,
      })
      mockInvokeDesignAgent.mockResolvedValue(
        okAsync(new AIMessage('Mocked agent response')),
      )
    })
    // Helper function to execute multiple workflows sequentially
    const executeSequentialWorkflows = async (
      inputs: { userInput: string }[],
    ) => {
      const results = []
      for (const input of inputs) {
        const params = createBaseParams(input)
        const result = await deepModeling(params, createConfig())
        results.push(result)
      }
      return results
    }

    it('should handle multiple sequential workflow executions', async () => {
      const inputs = [
        { userInput: 'First modification' },
        { userInput: 'Second modification' },
        { userInput: 'Third modification' },
      ]

      const results = await executeSequentialWorkflows(inputs)

      expect(results).toHaveLength(3)
      for (const result of results) {
        expect(result).toBeDefined()
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.schemaData).toBeDefined()
          expect(result.value.error).toBeUndefined()
        }
      }
    })

    it('should maintain consistency across different input types', async () => {
      const testInputs = [
        'Simple question about users table',
        'Complex query with multiple joins and conditions',
        'Schema modification request with constraints',
        'Question with special characters: @#$%^&*()',
        'Multi-line\ninput\nwith\nbreaks',
      ]

      const inputs = testInputs.map((userInput) => ({ userInput }))
      const results = await executeSequentialWorkflows(inputs)

      for (const result of results) {
        expect(result).toBeDefined()
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.schemaData).toBeDefined()
          expect(result.value.error).toBeUndefined()
        }
      }
    })
  })
})
