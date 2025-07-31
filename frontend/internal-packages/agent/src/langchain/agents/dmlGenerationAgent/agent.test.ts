import { describe, expect, it } from 'vitest'
import { DMLGenerationAgent } from './agent'

describe('DMLGenerationAgent', () => {
  it('should create an instance of DMLGenerationAgent', () => {
    const agent = new DMLGenerationAgent()
    expect(agent).toBeDefined()
    expect(agent).toBeInstanceOf(DMLGenerationAgent)
  })

  it('should have a generate method', () => {
    const agent = new DMLGenerationAgent()
    expect(agent.generate).toBeDefined()
    expect(typeof agent.generate).toBe('function')
  })

  it('should return dmlOperations from generate method', async () => {
    const agent = new DMLGenerationAgent()
    const input = {
      schemaSQL: 'CREATE TABLE users (id INT PRIMARY KEY);',
      formattedUseCases:
        'ID: test-uuid-123 | User registration use case: Allow users to create accounts',
      schemaContext: 'Mock schema context',
    }

    const result = await agent.generate(input)

    expect(result).toBeDefined()
    expect(result.dmlOperations).toBeDefined()
    expect(Array.isArray(result.dmlOperations)).toBe(true)
  })
})
