import { describe, expect, it } from 'vitest'
import {
  DML_GENERATION_SYSTEM_PROMPT,
  DML_GENERATION_USER_PROMPT,
} from './prompts'

describe('DML Generation Prompts', () => {
  describe('System Prompt', () => {
    it('should be a non-empty string', () => {
      expect(DML_GENERATION_SYSTEM_PROMPT).toBeDefined()
      expect(typeof DML_GENERATION_SYSTEM_PROMPT).toBe('string')
      expect(DML_GENERATION_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    })

    it('should contain key instructions for DML generation', () => {
      expect(DML_GENERATION_SYSTEM_PROMPT).toContain('INSERT')
      expect(DML_GENERATION_SYSTEM_PROMPT).toContain('schema')
      expect(DML_GENERATION_SYSTEM_PROMPT).toContain('use cases')
    })

    it('should include formatting guidelines', () => {
      expect(DML_GENERATION_SYSTEM_PROMPT).toContain('format')
      expect(DML_GENERATION_SYSTEM_PROMPT).toContain('comments')
    })
  })

  describe('User Prompt', () => {
    it('should be a non-empty string', () => {
      expect(DML_GENERATION_USER_PROMPT).toBeDefined()
      expect(typeof DML_GENERATION_USER_PROMPT).toBe('string')
      expect(DML_GENERATION_USER_PROMPT.length).toBeGreaterThan(0)
    })

    it('should contain placeholders for schema and use cases', () => {
      expect(DML_GENERATION_USER_PROMPT).toContain('{schemaSQL}')
      expect(DML_GENERATION_USER_PROMPT).toContain('{formattedUseCases}')
    })

    it('should have proper structure with sections', () => {
      expect(DML_GENERATION_USER_PROMPT).toContain('Schema:')
      expect(DML_GENERATION_USER_PROMPT).toContain('Use Cases:')
    })
  })
})
