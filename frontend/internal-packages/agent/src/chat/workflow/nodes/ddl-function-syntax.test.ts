import { aColumn, aTable, type Schema } from '@liam-hq/db-structure'
import { describe, expect, it, vi } from 'vitest'
import { generateDDLNode } from './generateDDLNode'

describe('DDL Function Syntax Issues', () => {
  const mockLogger = {
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }

  const createMockState = (schemaData: Schema) => ({
    userInput: '',
    schemaData,
    logger: mockLogger,
    onNodeProgress: undefined,
    formattedHistory: '',
    retryCount: {},
    buildingSchemaId: 'test-schema',
    latestVersionNumber: 1,
    userId: 'test-user',
    designSessionId: 'test-session',
    repositories: {} as never,
    ddlStatements: '',
  })

  it('should generate DDL with proper function syntax for UUIDs and timestamps', async () => {
    // RED: This test will fail because DDL generator incorrectly quotes function calls
    const schemaWithFunctions: Schema = {
      tables: {
        tasks: aTable({
          name: 'tasks',
          columns: {
            id: aColumn({
              name: 'id',
              type: 'uuid',
              notNull: true,
              default: 'gen_random_uuid()', // This should NOT be quoted in the DDL
            }),
            title: aColumn({
              name: 'title',
              type: 'text',
              notNull: true,
            }),
            created_at: aColumn({
              name: 'created_at',
              type: 'timestamptz',
              notNull: true,
              default: 'now()', // This should NOT be quoted in the DDL
            }),
            updated_at: aColumn({
              name: 'updated_at',
              type: 'timestamptz',
              notNull: true,
              default: 'now()', // This should NOT be quoted in the DDL
            }),
          },
        }),
      },
    }

    const state = createMockState(schemaWithFunctions)
    const result = await generateDDLNode(state)

    // These assertions will FAIL because the current implementation quotes function calls
    expect(result.ddlStatements).toContain('DEFAULT gen_random_uuid()')
    expect(result.ddlStatements).not.toContain("DEFAULT 'gen_random_uuid()'")

    expect(result.ddlStatements).toContain('DEFAULT now()')
    expect(result.ddlStatements).not.toContain("DEFAULT 'now()'")

    // Should not contain any quoted function calls
    expect(result.ddlStatements).not.toMatch(/'[a-zA-Z_][a-zA-Z0-9_]*\(\)'/g)
  })

  it('should handle string literals correctly (still quoted)', async () => {
    const schemaWithStringDefaults: Schema = {
      tables: {
        users: aTable({
          name: 'users',
          columns: {
            status: aColumn({
              name: 'status',
              type: 'varchar',
              notNull: true,
              default: 'active', // This SHOULD be quoted as it's a string literal
            }),
            role: aColumn({
              name: 'role',
              type: 'varchar',
              notNull: true,
              default: 'user', // This SHOULD be quoted as it's a string literal
            }),
          },
        }),
      },
    }

    const state = createMockState(schemaWithStringDefaults)
    const result = await generateDDLNode(state)

    // String literals should still be quoted
    expect(result.ddlStatements).toContain("DEFAULT 'active'")
    expect(result.ddlStatements).toContain("DEFAULT 'user'")
  })

  it('should handle boolean and numeric defaults correctly', async () => {
    const schemaWithVariousDefaults: Schema = {
      tables: {
        settings: aTable({
          name: 'settings',
          columns: {
            enabled: aColumn({
              name: 'enabled',
              type: 'boolean',
              notNull: true,
              default: false, // Boolean should not be quoted
            }),
            count: aColumn({
              name: 'count',
              type: 'integer',
              notNull: true,
              default: 0, // Number should not be quoted
            }),
          },
        }),
      },
    }

    const state = createMockState(schemaWithVariousDefaults)
    const result = await generateDDLNode(state)

    // Boolean and numeric defaults should not be quoted
    expect(result.ddlStatements).toContain('DEFAULT FALSE')
    expect(result.ddlStatements).toContain('DEFAULT 0')
    expect(result.ddlStatements).not.toContain("DEFAULT 'FALSE'")
    expect(result.ddlStatements).not.toContain("DEFAULT '0'")
  })

  it('should handle various PostgreSQL function calls correctly', async () => {
    const schemaWithVariousFunctions: Schema = {
      tables: {
        logs: aTable({
          name: 'logs',
          columns: {
            timestamp_col: aColumn({
              name: 'timestamp_col',
              type: 'timestamptz',
              notNull: true,
              default: 'current_timestamp', // Function without parentheses
            }),
            random_val: aColumn({
              name: 'random_val',
              type: 'float',
              notNull: true,
              default: 'random()', // Function with parentheses
            }),
            date_col: aColumn({
              name: 'date_col',
              type: 'date',
              notNull: true,
              default: 'current_date', // Function without parentheses
            }),
          },
        }),
      },
    }

    const state = createMockState(schemaWithVariousFunctions)
    const result = await generateDDLNode(state)

    // Function calls should not be quoted
    expect(result.ddlStatements).toContain('DEFAULT current_timestamp')
    expect(result.ddlStatements).toContain('DEFAULT random()')
    expect(result.ddlStatements).toContain('DEFAULT current_date')

    // Should not contain quoted versions
    expect(result.ddlStatements).not.toContain("DEFAULT 'current_timestamp'")
    expect(result.ddlStatements).not.toContain("DEFAULT 'random()'")
    expect(result.ddlStatements).not.toContain("DEFAULT 'current_date'")
  })
})
