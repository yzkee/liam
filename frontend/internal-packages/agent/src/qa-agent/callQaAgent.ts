import type { RunnableConfig } from '@langchain/core/runnables'
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint'
import type { WorkflowState } from '../types'
import type { TestCase } from '../utils/schema/analyzedRequirements'
import { createQaAgentGraph } from './createQaAgentGraph'
import type { GeneratedSql } from './testcaseGeneration/testcaseAnnotation'

const updateTestcaseWithSql = (
  testcases: Record<string, TestCase[]>,
  testcaseId: string,
  sql: string,
): Record<string, TestCase[]> => {
  for (const category of Object.keys(testcases)) {
    const categoryTestcases = testcases[category]
    if (!categoryTestcases) continue

    const testcaseIndex = categoryTestcases.findIndex(
      (tc) => tc.id === testcaseId,
    )

    if (testcaseIndex !== -1) {
      const currentTestcase = categoryTestcases[testcaseIndex]
      if (!currentTestcase) continue

      return {
        ...testcases,
        [category]: categoryTestcases.map((tc, index) =>
          index === testcaseIndex ? { ...tc, sql } : tc,
        ),
      }
    }
  }

  return testcases
}

const updateAnalyzedRequirementsWithSqls = (
  state: WorkflowState,
  generatedSqls: GeneratedSql[],
) => {
  const updatedTestcases = generatedSqls.reduce(
    (testcases, { testcaseId, sql }) =>
      updateTestcaseWithSql(testcases, testcaseId, sql),
    state.analyzedRequirements.testcases,
  )

  return {
    ...state.analyzedRequirements,
    testcases: updatedTestcases,
  }
}

export const callQaAgent = async (
  state: WorkflowState,
  config: RunnableConfig,
  checkpointer?: BaseCheckpointSaver,
) => {
  const qaAgentSubgraph = createQaAgentGraph(checkpointer)
  const modifiedState = { ...state, messages: [] }
  const output = await qaAgentSubgraph.invoke(modifiedState, config)

  const analyzedRequirements = updateAnalyzedRequirementsWithSqls(
    state,
    output.generatedSqls,
  )

  return {
    ...state,
    ...output,
    analyzedRequirements,
  }
}
