import type { Schema } from '@liam-hq/db-structure'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeepModelingParams } from './deepModeling'
import { deepModeling } from './deepModeling'
import type { Repositories, SchemaRepository } from './repositories'
import type { NodeLogger } from './utils/nodeLogger'

// Mock the agents
vi.mock('./langchain/agents', () => ({
  DatabaseSchemaBuildAgent: vi.fn(),
  QAGenerateUsecaseAgent: vi.fn(),
  PMAnalysisAgent: vi.fn(),
}))

// Mock the schema converter
vi.mock('./utils/convertSchemaToText', () => ({
  convertSchemaToText: vi.fn(() => 'Mocked schema text'),
}))

// Mock the pglite-server
vi.mock('@liam-hq/pglite-server', () => ({
  executeQuery: vi.fn().mockResolvedValue([
    {
      success: true,
      sql: 'CREATE TABLE test (id INTEGER);',
      result: { rows: [], columns: [] },
    },
  ]),
}))

describe('Deep Modeling', () => {
  let mockSchemaData: Schema
  let mockAgent: {
    generate: ReturnType<typeof vi.fn>
  }
  let mockPMAnalysisAgent: {
    analyzeRequirements: ReturnType<typeof vi.fn>
  }
  let MockDatabaseSchemaBuildAgent: ReturnType<typeof vi.fn>
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
            columnName: 'id',
          },
        },
      },
    },
  })

  // Helper function to create base DeepModeling params
  const createBaseParams = (
    overrides: Partial<DeepModelingParams> = {},
  ): DeepModelingParams => ({
    message: 'Test input',
    schemaData: mockSchemaData,
    history: [],
    organizationId: 'test-org-id',
    buildingSchemaId: 'test-building-schema-id',
    latestVersionNumber: 1,
    repositories: mockRepositories,
    designSessionId: 'test-design-session-id',
    userId: 'test-user-id',
    ...overrides,
  })

  // Helper function to execute Deep Modeling and assert common expectations
  const executeAndAssertSuccess = async (params: DeepModelingParams) => {
    const result = await deepModeling(params, mockLogger)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.text).toBe('Mocked agent response')
    }
    expect(mockAgent.generate).toHaveBeenCalledOnce()

    return result
  }

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Get the mocked modules
    const agentsModule = await import('./langchain/agents')

    MockDatabaseSchemaBuildAgent = vi.mocked(
      agentsModule.DatabaseSchemaBuildAgent,
    )
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

    // Mock agent
    mockAgent = {
      generate: vi.fn().mockResolvedValue({
        message: 'Mocked agent response',
        schemaChanges: [],
      }),
    }

    // Mock PM Analysis agent
    mockPMAnalysisAgent = {
      analyzeRequirements: vi.fn().mockResolvedValue({
        businessRequirement: 'Mocked BRD',
        functionalRequirements: {
          'Test Category': ['Mocked functional requirement'],
        },
        nonFunctionalRequirements: {
          Performance: ['Mocked non-functional requirement'],
        },
      }),
    }

    // Setup agent mocks
    MockDatabaseSchemaBuildAgent.mockImplementation(() => mockAgent)
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
    })

    // Setup createTimelineItem mock
    vi.mocked(mockSchemaRepository.createTimelineItem).mockResolvedValue({
      success: true,
      timelineItem: {
        id: 'test-timeline-item-id',
        content: 'Test timeline item content',
        type: 'assistant',
        user_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organization_id: 'test-org-id',
        design_session_id: 'test-design-session-id',
        building_schema_version_id: null,
        progress: null,
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
  })

  describe('Basic Functionality', () => {
    it('should execute successfully with valid parameters', async () => {
      const params = createBaseParams({
        message: 'Add a created_at timestamp column to the users table',
      })

      await executeAndAssertSuccess(params)
    })

    it('should handle structured JSON response and schema changes', async () => {
      const structuredResponse = {
        message: 'Added created_at column to users table',
        schemaChanges: [
          {
            op: 'add',
            path: '/tables/users/columns/created_at',
            value: {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              notNull: true,
            },
          },
        ],
      }

      mockAgent.generate.mockResolvedValue(structuredResponse)

      const params = createBaseParams({
        message: 'Add a created_at timestamp column to the users table',
      })

      const result = await deepModeling(params, mockLogger)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.text).toBe('Added created_at column to users table')
      }
      expect(mockSchemaRepository.createVersion).toHaveBeenCalledWith({
        buildingSchemaId: 'test-building-schema-id',
        latestVersionNumber: 1,
        patch: [
          {
            op: 'add',
            path: '/tables/users/columns/created_at',
            value: {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              notNull: true,
            },
          },
        ],
      })
    })

    it('should handle invalid JSON response gracefully', async () => {
      mockAgent.generate.mockResolvedValue({
        message: 'Invalid JSON response',
        schemaChanges: [],
      })

      const params = createBaseParams({
        message: 'Add a created_at timestamp column to the users table',
      })

      const result = await deepModeling(params, mockLogger)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.text).toBe('Invalid JSON response')
      }
      expect(mockSchemaRepository.createVersion).not.toHaveBeenCalled()
    })

    it('should handle complex schema modifications', async () => {
      const params = createBaseParams({
        message: 'Create a new posts table with foreign key to users',
      })

      await executeAndAssertSuccess(params)
    })
  })

  describe('History Handling', () => {
    it('should format chat history correctly', async () => {
      const params = createBaseParams({
        message: 'Test message',
        history: [
          ['user', 'First user message'],
          ['assistant', 'First assistant response'],
          ['user', 'Second user message'],
        ],
      })

      const result = await deepModeling(params, mockLogger)

      expect(result.success).toBe(true)
      // Verify that the workflow processed the history correctly
      expect(mockAgent.generate).toHaveBeenCalledOnce()
    })

    it('should handle empty history', async () => {
      const params = createBaseParams({
        message: 'Test message',
        history: [],
      })

      const result = await deepModeling(params, mockLogger)

      expect(result.success).toBe(true)
      expect(mockAgent.generate).toHaveBeenCalledOnce()
    })
  })

  describe('Error Handling', () => {
    it('should handle agent generation errors', async () => {
      mockAgent.generate.mockRejectedValue(new Error('Agent generation failed'))
      const params = createBaseParams()

      const result = await deepModeling(params, mockLogger)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Agent generation failed')
      }
    })

    it('should handle schema update failure', async () => {
      const structuredResponse = {
        message: 'Attempted to add created_at column',
        schemaChanges: [
          {
            op: 'add',
            path: '/tables/users/columns/created_at',
            value: { name: 'created_at', type: 'timestamp' },
          },
        ],
      }

      mockAgent.generate.mockResolvedValue(structuredResponse)
      vi.mocked(mockSchemaRepository.createVersion).mockResolvedValue({
        success: false,
        error: 'Database constraint violation',
      })

      const params = createBaseParams({
        message: 'Add a created_at timestamp column to the users table',
      })

      // This might succeed or fail based on workflow logic, but should handle gracefully
      const result = await deepModeling(params, mockLogger)
      expect(result).toBeDefined()
    })

    it('should handle schema update exception', async () => {
      const structuredResponse = {
        message: 'Attempted to add created_at column',
        schemaChanges: [
          {
            op: 'add',
            path: '/tables/users/columns/created_at',
            value: { name: 'created_at', type: 'timestamp' },
          },
        ],
      }

      mockAgent.generate.mockResolvedValue(structuredResponse)
      vi.mocked(mockSchemaRepository.createVersion).mockRejectedValue(
        new Error('Network error'),
      )

      const params = createBaseParams({
        message: 'Add a created_at timestamp column to the users table',
      })

      const result = await deepModeling(params, mockLogger)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Network error')
      }
    })

    it('should handle empty user input', async () => {
      const params = createBaseParams({ message: '' })

      const result = await deepModeling(params, mockLogger)

      expect(result).toBeDefined()
      // Should handle empty input gracefully
    })
  })

  describe('Parameter Validation', () => {
    it('should handle missing optional organizationId', async () => {
      const { organizationId, ...paramsWithoutOrgId } = createBaseParams()

      const result = await deepModeling(paramsWithoutOrgId, mockLogger)

      expect(result).toBeDefined()
    })

    it('should handle different latestVersionNumber values', async () => {
      const params = createBaseParams({
        latestVersionNumber: 0,
      })

      const result = await deepModeling(params, mockLogger)

      expect(result).toBeDefined()
    })
  })

  describe('Integration', () => {
    it('should execute multiple Deep Modeling workflows sequentially', async () => {
      const testMessages = [
        'First modification',
        'Second modification',
        'Third modification',
      ]

      const results = []
      for (const message of testMessages) {
        const params = createBaseParams({ message })
        const result = await deepModeling(params, mockLogger)
        results.push(result)
      }

      expect(results).toHaveLength(3)
      for (const result of results) {
        expect(result).toBeDefined()
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.text).toBe('Mocked agent response')
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

      const results = []
      for (const message of testInputs) {
        const params = createBaseParams({ message })
        const result = await deepModeling(params, mockLogger)
        results.push(result)
      }

      for (const result of results) {
        expect(result).toBeDefined()
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.text).toBe('Mocked agent response')
        }
      }
    })
  })
})
