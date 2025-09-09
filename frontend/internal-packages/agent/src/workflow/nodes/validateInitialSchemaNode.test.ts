import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { END, START, StateGraph } from '@langchain/langgraph'
import { aColumn, aSchema, aTable } from '@liam-hq/schema'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { getTestConfig } from '../../../test-utils/workflowTestHelpers'
import type { WorkflowState } from '../../types'
import { WorkflowTerminationError } from '../../utils/errorHandling'
import { workflowAnnotation } from '../../workflowAnnotation'

// Mock @liam-hq/schema to include isEmptySchema
vi.mock('@liam-hq/schema', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@liam-hq/schema')>()
  return {
    ...actual,
    isEmptySchema: (schema: Parameters<typeof actual.isEmptySchema>[0]) => {
      return (
        Object.keys(schema.tables || {}).length === 0 &&
        Object.keys(schema.enums || {}).length === 0
      )
    },
  }
})

import { validateInitialSchemaNode } from './validateInitialSchemaNode'

// Mock OPENAI_API_KEY for getTestConfig
// validateInitialSchemaNode doesn't use OpenAI API, so dummy key is sufficient
beforeAll(() => {
  process.env['OPENAI_API_KEY'] = 'dummy-key-for-testing'
})

afterAll(() => {
  delete process.env['OPENAI_API_KEY']
})

describe('validateInitialSchemaNode Integration', () => {
  describe('First execution scenarios', () => {
    it('should display fresh database message when schema is empty', async () => {
      // Arrange
      const graph = new StateGraph(workflowAnnotation)
        .addNode('validateInitialSchema', validateInitialSchemaNode)
        .addEdge(START, 'validateInitialSchema')
        .addEdge('validateInitialSchema', END)
        .compile()

      const { config, context } = await getTestConfig()

      const state: WorkflowState = {
        messages: [new HumanMessage('Create a new database schema')],
        designSessionId: context.designSessionId,
        organizationId: context.organizationId,
        userId: context.userId,
        userInput: 'Create a new database schema',
        schemaData: aSchema({
          tables: {},
          enums: {},
          extensions: {},
        }),
        analyzedRequirements: undefined,
        testcases: [],
        buildingSchemaId: 'test-building-schema-id',
        latestVersionNumber: 1,
        next: 'leadAgent',
      }

      // Act
      const result = await graph.invoke(state, config)

      // Assert
      // Empty schema should return unchanged state
      expect(result).toEqual(state)
    })

    it('should validate existing schema successfully', async () => {
      // Arrange
      const graph = new StateGraph(workflowAnnotation)
        .addNode('validateInitialSchema', validateInitialSchemaNode)
        .addEdge(START, 'validateInitialSchema')
        .addEdge('validateInitialSchema', END)
        .compile()

      const { config, context } = await getTestConfig()

      const state: WorkflowState = {
        messages: [new HumanMessage('Update my existing schema')],
        designSessionId: context.designSessionId,
        organizationId: context.organizationId,
        userId: context.userId,
        userInput: 'Update my existing schema',
        schemaData: aSchema({
          tables: {
            users: aTable({
              name: 'users',
              columns: {
                id: aColumn({
                  name: 'id',
                  type: 'uuid',
                  notNull: true,
                }),
                email: aColumn({
                  name: 'email',
                  type: 'varchar',
                  notNull: true,
                }),
              },
            }),
          },
          enums: {},
          extensions: {},
        }),
        analyzedRequirements: undefined,
        testcases: [],
        buildingSchemaId: 'test-building-schema-id',
        latestVersionNumber: 1,
        next: 'leadAgent',
      }

      // Act
      const result = await graph.invoke(state, config)

      // Assert
      // Schema validation should succeed with valid schema
      expect(result).toEqual(state)

      // Should have users table with correct structure
      expect(result.schemaData.tables['users']).toBeDefined()
      const usersTable = result.schemaData.tables['users']
      expect(usersTable?.name).toBe('users')
      expect(usersTable?.columns['id']?.type).toBe('uuid')
      expect(usersTable?.columns['email']?.type).toBe('varchar')
    })
  })

  describe('Non-first execution scenarios', () => {
    it('should skip validation when AI messages already exist', async () => {
      // Arrange
      const graph = new StateGraph(workflowAnnotation)
        .addNode('validateInitialSchema', validateInitialSchemaNode)
        .addEdge(START, 'validateInitialSchema')
        .addEdge('validateInitialSchema', END)
        .compile()

      const { config, context } = await getTestConfig()

      const state: WorkflowState = {
        messages: [
          new HumanMessage('First message'),
          new AIMessage('AI response'), // This indicates non-first execution
          new HumanMessage('Follow-up message'),
        ],
        designSessionId: context.designSessionId,
        organizationId: context.organizationId,
        userId: context.userId,
        userInput: 'Follow-up message',
        schemaData: aSchema({
          tables: {
            users: aTable({
              name: 'users',
              columns: {
                id: aColumn({
                  name: 'id',
                  type: 'uuid',
                  notNull: true,
                }),
              },
            }),
          },
          enums: {},
          extensions: {},
        }),
        analyzedRequirements: undefined,
        testcases: [],
        buildingSchemaId: 'test-building-schema-id',
        latestVersionNumber: 1,
        next: 'leadAgent',
      }

      // Act
      const result = await graph.invoke(state, config)

      // Assert
      // Non-first execution should return state unchanged (validation is skipped)
      expect(result).toEqual(state)
      expect(result.userInput).toBe('Follow-up message')

      // Should preserve the existing messages including AI message
      expect(result.messages).toHaveLength(3)
      expect(result.messages[1]).toBeInstanceOf(AIMessage)
    })
  })

  describe('Error handling scenarios', () => {
    it('should fail when schema contains invalid column type', async () => {
      // Arrange
      const { context } = await getTestConfig()

      const state: WorkflowState = {
        messages: [new HumanMessage('Test validation error with invalid DDL')],
        designSessionId: context.designSessionId,
        organizationId: context.organizationId,
        userId: context.userId,
        userInput: 'Test validation error with invalid DDL',
        schemaData: aSchema({
          tables: {
            invalid_table: aTable({
              name: 'invalid_table',
              columns: {
                bad_column: aColumn({
                  name: 'bad_column',
                  type: 'unknown_invalid_type', // This will cause DDL validation to fail
                  notNull: true,
                }),
              },
            }),
          },
          enums: {},
          extensions: {},
        }),
        analyzedRequirements: undefined,
        testcases: [],
        buildingSchemaId: 'test-building-schema-id',
        latestVersionNumber: 1,
        next: 'leadAgent',
      }

      // Act & Assert
      await expect(validateInitialSchemaNode(state)).rejects.toThrow(
        WorkflowTerminationError,
      )

      // Additional detailed error message verification
      const thrownError = await validateInitialSchemaNode(state).catch(
        (error) => error,
      )
      expect(thrownError).toBeInstanceOf(WorkflowTerminationError)

      const errorMessage =
        thrownError instanceof WorkflowTerminationError
          ? thrownError.message
          : String(thrownError)
      expect(errorMessage).toBe(
        'Error in validateInitialSchemaNode: Schema validation failed: {"error":"type \\"unknown_invalid_type\\" does not exist"}',
      )
    })
  })
})
