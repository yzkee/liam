import { DatabaseSchemaAskAgent, DatabaseSchemaBuildAgent } from './agents'
import type { BasePromptVariables } from './utils/types'

// Create agent instances
const databaseSchemaAskAgent = new DatabaseSchemaAskAgent()
const databaseSchemaBuildAgent = new DatabaseSchemaBuildAgent()

// Agent registry for compatibility with existing code
const agents = {
  databaseSchemaAskAgent,
  databaseSchemaBuildAgent,
} as const

// Helper function to create prompt variables
export const createPromptVariables = (
  schemaText: string,
  userMessage: string,
  history: [string, string][] = [],
): BasePromptVariables => {
  const formattedChatHistory =
    history.length > 0
      ? history.map(([role, content]) => `${role}: ${content}`).join('\n')
      : 'No previous conversation.'

  return {
    schema_text: schemaText,
    chat_history: formattedChatHistory,
    user_message: userMessage,
  }
}

// Define AgentName as a union of agent keys
export type AgentName = keyof typeof agents

// Direct agent getter function with error handling
export const getAgent = (agentName: AgentName) => {
  const agent = agents[agentName]

  if (!agent) {
    throw new Error(`${agentName} not found in LangChain instance`)
  }

  return agent
}
