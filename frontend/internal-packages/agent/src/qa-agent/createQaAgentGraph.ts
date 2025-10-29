import { END, START, StateGraph } from '@langchain/langgraph'
import { RETRY_POLICY } from '../utils/errorHandling'
import { continueToRequirements } from './distributeRequirements'
import { analyzeTestFailuresNode } from './nodes/analyzeTestFailuresNode'
import { applyGeneratedSqlsNode } from './nodes/applyGeneratedSqlsNode'
import { invokeRunTestToolNode } from './nodes/invokeRunTestToolNode'
import { prepareSqlRetryNode } from './nodes/prepareSqlRetryNode'
import { routeAfterAnalyzeFailures } from './routing/routeAfterAnalyzeFailures'
import { qaAgentAnnotation } from './shared/qaAgentAnnotation'
import { testcaseGeneration } from './testcaseGeneration'
import { validateSchemaNode } from './validateSchema'

export const createQaAgentGraph = () => {
  const qaAgentGraph = new StateGraph(qaAgentAnnotation)

  qaAgentGraph
    // Add nodes for map-reduce pattern
    .addNode('testcaseGeneration', testcaseGeneration)

    .addNode('applyGeneratedSqls', applyGeneratedSqlsNode)

    .addNode('validateSchema', validateSchemaNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('invokeRunTestTool', invokeRunTestToolNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('analyzeTestFailures', analyzeTestFailuresNode)
    .addNode('prepareSqlRetry', prepareSqlRetryNode)

    // Define edges for map-reduce flow
    // Use conditional edge with Send API for parallel execution from START
    // Send targets the testcaseGeneration
    .addConditionalEdges(START, continueToRequirements)

    // After all parallel subgraph executions complete, apply generated SQLs
    .addEdge('testcaseGeneration', 'applyGeneratedSqls')

    // Then validate
    .addEdge('applyGeneratedSqls', 'validateSchema')

    // Add new test execution step after validation
    .addEdge('validateSchema', 'invokeRunTestTool')

    // After test execution, analyze failures
    .addEdge('invokeRunTestTool', 'analyzeTestFailures')

    // Route based on failure analysis
    .addConditionalEdges('analyzeTestFailures', routeAfterAnalyzeFailures, {
      prepareSqlRetry: 'prepareSqlRetry',
      [END]: END,
    })

    // After preparing SQL retry, go back to testcaseGeneration to regenerate
    .addConditionalEdges('prepareSqlRetry', continueToRequirements)

  return qaAgentGraph.compile()
}
