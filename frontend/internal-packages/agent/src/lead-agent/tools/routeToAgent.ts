import { tool } from '@langchain/core/tools'
import type { JSONSchema } from '@langchain/core/utils/json_schema'
import { Command } from '@langchain/langgraph'
import { toJsonSchema } from '@valibot/to-json-schema'
import * as v from 'valibot'
import { WorkflowTerminationError } from '../../shared/errorHandling'

const inputSchema = v.object({
  targetAgent: v.picklist(['pmAgent']),
})

// toJsonSchema returns a JSONSchema7, which is not assignable to JSONSchema
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const toolSchema = toJsonSchema(inputSchema) as JSONSchema

export const routeToAgent = tool(
  async (input: unknown): Promise<Command> => {
    const inputParseResult = v.safeParse(inputSchema, input)
    if (!inputParseResult.success) {
      const errorMessage = inputParseResult.issues
        .map((issue) => issue.message)
        .join(', ')
      throw new WorkflowTerminationError(
        new Error(`Invalid input structure: ${errorMessage}`),
        'routeToAgent',
      )
    }

    return new Command({
      update: {
        next: inputParseResult.output.targetAgent,
      },
    })
  },
  {
    name: 'routeToAgent',
    description: 'Route the user request to the appropriate specialized agent',
    schema: toolSchema,
  },
)
