import * as v from 'valibot'
import { schemaSchema } from '../../schema/index.js'
import type { ProcessResult } from '../types.js'

export const processor = async (str: string): Promise<ProcessResult> => {
  try {
    const parsed = JSON.parse(str)
    const result = v.safeParse(schemaSchema, parsed)

    if (result.success) {
      return {
        value: result.output,
        errors: [],
      }
    }

    return {
      value: { tables: {}, enums: {}, extensions: {} },
      errors: [
        new Error(
          `Invalid Liam Schema format: ${JSON.stringify(result.issues)}`,
        ),
      ],
    }
  } catch (error) {
    return {
      value: { tables: {}, enums: {}, extensions: {} },
      errors: [
        error instanceof Error ? error : new Error('Failed to parse JSON'),
      ],
    }
  }
}
