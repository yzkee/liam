import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateSqlSyntax } from './validateSqlSyntax'

// Mock dependencies
vi.mock('@liam-hq/schema/parser', () => ({
  pgParse: vi.fn(),
}))

import { pgParse } from '@liam-hq/schema/parser'

describe('validateSqlSyntax', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses pgParse to validate SQL syntax', async () => {
    const sql = 'SELECT * FROM users;'

    vi.mocked(pgParse).mockResolvedValue({
      error: null,
      parse_tree: { version: 160001, stmts: [] },
      stderr_buffer: '',
    })

    await validateSqlSyntax(sql)

    expect(pgParse).toHaveBeenCalledWith(sql)
  })

  it('returns undefined when pgParse returns no error', async () => {
    const sql = 'SELECT * FROM users;'

    vi.mocked(pgParse).mockResolvedValue({
      error: null,
      parse_tree: { version: 160001, stmts: [] },
      stderr_buffer: '',
    })

    const result = await validateSqlSyntax(sql)
    expect(result).toBeUndefined()
  })

  it('returns error message when pgParse returns syntax error', async () => {
    const sql = 'SELECT * FORM users;' // intentional typo

    vi.mocked(pgParse).mockResolvedValue({
      error: {
        message: 'syntax error at or near "FORM"',
        funcname: 'parser',
        filename: 'parser.c',
        lineno: 100,
        cursorpos: 15,
        context: '',
      },
      parse_tree: { version: 160001, stmts: [] },
      stderr_buffer: '',
    })

    const result = await validateSqlSyntax(sql)
    expect(result).toContain('SQL syntax error: syntax error at or near "FORM"')
  })

  it('includes retry instruction in error message', async () => {
    const sql = 'INVALID SQL'

    vi.mocked(pgParse).mockResolvedValue({
      error: {
        message: 'syntax error',
        funcname: 'parser',
        filename: 'parser.c',
        lineno: 100,
        cursorpos: 0,
        context: '',
      },
      parse_tree: { version: 160001, stmts: [] },
      stderr_buffer: '',
    })

    const result = await validateSqlSyntax(sql)
    expect(result).toContain('Fix the SQL and retry')
  })
})
