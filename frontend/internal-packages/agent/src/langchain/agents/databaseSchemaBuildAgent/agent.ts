import {
  AIMessage,
  type BaseMessage,
  SystemMessage,
} from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { operationsSchema } from '@liam-hq/db-structure'
import { toJsonSchema } from '@valibot/to-json-schema'
import { ok, Result, ResultAsync } from 'neverthrow'
import * as v from 'valibot'
import { createLangfuseHandler } from '../../utils/telemetry'
import { type DesignAgentPromptVariables, designAgentPrompt } from './prompts'

// Define the response schema
const designResponseSchema = v.object({
  message: v.string(),
  operations: operationsSchema,
})

export type DesignResponse = v.InferOutput<typeof designResponseSchema>
export type InvokeResult = {
  message: AIMessage
  operations: DesignResponse['operations']
}

const jsonSchema = toJsonSchema(designResponseSchema)
const model = new ChatOpenAI({
  model: 'o4-mini',
  callbacks: [createLangfuseHandler()],
}).withStructuredOutput(jsonSchema)

export const invokeDesignAgent = (
  variables: DesignAgentPromptVariables,
  messages: BaseMessage[],
): ResultAsync<InvokeResult, Error> => {
  const formatPrompt = ResultAsync.fromSafePromise(
    designAgentPrompt.format(variables),
  )
  const invoke = ResultAsync.fromThrowable(
    (systemPrompt: string) =>
      model.invoke([new SystemMessage(systemPrompt), ...messages]),
    (error) => new Error(`Failed to invoke design agent: ${error}`),
  )
  const parse = Result.fromThrowable(
    (response: unknown) => v.parse(designResponseSchema, response),
    (error) => new Error(`Failed to parse design agent response: ${error}`),
  )

  return formatPrompt
    .andThen(invoke)
    .andThen(parse)
    .andThen((parsed) =>
      ok({
        message: new AIMessage(parsed.message),
        operations: parsed.operations,
      }),
    )
}
