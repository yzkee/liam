import { Annotation, MessagesAnnotation } from '@langchain/langgraph'
import type { Schema } from '@liam-hq/schema'
import type { TestCaseData } from '../distributeRequirements'
import type { Testcase } from '../types'

type SchemaIssue = {
  testcaseId: string
  description: string
}

export const schemaIssuesAnnotation = Annotation<Array<SchemaIssue>>({
  reducer: (prev, next) => prev.concat(next),
  default: () => [],
})

export type GeneratedSql = {
  testcaseId: string
  sql: string
}

export const generatedSqlsAnnotation = Annotation<Array<GeneratedSql>>({
  reducer: (prev, next) => prev.concat(next),
  default: () => [],
})

export const testcaseAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  currentTestcase: Annotation<TestCaseData>,
  schemaData: Annotation<Schema>,
  goal: Annotation<string>,
  testcases: Annotation<Testcase[]>({
    reducer: (prev, next) => prev.concat(next),
  }),
  schemaIssues: schemaIssuesAnnotation,
  generatedSqls: generatedSqlsAnnotation,
})
