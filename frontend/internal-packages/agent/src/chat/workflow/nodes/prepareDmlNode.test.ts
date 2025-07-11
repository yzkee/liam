import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DMLGenerationAgent } from '../../../langchain/agents/dmlGenerationAgent/agent'
import type { Repositories } from '../../../repositories'
import { convertSchemaToText } from '../../../utils/convertSchemaToText'
import type { WorkflowState } from '../types'
import { prepareDmlNode } from './prepareDmlNode'

vi.mock('../../../langchain/agents/dmlGenerationAgent/agent')

describe('prepareDmlNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default mock implementation
    vi.mocked(DMLGenerationAgent).mockImplementation(() => {
      const agent = {
        generate: vi.fn().mockResolvedValue({
          dmlStatements: '-- Generated DML statements',
        }),
      }
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return agent as unknown as DMLGenerationAgent
    })
  })

  const createMockState = (overrides?: Partial<WorkflowState>) => {
    const repositories: Repositories = {
      schema: {
        updateTimelineItem: vi.fn(),
        getSchema: vi.fn(),
        getDesignSession: vi.fn(),
        createVersion: vi.fn(),
        createTimelineItem: vi.fn().mockResolvedValue(undefined),
        createArtifact: vi.fn(),
        updateArtifact: vi.fn(),
        getArtifact: vi.fn(),
      },
    }

    return {
      messages: [],
      userInput: 'test',
      schemaData: { tables: {} },
      buildingSchemaId: 'test-id',
      latestVersionNumber: 1,
      userId: 'user-id',
      designSessionId: 'session-id',
      retryCount: {},
      repositories,
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

    const result = await prepareDmlNode(state, {
      configurable: { repositories: state.repositories },
    })

    expect(result.dmlStatements).toBe('-- Generated DML statements')
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

    const result = await prepareDmlNode(state, {
      configurable: { repositories: state.repositories },
    })

    expect(result.dmlStatements).toBeUndefined()
  })

  it('should return state unchanged when use cases are missing', async () => {
    const state = createMockState({
      ddlStatements: 'CREATE TABLE users (id INT);',
    })

    const result = await prepareDmlNode(state, {
      configurable: { repositories: state.repositories },
    })

    expect(result.dmlStatements).toBeUndefined()
  })

  it('should return state unchanged when use cases array is empty', async () => {
    const state = createMockState({
      ddlStatements: 'CREATE TABLE users (id INT);',
      generatedUsecases: [],
    })

    const result = await prepareDmlNode(state, {
      configurable: { repositories: state.repositories },
    })

    expect(result.dmlStatements).toBeUndefined()
  })

  it('should format use cases by category', async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      dmlStatements: '-- Generated DML statements',
    })

    vi.mocked(DMLGenerationAgent).mockImplementationOnce(() => {
      const agent = { generate: mockGenerate }
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return agent as unknown as DMLGenerationAgent
    })

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
        {
          requirementType: 'functional',
          requirementCategory: 'User Management',
          requirement: 'Users should be able to login',
          title: 'User Login',
          description: 'Allow users to authenticate',
        },
        {
          requirementType: 'functional',
          requirementCategory: 'Content Management',
          requirement: 'Users can create posts',
          title: 'Create Posts',
          description: 'Users can publish new posts',
        },
      ],
    })

    await prepareDmlNode(state, {
      configurable: { repositories: state.repositories },
    })

    expect(mockGenerate).toHaveBeenCalledTimes(1)
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaSQL: 'CREATE TABLE users (id INT);',
        formattedUseCases: expect.stringContaining('User Management:'),
        schemaContext: expect.any(String),
      }),
    )

    // Verify the formatted use cases contain all expected content
    const firstCall = mockGenerate.mock.calls[0]
    if (firstCall?.[0]) {
      const arg = firstCall[0]
      if (
        typeof arg === 'object' &&
        arg !== null &&
        'formattedUseCases' in arg
      ) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const argWithUseCases = arg as { formattedUseCases: unknown }
        const formattedUseCases = String(argWithUseCases.formattedUseCases)
        expect(formattedUseCases).toContain('User Management:')
        expect(formattedUseCases).toContain('Content Management:')
        expect(formattedUseCases).toContain('User Registration')
        expect(formattedUseCases).toContain('User Login')
        expect(formattedUseCases).toContain('Create Posts')
      }
    }
  })

  it('should handle use cases without category', async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      dmlStatements: '-- Generated DML statements',
    })

    vi.mocked(DMLGenerationAgent).mockImplementationOnce(() => {
      const agent = { generate: mockGenerate }
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return agent as unknown as DMLGenerationAgent
    })

    const state = createMockState({
      ddlStatements: 'CREATE TABLE users (id INT);',
      generatedUsecases: [
        {
          requirementType: 'functional',
          requirementCategory: '',
          requirement: 'Basic functionality',
          title: 'Basic Feature',
          description: 'A basic feature without category',
        },
      ],
    })

    await prepareDmlNode(state, {
      configurable: { repositories: state.repositories },
    })

    expect(mockGenerate).toHaveBeenCalledWith({
      schemaSQL: 'CREATE TABLE users (id INT);',
      formattedUseCases: expect.stringContaining('General:'),
      schemaContext: expect.any(String),
    })
  })

  it('should pass schema context to DML generation agent', async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      dmlStatements: '-- Generated DML statements',
    })
    vi.mocked(DMLGenerationAgent).mockImplementationOnce(() => {
      const agent = {
        generate: mockGenerate,
      }
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return agent as unknown as DMLGenerationAgent
    })

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
      schemaData: {
        tables: {
          users: {
            name: 'users',
            comment: null,
            columns: {
              id: {
                name: 'id',
                type: 'INT',
                notNull: true,
                default: null,
                check: null,
                comment: null,
              },
              email: {
                name: 'email',
                type: 'VARCHAR',
                notNull: true,
                default: null,
                check: null,
                comment: null,
              },
            },
            constraints: {},
            indexes: {},
          },
        },
      },
    })

    await prepareDmlNode(state, {
      configurable: { repositories: state.repositories },
    })

    expect(mockGenerate).toHaveBeenCalledWith({
      schemaSQL: 'CREATE TABLE users (id INT);',
      formattedUseCases: expect.any(String),
      schemaContext: expect.any(String),
    })
  })

  it('should handle empty DML generation result', async () => {
    vi.mocked(DMLGenerationAgent).mockImplementationOnce(() => {
      const agent = {
        generate: vi.fn().mockResolvedValue({
          dmlStatements: '',
        }),
      }
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return agent as unknown as DMLGenerationAgent
    })

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

    const result = await prepareDmlNode(state, {
      configurable: { repositories: state.repositories },
    })

    expect(result.dmlStatements).toBeUndefined()
  })

  it('should process schema with convertSchemaToText', async () => {
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
      schemaData: {
        tables: {
          users: {
            name: 'users',
            comment: null,
            columns: {
              id: {
                name: 'id',
                type: 'INT',
                notNull: true,
                default: null,
                check: null,
                comment: null,
              },
              email: {
                name: 'email',
                type: 'VARCHAR',
                notNull: true,
                default: null,
                check: null,
                comment: null,
              },
            },
            constraints: {},
            indexes: {},
          },
        },
      },
    })

    await prepareDmlNode(state, {
      configurable: { repositories: state.repositories },
    })

    // Verify convertSchemaToText produces correct output
    const schemaText = convertSchemaToText(state.schemaData)
    expect(schemaText).toContain('Table: users')
    expect(schemaText).toContain('id: INT (not nullable)')
    expect(schemaText).toContain('email: VARCHAR (not nullable)')
  })
})
