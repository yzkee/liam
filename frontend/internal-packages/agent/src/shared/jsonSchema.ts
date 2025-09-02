import type { JSONSchema } from '@langchain/core/utils/json_schema'
import { toJsonSchema as valibotToJsonSchema } from '@valibot/to-json-schema'
import type { BaseSchema } from 'valibot'

/**
 * Converts a Valibot schema to a JSONSchema format compatible with LangChain.
 *
 * This is a wrapper around @valibot/to-json-schema that handles the type
 * conversion from JSONSchema7 to the more general JSONSchema type expected
 * by LangChain tools.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for LangChain BaseSchema type compatibility
export function toJsonSchema<TSchema extends BaseSchema<any, any, any>>(
  schema: TSchema,
): JSONSchema {
  // The type assertion here is safe because JSONSchema7 is a subset of JSONSchema
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return valibotToJsonSchema(schema) as JSONSchema
}
