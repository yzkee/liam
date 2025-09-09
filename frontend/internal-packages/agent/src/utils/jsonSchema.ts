import type { JSONSchema } from '@langchain/core/utils/json_schema'
import { toJsonSchema as valibotToJsonSchema } from '@valibot/to-json-schema'
import type { BaseIssue, BaseSchema } from 'valibot'

/**
 * Infers the JSON Schema type from a const value
 */
function inferTypeFromConst(constValue: unknown): string | undefined {
  if (constValue === null) return 'null'
  if (typeof constValue === 'string') return 'string'
  if (typeof constValue === 'number') return 'number'
  if (typeof constValue === 'boolean') return 'boolean'
  if (Array.isArray(constValue)) return 'array'
  if (typeof constValue === 'object') return 'object'
  return undefined
}

/**
 * Infers the JSON Schema type from enum values
 */
function inferTypeFromEnum(enumValues: unknown[]): string | undefined {
  if (!enumValues || enumValues.length === 0) return undefined
  const firstValue = enumValues[0]
  if (firstValue === null) return 'null'
  if (typeof firstValue === 'string') return 'string'
  if (typeof firstValue === 'number') return 'number'
  if (typeof firstValue === 'boolean') return 'boolean'
  return undefined
}

/**
 * Processes object schema for OpenAI strict mode compliance
 */
function processObjectSchema(result: Record<string, unknown>): void {
  if (result['type'] !== 'object') return

  // Add additionalProperties: false to object schemas
  if (!('additionalProperties' in result)) {
    result['additionalProperties'] = false
  }

  // CRITICAL FIX for OpenAI strict mode:
  // Objects with only additionalProperties (no properties) need empty properties object
  if ('additionalProperties' in result && !('properties' in result)) {
    result['properties'] = {}
  }
}

/**
 * Adds missing type fields for const and enum schemas
 */
function addMissingTypes(result: Record<string, unknown>): void {
  // Already has type, nothing to do
  if ('type' in result) return

  // Ensure const has the correct type inferred from its value
  if ('const' in result) {
    const inferredType = inferTypeFromConst(result['const'])
    if (inferredType) {
      result['type'] = inferredType
    }
    return
  }

  // Ensure enum has the correct type inferred from its values
  if ('enum' in result) {
    const enumValues = result['enum']
    if (Array.isArray(enumValues)) {
      const inferredType = inferTypeFromEnum(enumValues)
      if (inferredType) {
        result['type'] = inferredType
      }
    }
  }
}

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

  // Recursively process nested schemas
  for (const [key, value] of Object.entries(schema)) {
    result[key] = addAdditionalPropertiesFalse(value)
  }

  // Apply OpenAI strict mode transformations
  processObjectSchema(result)
  addMissingTypes(result)

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
