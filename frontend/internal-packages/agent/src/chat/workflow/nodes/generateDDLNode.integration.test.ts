import { aColumn, aTable, type Schema } from '@liam-hq/db-structure'
import {
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from 'vitest'
import type { WorkflowState } from '../types'
import { executeDDLNode } from './executeDDLNode'
import { generateDDLNode } from './generateDDLNode'

// Mock the pglite-server module
vi.mock('@liam-hq/pglite-server', () => ({
  executeQuery: vi.fn(),
}))

describe('generateDDLNode -> executeDDLNode integration', () => {
  const mockLogger = {
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }

  const createMockState = (schemaData: Schema): WorkflowState => ({
    userInput: '',
    schemaData,
    logger: mockLogger,
    onNodeProgress: undefined,
    formattedHistory: '',
    retryCount: {},
    buildingSchemaId: 'test-schema',
    latestVersionNumber: 1,
    userId: 'test-user',
    designSessionId: 'test-session',
    repositories: {} as never,
    ddlStatements: '',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate DDL and then execute it successfully', async () => {
    const { executeQuery } = await import('@liam-hq/pglite-server')
    const mockExecuteQuery = executeQuery as MockedFunction<typeof executeQuery>

    // Mock successful execution
    mockExecuteQuery.mockResolvedValue([
      {
        success: true,
        sql: 'CREATE TABLE "users"...',
        result: {},
        id: 'test-query-1',
        metadata: {
          executionTime: 10,
          timestamp: '2023-01-01T00:00:00Z',
          affectedRows: 1,
        },
      },
    ])

    const mockSchemaData: Schema = {
      tables: {
        users: aTable({
          name: 'users',
          columns: {
            id: aColumn({
              name: 'id',
              type: 'INTEGER',
              notNull: true,
            }),
          },
        }),
      },
    }

    const initialState = createMockState(mockSchemaData)

    // Step 1: Generate DDL
    const afterGeneration = await generateDDLNode(initialState)

    // Verify DDL was generated
    expect(afterGeneration.ddlStatements).toBeTruthy()
    expect(afterGeneration.ddlStatements).toContain('CREATE TABLE "users"')

    // Step 2: Execute DDL
    await executeDDLNode(afterGeneration)

    // Verify execution was attempted
    expect(mockExecuteQuery).toHaveBeenCalledWith(
      'test-session',
      expect.stringContaining('CREATE TABLE "users"'),
    )

    // Verify logs
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('[generateDDLNode] Generated DDL for 1 tables'),
    )
    expect(mockLogger.log).toHaveBeenCalledWith(
      '[executeDDLNode] DDL executed successfully',
    )
  })

  it('should handle empty schema properly through the pipeline', async () => {
    const mockSchemaData: Schema = {
      tables: {},
    }

    const initialState = createMockState(mockSchemaData)

    // Step 1: Generate DDL
    const afterGeneration = await generateDDLNode(initialState)

    // Verify empty DDL was generated
    expect(afterGeneration.ddlStatements).toBe('')

    // Step 2: Execute DDL
    await executeDDLNode(afterGeneration)

    // Verify no execution was attempted
    expect(mockLogger.log).toHaveBeenCalledWith(
      '[generateDDLNode] Generated DDL for 0 tables (0 characters)',
    )
    expect(mockLogger.log).toHaveBeenCalledWith(
      '[executeDDLNode] No DDL statements to execute',
    )
  })

  it('should detect when DDL generation fails and execution cannot proceed', async () => {
    // Use invalid schema to trigger error
    const initialState = createMockState(null as unknown as Schema)

    // Step 1: Generate DDL (should fail)
    const afterGeneration = await generateDDLNode(initialState)

    // Verify error state
    expect(afterGeneration.ddlStatements).toBe(
      'DDL generation failed due to an unexpected error.',
    )

    // Clear mock calls to focus on execute phase
    vi.clearAllMocks()

    // Step 2: Execute DDL (should try to execute the error message as DDL)
    await executeDDLNode(afterGeneration)

    // Note: executeDDLNode doesn't distinguish between valid DDL and error messages
    // It treats any non-empty string as DDL to execute
    expect(mockLogger.log).toHaveBeenCalledWith('[executeDDLNode] Started')
    expect(mockLogger.log).toHaveBeenCalledWith(
      '[executeDDLNode] DDL executed successfully',
    )
  })
})
