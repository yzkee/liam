import { Annotation, END, MessagesAnnotation } from '@langchain/langgraph'
import type { AnalyzedRequirements } from '@liam-hq/artifact'
import type { Schema } from '@liam-hq/schema'
import {
  generatedSqlsAnnotation,
  schemaIssuesAnnotation,
} from '../testcaseGeneration/testcaseAnnotation'

/**
 * QA Agent subgraph specific state annotation
 * Contains only the fields actually used by QA Agent nodes
 */
export const qaAgentAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  schemaData: Annotation<Schema>({
    // Read-only field: QA agent should not modify schema data, only read it
    // Using identity reducer to maintain existing value and avoid InvalidUpdateError
    // when multiple subgraphs pass the same schemaData back to parent state
    reducer: (x) => x,
  }),
  analyzedRequirements: Annotation<AnalyzedRequirements>({
    reducer: (x, y) => y ?? x,
    default: () => ({
      goal: '',
      testcases: {},
    }),
  }),
  designSessionId: Annotation<string>,
  schemaIssues: schemaIssuesAnnotation,
  generatedSqls: generatedSqlsAnnotation,
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),
})

export type QaAgentState = typeof qaAgentAnnotation.State
