import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { END, START, StateGraph } from '@langchain/langgraph'
import { aColumn, aSchema, aTable } from '@liam-hq/schema'
import { describe, it } from 'vitest'
import {
  getTestConfig,
  outputStream,
} from '../../../test-utils/workflowTestHelpers'
import { workflowAnnotation } from '../../chat/workflow/shared/workflowAnnotation'
import type { WorkflowState } from '../../chat/workflow/types'
import { classifyMessage } from './index'

describe('classifyMessage Integration', () => {
  it('should route database design requests to pmAgent', async () => {
    const graph = new StateGraph(workflowAnnotation)
      .addNode('classifyMessage', classifyMessage)
      .addEdge(START, 'classifyMessage')
      .addEdge('classifyMessage', END)
      .compile()
    const { config, context } = await getTestConfig()

    const userInput =
      'Create a user management system with users, roles, and permissions tables'
    const state: WorkflowState = {
      userInput,
      messages: [new HumanMessage(userInput)],
      schemaData: { tables: {}, enums: {}, extensions: {} },
      buildingSchemaId: context.buildingSchemaId,
      latestVersionNumber: context.latestVersionNumber,
      designSessionId: context.designSessionId,
      userId: context.userId,
      organizationId: context.organizationId,
      next: END,
    }

    const stream = await graph.stream(state, config)

    await outputStream(stream)
  })

  it('should handle unsupported tasks without routing', async () => {
    const graph = new StateGraph(workflowAnnotation)
      .addNode('classifyMessage', classifyMessage)
      .addEdge(START, 'classifyMessage')
      .addEdge('classifyMessage', END)
      .compile()
    const { config, context } = await getTestConfig()

    const userInput = 'Generate Python code for a REST API'
    const state: WorkflowState = {
      userInput,
      messages: [new HumanMessage(userInput)],
      schemaData: { tables: {}, enums: {}, extensions: {} },
      buildingSchemaId: context.buildingSchemaId,
      latestVersionNumber: context.latestVersionNumber,
      designSessionId: context.designSessionId,
      userId: context.userId,
      organizationId: context.organizationId,
      next: END,
    }

    const stream = await graph.stream(state, config)

    await outputStream(stream)
  })

  it('should route to summarizeWorkflow when QA is completed', async () => {
    const graph = new StateGraph(workflowAnnotation)
      .addNode('classifyMessage', classifyMessage)
      .addEdge(START, 'classifyMessage')
      .addEdge('classifyMessage', END)
      .compile()
    const { config, context } = await getTestConfig()

    const state: WorkflowState = {
      userInput: 'Create a user management system',
      messages: [
        new HumanMessage('Create a user management system'),
        new AIMessage({
          content:
            'I have designed the schema with users, roles, and permissions tables.',
          name: 'db-agent',
        }),
        new AIMessage({
          content: 'The schema has been validated and meets all requirements.',
          name: 'qa-agent',
        }),
      ],
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
      }),
      buildingSchemaId: context.buildingSchemaId,
      latestVersionNumber: context.latestVersionNumber,
      designSessionId: context.designSessionId,
      userId: context.userId,
      organizationId: context.organizationId,
      next: END,
    }

    const stream = await graph.stream(state, config)

    await outputStream(stream)
  })

  it('should handle entity relationship design requests', async () => {
    const graph = new StateGraph(workflowAnnotation)
      .addNode('classifyMessage', classifyMessage)
      .addEdge(START, 'classifyMessage')
      .addEdge('classifyMessage', END)
      .compile()
    const { config, context } = await getTestConfig()

    const userInput =
      'Design relationships between customers, orders, and products with proper foreign keys'
    const state: WorkflowState = {
      userInput,
      messages: [new HumanMessage(userInput)],
      schemaData: { tables: {}, enums: {}, extensions: {} },
      buildingSchemaId: context.buildingSchemaId,
      latestVersionNumber: context.latestVersionNumber,
      designSessionId: context.designSessionId,
      userId: context.userId,
      organizationId: context.organizationId,
      next: END,
    }

    const stream = await graph.stream(state, config)

    await outputStream(stream)
  })

  it('should handle data normalization requests', async () => {
    const graph = new StateGraph(workflowAnnotation)
      .addNode('classifyMessage', classifyMessage)
      .addEdge(START, 'classifyMessage')
      .addEdge('classifyMessage', END)
      .compile()
    const { config, context } = await getTestConfig()

    const userInput =
      'Normalize this database schema to 3NF and eliminate redundancy'
    const state: WorkflowState = {
      userInput,
      messages: [new HumanMessage(userInput)],
      schemaData: { tables: {}, enums: {}, extensions: {} },
      buildingSchemaId: context.buildingSchemaId,
      latestVersionNumber: context.latestVersionNumber,
      designSessionId: context.designSessionId,
      userId: context.userId,
      organizationId: context.organizationId,
      next: END,
    }

    const stream = await graph.stream(state, config)

    await outputStream(stream)
  })

  it('should handle mixed requests by identifying primary objective', async () => {
    const graph = new StateGraph(workflowAnnotation)
      .addNode('classifyMessage', classifyMessage)
      .addEdge(START, 'classifyMessage')
      .addEdge('classifyMessage', END)
      .compile()
    const { config, context } = await getTestConfig()

    const userInput =
      'I need to design a database schema for an e-commerce platform and also want to know about API endpoints'
    const state: WorkflowState = {
      userInput,
      messages: [new HumanMessage(userInput)],
      schemaData: { tables: {}, enums: {}, extensions: {} },
      buildingSchemaId: context.buildingSchemaId,
      latestVersionNumber: context.latestVersionNumber,
      designSessionId: context.designSessionId,
      userId: context.userId,
      organizationId: context.organizationId,
      next: END,
    }

    const stream = await graph.stream(state, config)

    await outputStream(stream)
  })
})
