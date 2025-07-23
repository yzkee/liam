import { type BaseMessage, SystemMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { toJsonSchema } from '@valibot/to-json-schema'
import * as v from 'valibot'
import { createLangfuseHandler } from '../../utils/telemetry'
import { PM_ANALYSIS_SYSTEM_MESSAGE } from './prompts'

const requirementsAnalysisSchema = v.object({
  businessRequirement: v.string(),
  functionalRequirements: v.record(v.string(), v.array(v.string())),
  nonFunctionalRequirements: v.record(v.string(), v.array(v.string())),
})

type AnalysisResponse = v.InferOutput<typeof requirementsAnalysisSchema>

export class PMAnalysisAgent {
  private analysisModel: ReturnType<ChatOpenAI['withStructuredOutput']>

  constructor() {
    const baseModel = new ChatOpenAI({
      model: 'o4-mini',
      callbacks: [createLangfuseHandler()],
    })

    // Convert valibot schema to JSON Schema and bind to model
    const analysisJsonSchema = toJsonSchema(requirementsAnalysisSchema)

    this.analysisModel = baseModel.withStructuredOutput(analysisJsonSchema)
  }

  async generate(messages: BaseMessage[]): Promise<AnalysisResponse> {
    const allMessages = [
      new SystemMessage(PM_ANALYSIS_SYSTEM_MESSAGE),
      ...messages,
    ]

    const rawResponse = await this.analysisModel.invoke(allMessages)
    return v.parse(requirementsAnalysisSchema, rawResponse)
  }
}
