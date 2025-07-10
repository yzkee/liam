import { describe, expect, it, vi } from 'vitest'
import type { NodeLogger } from '../../../utils/nodeLogger'
import { DMLGenerationAgent } from './agent'

describe('DMLGenerationAgent', () => {
  const mockLogger: NodeLogger = {
    debug: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }

  it('should create an instance of DMLGenerationAgent', () => {
    const agent = new DMLGenerationAgent({ logger: mockLogger })
    expect(agent).toBeDefined()
    expect(agent).toBeInstanceOf(DMLGenerationAgent)
  })

  it('should have a generate method', () => {
    const agent = new DMLGenerationAgent({ logger: mockLogger })
    expect(agent.generate).toBeDefined()
    expect(typeof agent.generate).toBe('function')
  })

  it('should return dmlStatements from generate method', async () => {
    const agent = new DMLGenerationAgent({ logger: mockLogger })
    const input = {
      schemaSQL: 'CREATE TABLE users (id INT PRIMARY KEY);',
      formattedUseCases: 'User registration use case',
    }

    const result = await agent.generate(input)

    expect(result).toBeDefined()
    expect(result.dmlStatements).toBeDefined()
    expect(typeof result.dmlStatements).toBe('string')
  })
})
