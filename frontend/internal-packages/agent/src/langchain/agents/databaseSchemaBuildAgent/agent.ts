import { ChatOpenAI } from '@langchain/openai'
import { createLangfuseHandler } from '../../utils/telemetry'
import type { BasePromptVariables, ChatAgent } from '../../utils/types'
import { buildAgentPrompt } from './prompts'

export class DatabaseSchemaBuildAgent implements ChatAgent {
  private model: ChatOpenAI

  constructor() {
    this.model = new ChatOpenAI({
      model: 'o3',
      callbacks: [createLangfuseHandler()],
    })
  }

  async generate(variables: BasePromptVariables): Promise<string> {
    const formattedPrompt = await buildAgentPrompt.format(variables)
    const response = await this.model.invoke(formattedPrompt)
    return response.content as string
  }
}
