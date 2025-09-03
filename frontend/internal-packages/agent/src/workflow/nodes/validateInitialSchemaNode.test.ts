import { describe, expect, it } from 'vitest'
import { validateInitialSchemaNode } from './validateInitialSchemaNode'

describe('validateInitialSchemaNode', () => {
  it('should be defined', () => {
    expect(validateInitialSchemaNode).toBeDefined()
    expect(typeof validateInitialSchemaNode).toBe('function')
  })
})
