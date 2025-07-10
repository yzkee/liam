import { describe, expect, it } from 'vitest'
import type { WorkflowState } from './types'

describe('WorkflowState types', () => {
  it('should include dmlStatements field', () => {
    const state: Partial<WorkflowState> = {
      dmlStatements: '-- INSERT statements here',
    }

    expect(state.dmlStatements).toBeDefined()
    expect(typeof state.dmlStatements).toBe('string')
  })

  it('should allow undefined dmlStatements', () => {
    const state: Partial<WorkflowState> = {
      dmlStatements: undefined,
    }

    expect(state.dmlStatements).toBeUndefined()
  })

  it('should have dmlStatements as optional field', () => {
    const state: Partial<WorkflowState> = {}

    // This should compile without error
    expect(state.dmlStatements).toBeUndefined()
  })
})
