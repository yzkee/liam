import { Annotation, END, MessagesAnnotation } from '@langchain/langgraph'
import type { AnalyzedRequirements } from '@liam-hq/artifact'
import type { Schema } from '@liam-hq/schema'
import { schemaIssuesAnnotation } from './qa-agent/testcaseGeneration/testcaseAnnotation'

export const workflowAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  analyzedRequirements: Annotation<AnalyzedRequirements>({
    reducer: (x, y) => y ?? x,
    default: () => ({
      goal: '',
      testcases: {},
    }),
  }),
  schemaData: Annotation<Schema>,
  organizationId: Annotation<string>,
  userId: Annotation<string>,
  designSessionId: Annotation<string>,
  schemaIssues: schemaIssuesAnnotation,

  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),
})
