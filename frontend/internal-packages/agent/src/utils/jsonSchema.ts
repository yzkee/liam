import type { JSONSchema } from '@langchain/core/utils/json_schema'
import { toJsonSchema as valibotToJsonSchema } from '@valibot/to-json-schema'
import type { BaseIssue, BaseSchema } from 'valibot'

/**
 * Recursively adds additionalProperties: false to all object schemas
 * to comply with OpenAI's strict mode requirements.
 */
function addAdditionalPropertiesFalse(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  // Handle arrays recursively
  if (Array.isArray(schema)) {
    return schema.map(addAdditionalPropertiesFalse)
  }

  // Create a new object to avoid mutating the original
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(schema)) {
    // Recursively process nested schemas
    result[key] = addAdditionalPropertiesFalse(value)
  }

  // Add additionalProperties: false to object schemas
  if (result['type'] === 'object' && !('additionalProperties' in result)) {
    result['additionalProperties'] = false
  }

  // CRITICAL FIX for OpenAI strict mode:
  // Objects with only additionalProperties (no properties) need empty properties object
  if (
    result['type'] === 'object' &&
    'additionalProperties' in result &&
    !('properties' in result)
  ) {
    result['properties'] = {}
  }

  return result
}

/**
 * Converts a Valibot schema to a JSONSchema format compatible with LangChain.
 *
 * This is a wrapper around @valibot/to-json-schema that handles the type
 * conversion from JSONSchema7 to the more general JSONSchema type expected
 * by LangChain tools. It also adds additionalProperties: false to all object
 * schemas to comply with OpenAI's strict mode requirements.
 */
export function toJsonSchema<
  TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>,
>(schema: TSchema): JSONSchema {
  const jsonSchema = valibotToJsonSchema(schema)
  // Add additionalProperties: false recursively for OpenAI strict mode
  const strictSchema = addAdditionalPropertiesFalse(jsonSchema)
  // The type assertion here is safe because JSONSchema7 is a subset of JSONSchema
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return strictSchema as JSONSchema
}
