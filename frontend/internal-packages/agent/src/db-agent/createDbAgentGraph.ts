import { END, START, StateGraph } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint'
import { RETRY_POLICY } from '../utils/errorHandling'
import { designSchemaNode } from './nodes/designSchemaNode'
import { invokeSchemaDesignToolNode } from './nodes/invokeSchemaDesignToolNode'
import { routeAfterDesignSchema } from './routing/routeAfterDesignSchema'
import type { DbAgentState } from './shared/dbAgentAnnotation'
import { dbAgentAnnotation } from './shared/dbAgentAnnotation'

/**
 * Create and configure the DB Agent subgraph for database schema design
 *
 * The DB Agent handles the iterative design process:
 * 1. designSchema - Uses AI to design database schema
 * 2. invokeSchemaDesignTool - Applies schema changes using tools
 * 3. Loop between design and tool invocation until schema is complete
 *
 * @param checkpointer - Optional checkpoint saver for persistent state management
 */
export const createDbAgentGraph = (checkpointer?: BaseCheckpointSaver) => {
  const dbAgentGraph = new StateGraph(dbAgentAnnotation)

  dbAgentGraph
    .addNode('designSchema', designSchemaNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('invokeSchemaDesignTool', invokeSchemaDesignToolNode, {
      retryPolicy: RETRY_POLICY,
    })

    .addEdge(START, 'designSchema')
    .addConditionalEdges('designSchema', routeAfterDesignSchema, {
      invokeSchemaDesignTool: 'invokeSchemaDesignTool',
      designSchema: 'designSchema', // Self-loop for retry
    })
    .addConditionalEdges(
      'invokeSchemaDesignTool',
      (state: DbAgentState) => {
        // Check if tool execution was successful
        if (state.schemaDesignSuccessful) {
          return 'END'
        }
        // Retry on failure
        return 'designSchema'
      },
      {
        END: END,
        designSchema: 'designSchema', // Retry on error
      },
    )

  return checkpointer
    ? dbAgentGraph.compile({ checkpointer })
    : dbAgentGraph.compile()
}
