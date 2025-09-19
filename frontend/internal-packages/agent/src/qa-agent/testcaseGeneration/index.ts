import { END, START, StateGraph } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint'
import { RETRY_POLICY } from '../../utils/errorHandling'
import { generateTestcaseNode } from './generateTestcaseNode'
import { routeAfterGenerate } from './routeAfterGenerate'
import { routeAfterSave } from './routeAfterSave'
import { saveToolNode } from './saveToolNode'
import { testcaseAnnotation } from './testcaseAnnotation'
import { validateSchemaRequirementsNode } from './validateSchemaRequirementsNode'

export const createTestcaseGenerationGraph = (
  checkpointer?: BaseCheckpointSaver,
) => {
  const graph = new StateGraph(testcaseAnnotation)

  graph
    .addNode('validateSchemaRequirements', validateSchemaRequirementsNode, {
      retryPolicy: RETRY_POLICY,
      ends: ['generateTestcase', END],
    })
    .addNode('generateTestcase', generateTestcaseNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('invokeSaveTool', saveToolNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addEdge(START, 'validateSchemaRequirements')
    .addConditionalEdges('generateTestcase', routeAfterGenerate, {
      invokeSaveTool: 'invokeSaveTool',
      [END]: END,
    })
    .addConditionalEdges('invokeSaveTool', routeAfterSave, {
      generateTestcase: 'generateTestcase',
      [END]: END,
    })

  return checkpointer ? graph.compile({ checkpointer }) : graph.compile()
}

export const testcaseGeneration = createTestcaseGenerationGraph()
