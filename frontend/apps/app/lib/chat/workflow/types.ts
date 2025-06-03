import type { Schema } from '@liam-hq/db-structure'

export type AgentName = 'databaseSchemaAskAgent' | 'databaseSchemaBuildAgent'

export type WorkflowState = {
  mode?: 'Ask' | 'Build'
  userInput: string
  generatedAnswer?: string
  finalResponse?: string
  history: string[]
  schemaData?: Schema
  projectId?: string
  error?: string

  // Additional fields for workflow processing
  schemaText?: string
  formattedChatHistory?: string
  agentName?: AgentName
}
