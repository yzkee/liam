import { END, START, StateGraph } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint'
import { RETRY_POLICY } from '../shared/errorHandling'
import { leadAgentStateAnnotation } from './annotation'
import { classifyMessage, toolNode } from './classifyMessage'
import { routeAfterClassification } from './classifyMessage/utils'

export const createLeadAgentGraph = (checkpointer?: BaseCheckpointSaver) => {
  const leadAgentGraph = new StateGraph(leadAgentStateAnnotation)

  leadAgentGraph
    .addNode('classify', classifyMessage, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('tool', toolNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addEdge(START, 'classify')
    .addEdge('tool', END)
    .addConditionalEdges('classify', routeAfterClassification, {
      toolNode: 'tool',
      END: END,
    })

  return checkpointer
    ? leadAgentGraph.compile({ checkpointer })
    : leadAgentGraph.compile()
}
