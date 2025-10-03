import { Annotation, MessagesAnnotation } from '@langchain/langgraph'
import type { Schema } from '@liam-hq/schema'
import type { AnalyzedRequirements } from '../../utils/schema/analyzedRequirements'
import type { TestCaseData } from '../distributeRequirements'
import type { Testcase } from '../types'

type SchemaIssue = {
  requirementId: string
  description: string
}

export const schemaIssuesAnnotation = Annotation<Array<SchemaIssue>>({
  reducer: (prev, next) => prev.concat(next),
  default: () => [],
})

export const testcaseAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  currentTestcase: Annotation<TestCaseData>,
  schemaData: Annotation<Schema>,
  analyzedRequirements: Annotation<AnalyzedRequirements>({
    reducer: (x, y) => y ?? x,
  }),
  testcases: Annotation<Testcase[]>({
    reducer: (prev, next) => prev.concat(next),
  }),
  schemaIssues: schemaIssuesAnnotation,
})
