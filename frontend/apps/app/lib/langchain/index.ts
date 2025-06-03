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

// Main LangChain manager class for compatibility with Mastra API
class LangChainManager {
  getAgent(agentName: string) {
    switch (agentName) {
      case 'databaseSchemaAskAgent':
        return agents.databaseSchemaAskAgent
      case 'databaseSchemaBuildAgent':
        return agents.databaseSchemaBuildAgent
      default:
        return null
    }
  }
}

// Export the manager instance
export const langchain = new LangChainManager()
