import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  type AddEnumOperation,
  enumOperations,
  isAddEnumOperation,
  isRemoveEnumOperation,
  isReplaceEnumCommentOperation,
  isReplaceEnumNameOperation,
  isReplaceEnumValuesOperation,
  type RemoveEnumOperation,
  type ReplaceEnumCommentOperation,
  type ReplaceEnumNameOperation,
  type ReplaceEnumValuesOperation,
} from '../enum.js'

// Helper to fetch the correct schema by validating a representative operation
const getSchemaFor = (operation: unknown) => {
  for (const schema of enumOperations) {
    if (v.safeParse(schema, operation).success) {
      return schema
    }
  }
  // biome-ignore lint/style/noNonNullAssertion: Test helper function with validated enum operations
  return enumOperations[0]!
}

describe('enumOperations', () => {
  describe('AddEnumOperation', () => {
    const validAddOperation: AddEnumOperation = {
      op: 'add',
      path: '/enums/status',
      value: {
        name: 'status',
        values: ['active', 'inactive'],
        comment: null,
      },
    }

    const addEnumSchema = getSchemaFor(validAddOperation)

    it('should validate a correct add enum operation', () => {
      const result = v.safeParse(addEnumSchema, validAddOperation)
      expect(result.success).toBe(true)
    })

    it('should invalidate add operation with wrong op', () => {
      const invalidOperation = { ...validAddOperation, op: 'replace' }
      const result = v.safeParse(addEnumSchema, invalidOperation)
      expect(result.success).toBe(false)
    })

    it('should invalidate add operation with wrong path format', () => {
      const invalidOperation = { ...validAddOperation, path: '/enums' }
      const result = v.safeParse(addEnumSchema, invalidOperation)
      expect(result.success).toBe(false)
    })

    it('should validate type guard', () => {
      expect(isAddEnumOperation(validAddOperation)).toBe(true)
      expect(isAddEnumOperation({ op: 'remove', path: '/enums/status' })).toBe(
        false,
      )
    })
  })

  describe('RemoveEnumOperation', () => {
    const validRemoveOperation: RemoveEnumOperation = {
      op: 'remove',
      path: '/enums/status',
    }

    const removeEnumSchema = getSchemaFor(validRemoveOperation)

    it('should validate a correct remove enum operation', () => {
      const result = v.safeParse(removeEnumSchema, validRemoveOperation)
      expect(result.success).toBe(true)
    })

    it('should invalidate remove operation with wrong op', () => {
      const invalidOperation = { ...validRemoveOperation, op: 'add' }
      const result = v.safeParse(removeEnumSchema, invalidOperation)
      expect(result.success).toBe(false)
    })

    it('should validate type guard', () => {
      expect(isRemoveEnumOperation(validRemoveOperation)).toBe(true)
      expect(
        isRemoveEnumOperation({
          op: 'add',
          path: '/enums/status',
          value: { name: 'status', values: [], comment: null },
        }),
      ).toBe(false)
    })
  })

  describe('ReplaceEnumNameOperation', () => {
    const validReplaceNameOperation: ReplaceEnumNameOperation = {
      op: 'replace',
      path: '/enums/status/name',
      value: 'user_status',
    }

    const replaceNameSchema = getSchemaFor(validReplaceNameOperation)

    it('should validate a correct replace enum name operation', () => {
      const result = v.safeParse(replaceNameSchema, validReplaceNameOperation)
      expect(result.success).toBe(true)
    })

    it('should invalidate replace name operation with wrong path', () => {
      const invalidOperation = {
        ...validReplaceNameOperation,
        path: '/enums/status',
      }
      const result = v.safeParse(replaceNameSchema, invalidOperation)
      expect(result.success).toBe(false)
    })

    it('should validate type guard', () => {
      expect(isReplaceEnumNameOperation(validReplaceNameOperation)).toBe(true)
      expect(
        isReplaceEnumNameOperation({
          op: 'replace',
          path: '/enums/status/values',
          value: ['active'],
        }),
      ).toBe(false)
    })
  })

  describe('ReplaceEnumValuesOperation', () => {
    const validReplaceValuesOperation: ReplaceEnumValuesOperation = {
      op: 'replace',
      path: '/enums/priority/values',
      value: ['low', 'medium', 'high'],
    }

    const replaceValuesSchema = getSchemaFor(validReplaceValuesOperation)

    it('should validate a correct replace enum values operation', () => {
      const result = v.safeParse(
        replaceValuesSchema,
        validReplaceValuesOperation,
      )
      expect(result.success).toBe(true)
    })

    it('should invalidate replace values operation with non-array value', () => {
      const invalidOperation = {
        ...validReplaceValuesOperation,
        value: 'not-an-array',
      }
      const result = v.safeParse(replaceValuesSchema, invalidOperation)
      expect(result.success).toBe(false)
    })

    it('should validate type guard', () => {
      expect(isReplaceEnumValuesOperation(validReplaceValuesOperation)).toBe(
        true,
      )
      expect(
        isReplaceEnumValuesOperation({
          op: 'replace',
          path: '/enums/status/name',
          value: 'status',
        }),
      ).toBe(false)
    })
  })

  describe('ReplaceEnumCommentOperation', () => {
    const validReplaceCommentOperation: ReplaceEnumCommentOperation = {
      op: 'replace',
      path: '/enums/role/comment',
      value: 'User role enumeration',
    }

    const validReplaceCommentNullOperation: ReplaceEnumCommentOperation = {
      op: 'replace',
      path: '/enums/role/comment',
      value: null,
    }

    const replaceCommentSchema = getSchemaFor(validReplaceCommentOperation)

    it('should validate a correct replace enum comment operation with string', () => {
      const result = v.safeParse(
        replaceCommentSchema,
        validReplaceCommentOperation,
      )
      expect(result.success).toBe(true)
    })

    it('should validate a correct replace enum comment operation with null', () => {
      const result = v.safeParse(
        replaceCommentSchema,
        validReplaceCommentNullOperation,
      )
      expect(result.success).toBe(true)
    })

    it('should invalidate replace comment operation with number value', () => {
      const invalidOperation = {
        ...validReplaceCommentOperation,
        value: 42,
      }
      const result = v.safeParse(replaceCommentSchema, invalidOperation)
      expect(result.success).toBe(false)
    })

    it('should validate type guard', () => {
      expect(isReplaceEnumCommentOperation(validReplaceCommentOperation)).toBe(
        true,
      )
      expect(
        isReplaceEnumCommentOperation(validReplaceCommentNullOperation),
      ).toBe(true)
      expect(
        isReplaceEnumCommentOperation({
          op: 'replace',
          path: '/enums/status/values',
          value: ['active'],
        }),
      ).toBe(false)
    })
  })

  describe('Path patterns', () => {
    it('should match valid enum base paths', () => {
      const validPaths = [
        '/enums/status',
        '/enums/user_role',
        '/enums/priority',
      ]
      const addEnumSchema = getSchemaFor({
        op: 'add' as const,
        path: '/enums/test',
        value: { name: 'test', values: ['a'], comment: null },
      })

      for (const path of validPaths) {
        const operation = {
          op: 'add' as const,
          path,
          value: { name: 'test', values: ['a'], comment: null },
        }
        expect(v.safeParse(addEnumSchema, operation).success).toBe(true)
      }
    })

    it('should reject invalid enum base paths', () => {
      const invalidPaths = [
        '/enums',
        '/enums/',
        '/enums/status/name',
        '/tables/users',
        '/enum/status',
      ]
      const addEnumSchema = getSchemaFor({
        op: 'add' as const,
        path: '/enums/test',
        value: { name: 'test', values: ['a'], comment: null },
      })

      for (const path of invalidPaths) {
        const operation = {
          op: 'add' as const,
          path,
          value: { name: 'test', values: ['a'], comment: null },
        }
        expect(v.safeParse(addEnumSchema, operation).success).toBe(false)
      }
    })

    it('should match valid enum property paths', () => {
      const validNamePaths = [
        '/enums/status/name',
        '/enums/user_role/name',
        '/enums/priority/name',
      ]
      const validValuesPaths = [
        '/enums/status/values',
        '/enums/user_role/values',
        '/enums/priority/values',
      ]
      const validCommentPaths = [
        '/enums/status/comment',
        '/enums/user_role/comment',
        '/enums/priority/comment',
      ]

      const replaceNameSchema = getSchemaFor({
        op: 'replace' as const,
        path: '/enums/test/name',
        value: 'name',
      })
      const replaceValuesSchema = getSchemaFor({
        op: 'replace' as const,
        path: '/enums/test/values',
        value: ['a'],
      })
      const replaceCommentSchema = getSchemaFor({
        op: 'replace' as const,
        path: '/enums/test/comment',
        value: 'comment',
      })

      for (const path of validNamePaths) {
        const operation = { op: 'replace' as const, path, value: 'new_name' }
        expect(v.safeParse(replaceNameSchema, operation).success).toBe(true)
      }

      for (const path of validValuesPaths) {
        const operation = {
          op: 'replace' as const,
          path,
          value: ['value1', 'value2'],
        }
        expect(v.safeParse(replaceValuesSchema, operation).success).toBe(true)
      }

      for (const path of validCommentPaths) {
        const operation = {
          op: 'replace' as const,
          path,
          value: 'A comment',
        }
        expect(v.safeParse(replaceCommentSchema, operation).success).toBe(true)
      }
    })
  })
})
