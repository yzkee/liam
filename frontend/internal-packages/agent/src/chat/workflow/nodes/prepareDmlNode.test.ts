import { describe, expect, it, vi } from 'vitest'
import { DMLGenerationAgent } from '../../../langchain/agents/dmlGenerationAgent/agent'
import type { Repositories } from '../../../repositories'
import type { NodeLogger } from '../../../utils/nodeLogger'
import type { WorkflowState } from '../types'
import { prepareDmlNode } from './prepareDmlNode'

vi.mock('../../../langchain/agents/dmlGenerationAgent/agent', () => ({
  DMLGenerationAgent: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue({
      dmlStatements: '-- Generated DML statements',
    }),
  })),
}))

describe('prepareDmlNode', () => {
  const mockLogger: NodeLogger = {
    debug: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }

  const createMockState = (overrides?: Partial<WorkflowState>) => {
    const repositories: Repositories = {
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

    return {
      userInput: 'test',
      formattedHistory: '',
      schemaData: { tables: {}, relationships: [] },
      buildingSchemaId: 'test-id',
      latestVersionNumber: 1,
      userId: 'user-id',
      designSessionId: 'session-id',
      retryCount: {},
      repositories,
      logger: mockLogger,
      ...overrides,
    }
  }

  it('should generate DML statements when DDL and use cases are available', async () => {
    const state = createMockState({
      ddlStatements: 'CREATE TABLE users (id INT);',
      generatedUsecases: [
        {
          requirementType: 'functional',
          requirementCategory: 'User Management',
          requirement: 'Users should be able to register',
          title: 'User Registration',
          description: 'Allow users to create new accounts',
        },
      ],
    })

    const result = await prepareDmlNode(state as WorkflowState)

    expect(result.dmlStatements).toBe('-- Generated DML statements')
    expect(mockLogger.info).toHaveBeenCalledWith('Preparing DML statements')
    expect(mockLogger.info).toHaveBeenCalledWith(
      'DML statements generated successfully',
    )
  })

  it('should return state unchanged when DDL statements are missing', async () => {
    const state = createMockState({
      generatedUsecases: [
        {
          requirementType: 'functional',
          requirementCategory: 'User Management',
          requirement: 'Users should be able to register',
          title: 'User Registration',
          description: 'Allow users to create new accounts',
        },
      ],
    })

    const result = await prepareDmlNode(state as WorkflowState)

    expect(result.dmlStatements).toBeUndefined()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'No DDL statements available for DML generation',
    )
  })

  it('should return state unchanged when use cases are missing', async () => {
    const state = createMockState({
      ddlStatements: 'CREATE TABLE users (id INT);',
      generatedUsecases: [],
    })

    const result = await prepareDmlNode(state as WorkflowState)

    expect(result.dmlStatements).toBeUndefined()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'No use cases available for DML generation',
    )
  })

  it('should log input statistics', async () => {
    const state = createMockState({
      ddlStatements:
        'CREATE TABLE users (id INT);\nCREATE TABLE posts (id INT);',
      generatedUsecases: [
        {
          requirementType: 'functional',
          requirementCategory: 'User Management',
          requirement: 'Users should be able to register',
          title: 'User Registration',
          description: 'Allow users to create new accounts',
        },
        {
          requirementType: 'functional',
          requirementCategory: 'Content',
          requirement: 'Users can create posts',
          title: 'Create Posts',
          description: 'Users can publish new posts',
        },
      ],
    })

    await prepareDmlNode(state as WorkflowState)

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Generating DML for 2 tables and 2 use cases',
    )
  })

  it('should handle empty DML generation result', async () => {
    vi.mocked(DMLGenerationAgent).mockImplementationOnce(
      () =>
        ({
          generate: vi.fn().mockResolvedValue({
            dmlStatements: '',
          }),
        }) as any,
    )

    const state = createMockState({
      ddlStatements: 'CREATE TABLE users (id INT);',
      generatedUsecases: [
        {
          requirementType: 'functional',
          requirementCategory: 'User Management',
          requirement: 'Users should be able to register',
          title: 'User Registration',
          description: 'Allow users to create new accounts',
        },
      ],
    })

    const result = await prepareDmlNode(state as WorkflowState)

    expect(result.dmlStatements).toBeUndefined()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'DML generation returned empty statements',
    )
  })
})
