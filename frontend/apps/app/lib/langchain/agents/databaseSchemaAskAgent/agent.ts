import { ChatOpenAI } from '@langchain/openai'
import { createLangfuseHandler } from '../../utils/telemetry'
import type { BasePromptVariables, ChatAgent } from '../../utils/types'
import { askAgentPrompt } from './prompts'

export class DatabaseSchemaAskAgent implements ChatAgent {
  private model: ChatOpenAI

  constructor() {
    this.model = new ChatOpenAI({
      model: 'gpt-4o-mini-2024-07-18',
      temperature: 0.7,
      callbacks: [createLangfuseHandler()],
    })
  }

  async generate(variables: BasePromptVariables): Promise<string> {
    const formattedPrompt = await askAgentPrompt.format(variables)
    const response = await this.model.invoke(formattedPrompt)
    return response.content as string
  }

  async *stream(variables: BasePromptVariables): AsyncGenerator<string> {
    const formattedPrompt = await askAgentPrompt.format(variables)
    const stream = await this.model.stream(formattedPrompt)

    for await (const chunk of stream) {
      if (chunk.content) {
        yield chunk.content as string
      }
    }
  }
}
