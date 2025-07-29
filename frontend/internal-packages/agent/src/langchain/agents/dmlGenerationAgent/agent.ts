import { type BaseMessage, SystemMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { toJsonSchema } from '@valibot/to-json-schema'
import { ResultAsync } from 'neverthrow'
import * as v from 'valibot'
import type { ChatAgent } from '../../utils/types'
import { formatDMLGenerationPrompts } from './prompts'

const DMLGenerationAgentInputSchema = v.object({
  schemaSQL: v.string(),
  formattedUseCases: v.string(),
  schemaContext: v.string(),
})

const DmlOperationSchema = v.object({
  useCaseId: v.string(),
  operation_type: v.picklist(['INSERT', 'UPDATE', 'DELETE', 'SELECT']),
  sql: v.string(),
  description: v.optional(v.string()),
})

const DMLGenerationAgentOutputSchema = v.object({
  dmlOperations: v.array(DmlOperationSchema),
})

type DMLGenerationAgentInput = v.InferInput<
  typeof DMLGenerationAgentInputSchema
>
type DMLGenerationAgentOutput = v.InferOutput<
  typeof DMLGenerationAgentOutputSchema
>

export class DMLGenerationAgent
  implements ChatAgent<DMLGenerationAgentInput, DMLGenerationAgentOutput>
{
  async generate(
    input: DMLGenerationAgentInput,
  ): Promise<DMLGenerationAgentOutput> {
    const { systemMessage, humanMessage } = formatDMLGenerationPrompts({
      schema: input.schemaSQL,
      requirements: input.formattedUseCases,
      chat_history: '',
      user_message:
        'Generate comprehensive DML statements for testing the provided schema.',
    })

    const model = new ChatOpenAI({
      model: 'gpt-4o',
      temperature: 0.1,
    })

    const messages: BaseMessage[] = [
      new SystemMessage(systemMessage),
      new SystemMessage(humanMessage),
    ]

    const modelWithStructuredOutput = model.withStructuredOutput(
      toJsonSchema(DMLGenerationAgentOutputSchema),
      {
        name: 'dml_operations',
      },
    )

    const result = await ResultAsync.fromPromise(
      modelWithStructuredOutput.invoke(messages),
      (error: unknown) => new Error(`LLM invocation failed: ${String(error)}`),
    )

    if (result.isErr()) {
      console.error('Error generating structured DML operations:', result.error)
      return {
        dmlOperations: [],
      }
    }

    const parseResult = ResultAsync.fromPromise(
      Promise.resolve(v.parse(DMLGenerationAgentOutputSchema, result.value)),
      (error: unknown) => new Error(`Parsing failed: ${String(error)}`),
    )

    const finalResult = await parseResult

    if (finalResult.isErr()) {
      console.error('Error parsing DML operations result:', finalResult.error)
      return {
        dmlOperations: [],
      }
    }

    return finalResult.value
  }
}
