import type { BasePromptVariables } from './utils/types'

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
