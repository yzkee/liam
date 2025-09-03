import { AIMessage } from '@langchain/core/messages'
import { END, START, StateGraph } from '@langchain/langgraph'
import { describe, it } from 'vitest'
import {
  getTestConfig,
  outputStream,
} from '../../../test-utils/workflowTestHelpers'
import type { DbAgentState } from '../shared/dbAgentAnnotation'
import { dbAgentAnnotation } from '../shared/dbAgentAnnotation'
import { invokeSchemaDesignToolNode } from './invokeSchemaDesignToolNode'

describe('invokeSchemaDesignToolNode Integration', () => {
  it('should execute schema design tool with real APIs', async () => {
    // Arrange
    const graph = new StateGraph(dbAgentAnnotation)
      .addNode('invokeSchemaDesignTool', invokeSchemaDesignToolNode)
      .addEdge(START, 'invokeSchemaDesignTool')
      .addEdge('invokeSchemaDesignTool', END)
      .compile()
    const { config, context } = await getTestConfig()

    const toolCallMessage = new AIMessage({
      content: '',
      tool_calls: [
        {
          id: 'test-tool-call-id',
          name: 'schemaDesignTool',
          args: {
            operations: [
              {
                op: 'add',
                path: '/tables/users',
                value: {
                  name: 'users',
                  columns: {
                    id: {
                      name: 'id',
                      type: 'uuid',
                      primaryKey: true,
                      notNull: true,
                      default: 'gen_random_uuid()',
                    },
                    email: {
                      name: 'email',
                      type: 'varchar',
                      notNull: true,
                      unique: true,
                    },
                    created_at: {
                      name: 'created_at',
                      type: 'timestamp',
                      notNull: true,
                      default: 'now()',
                    },
                  },
                  indexes: {},
                  constraints: {},
                },
              },
            ],
          },
        },
      ],
    })

    const state: DbAgentState = {
      messages: [toolCallMessage],
      schemaData: {
        tables: {},
        enums: {},
        extensions: {},
      },
      buildingSchemaId: context.buildingSchemaId,
      latestVersionNumber: context.latestVersionNumber,
      designSessionId: context.designSessionId,
      userId: context.userId,
      organizationId: context.organizationId,
      next: END,
    }

    // Act
    const stream = await graph.stream(state, config)

    // Assert (Output)
    await outputStream(stream)
  })

  it('should handle tool execution errors gracefully', async () => {
    // Arrange
    const graph = new StateGraph(dbAgentAnnotation)
      .addNode('invokeSchemaDesignTool', invokeSchemaDesignToolNode)
      .addEdge(START, 'invokeSchemaDesignTool')
      .addEdge('invokeSchemaDesignTool', END)
      .compile()
    const { config, context } = await getTestConfig()

    const invalidToolCallMessage = new AIMessage({
      content: '',
      tool_calls: [
        {
          id: 'test-invalid-tool-call-id',
          name: 'schemaDesignTool',
          args: {
            operations: [
              {
                op: 'add',
                path: '/tables/invalid_table',
                value: {
                  name: 'invalid_table',
                },
              },
            ],
          },
        },
      ],
    })

    const state: DbAgentState = {
      messages: [invalidToolCallMessage],
      schemaData: {
        tables: {},
        enums: {},
        extensions: {},
      },
      buildingSchemaId: context.buildingSchemaId,
      latestVersionNumber: context.latestVersionNumber,
      designSessionId: context.designSessionId,
      userId: context.userId,
      organizationId: context.organizationId,
      next: END,
    }

    // Act
    const stream = await graph.stream(state, config)

    // Assert (Output)
    await outputStream(stream)
  })
})
