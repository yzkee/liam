import { describe, expect, it } from 'vitest'
import { DMLGenerationAgent } from './agent'

describe('DMLGenerationAgent', () => {
  it('should create an instance of DMLGenerationAgent', () => {
    const agent = new DMLGenerationAgent()
    expect(agent).toBeInstanceOf(DMLGenerationAgent)
  })
})
