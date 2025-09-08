import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { END, START, StateGraph } from '@langchain/langgraph'
import { aColumn, aSchema, aTable } from '@liam-hq/schema'
import { describe, expect, it } from 'vitest'
import { getTestConfig } from '../../../test-utils/workflowTestHelpers'
import type { WorkflowState } from '../../types'
import { WorkflowTerminationError } from '../../utils/errorHandling'
import { workflowAnnotation } from '../../workflowAnnotation'

import { validateInitialSchemaNode } from './validateInitialSchemaNode'

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
      const stream = await graph.stream(state, config)
      const results = []
      for await (const result of stream) {
        results.push(result)
      }

      // Assert
      expect(results).toHaveLength(1)
      const finalResult = results[0]
      expect(finalResult).toBeDefined()
      expect(finalResult).toHaveProperty('validateInitialSchema')

      if (!finalResult?.validateInitialSchema) {
        expect.fail('Expected finalResult.validateInitialSchema to be defined')
      }

      const resultState = finalResult.validateInitialSchema

      // Empty schema should return unchanged state
      expect(resultState.schemaData).toEqual(state.schemaData)
      expect(resultState.messages).toEqual(state.messages)
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
      const stream = await graph.stream(state, config)
      const results = []
      for await (const result of stream) {
        results.push(result)
      }

      // Assert
      expect(results).toHaveLength(1)
      const finalResult = results[0]
      expect(finalResult).toBeDefined()
      expect(finalResult).toHaveProperty('validateInitialSchema')

      if (!finalResult?.validateInitialSchema) {
        expect.fail('Expected finalResult.validateInitialSchema to be defined')
      }

      const resultState = finalResult.validateInitialSchema

      // Schema validation should succeed with valid schema
      expect(resultState.schemaData).toEqual(state.schemaData)
      expect(resultState.messages).toEqual(state.messages)

      // Should have users table with correct structure
      expect(resultState.schemaData.tables['users']).toBeDefined()
      const usersTable = resultState.schemaData.tables['users']
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
      const stream = await graph.stream(state, config)
      const results = []
      for await (const result of stream) {
        results.push(result)
      }

      // Assert
      expect(results).toHaveLength(1)
      const finalResult = results[0]
      expect(finalResult).toBeDefined()
      expect(finalResult).toHaveProperty('validateInitialSchema')

      if (!finalResult?.validateInitialSchema) {
        expect.fail('Expected finalResult.validateInitialSchema to be defined')
      }

      const resultState = finalResult.validateInitialSchema

      // Non-first execution should return state unchanged (validation is skipped)
      expect(resultState.schemaData).toEqual(state.schemaData)
      expect(resultState.messages).toEqual(state.messages)
      expect(resultState.userInput).toBe('Follow-up message')

      // Should preserve the existing messages including AI message
      expect(resultState.messages).toHaveLength(3)
      expect(resultState.messages[1]).toBeInstanceOf(AIMessage)
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
