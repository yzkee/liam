import { describe, expect, it } from 'vitest'
import { aColumn, aSchema, aTable } from '../../schema/factories.js'
import { postgresqlSchemaDeparser } from './schemaDeparser.js'

describe('DDL Function Syntax', () => {
  describe('PostgreSQL function calls in default values', () => {
    it('should generate DDL with proper function syntax for UUIDs and timestamps', () => {
      const schema = aSchema({
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
      })

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      
      // Function calls should not be quoted
      expect(result.value).toContain('DEFAULT gen_random_uuid()')
      expect(result.value).not.toContain("DEFAULT 'gen_random_uuid()'")

      expect(result.value).toContain('DEFAULT now()')
      expect(result.value).not.toContain("DEFAULT 'now()'")

      // Should not contain any quoted function calls
      expect(result.value).not.toMatch(/'[a-zA-Z_][a-zA-Z0-9_]*\(\)'/g)
    })

    it('should handle string literals correctly (still quoted)', () => {
      const schema = aSchema({
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
      })

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      
      // String literals should still be quoted
      expect(result.value).toContain("DEFAULT 'active'")
      expect(result.value).toContain("DEFAULT 'user'")
    })

    it('should handle boolean and numeric defaults correctly', () => {
      const schema = aSchema({
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
      })

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      
      // Boolean and numeric defaults should not be quoted
      expect(result.value).toContain('DEFAULT FALSE')
      expect(result.value).toContain('DEFAULT 0')
      expect(result.value).not.toContain("DEFAULT 'FALSE'")
      expect(result.value).not.toContain("DEFAULT '0'")
    })

    it('should handle various PostgreSQL function calls correctly', () => {
      const schema = aSchema({
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
      })

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      
      // Function calls should not be quoted
      expect(result.value).toContain('DEFAULT current_timestamp')
      expect(result.value).toContain('DEFAULT random()')
      expect(result.value).toContain('DEFAULT current_date')

      // Should not contain quoted versions
      expect(result.value).not.toContain("DEFAULT 'current_timestamp'")
      expect(result.value).not.toContain("DEFAULT 'random()'")
      expect(result.value).not.toContain("DEFAULT 'current_date'")
    })

    it('should handle complex function calls with arguments', () => {
      const schema = aSchema({
        tables: {
          analytics: aTable({
            name: 'analytics',
            columns: {
              timestamp_col: aColumn({
                name: 'timestamp_col',
                type: 'timestamptz',
                notNull: true,
                default: 'extract(epoch from now())', // Function with nested function call
              }),
              age_col: aColumn({
                name: 'age_col',
                type: 'interval',
                notNull: true,
                default: 'age(current_date)', // Function with argument
              }),
              truncated_date: aColumn({
                name: 'truncated_date',
                type: 'date',
                notNull: true,
                default: 'date_trunc(\'day\', now())', // Function with quoted argument
              }),
            },
          }),
        },
      })

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      
      // Complex function calls should not be quoted
      expect(result.value).toContain('DEFAULT extract(epoch from now())')
      expect(result.value).toContain('DEFAULT age(current_date)')
      expect(result.value).toContain('DEFAULT date_trunc(\'day\', now())')

      // Should not contain quoted versions
      expect(result.value).not.toContain("DEFAULT 'extract(epoch from now())'")
      expect(result.value).not.toContain("DEFAULT 'age(current_date)'")
      expect(result.value).not.toContain("DEFAULT 'date_trunc(\\'day\\', now())'")
    })

    it('should handle UUID generation functions correctly', () => {
      const schema = aSchema({
        tables: {
          entities: aTable({
            name: 'entities',
            columns: {
              id_v4: aColumn({
                name: 'id_v4',
                type: 'uuid',
                notNull: true,
                default: 'uuid_generate_v4()', // UUID extension function
              }),
              id_v1: aColumn({
                name: 'id_v1',
                type: 'uuid',
                notNull: true,
                default: 'uuid_generate_v1()', // UUID extension function
              }),
              id_gen_random: aColumn({
                name: 'id_gen_random',
                type: 'uuid',
                notNull: true,
                default: 'gen_random_uuid()', // Built-in function
              }),
            },
          }),
        },
      })

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      
      // UUID functions should not be quoted
      expect(result.value).toContain('DEFAULT uuid_generate_v4()')
      expect(result.value).toContain('DEFAULT uuid_generate_v1()')
      expect(result.value).toContain('DEFAULT gen_random_uuid()')

      // Should not contain quoted versions
      expect(result.value).not.toContain("DEFAULT 'uuid_generate_v4()'")
      expect(result.value).not.toContain("DEFAULT 'uuid_generate_v1()'")
      expect(result.value).not.toContain("DEFAULT 'gen_random_uuid()'")
    })

    it('should handle mathematical functions correctly', () => {
      const schema = aSchema({
        tables: {
          calculations: aTable({
            name: 'calculations',
            columns: {
              random_number: aColumn({
                name: 'random_number',
                type: 'float',
                notNull: true,
                default: 'random()', // Random function
              }),
              floor_value: aColumn({
                name: 'floor_value',
                type: 'integer',
                notNull: true,
                default: 'floor(random() * 100)', // Floor function with expression
              }),
              ceiling_value: aColumn({
                name: 'ceiling_value',
                type: 'integer',
                notNull: true,
                default: 'ceil(random() * 100)', // Ceiling function with expression
              }),
              rounded_value: aColumn({
                name: 'rounded_value',
                type: 'numeric',
                notNull: true,
                default: 'round(random() * 100, 2)', // Round function with precision
              }),
            },
          }),
        },
      })

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      
      // Mathematical functions should not be quoted
      expect(result.value).toContain('DEFAULT random()')
      expect(result.value).toContain('DEFAULT floor(random() * 100)')
      expect(result.value).toContain('DEFAULT ceil(random() * 100)')
      expect(result.value).toContain('DEFAULT round(random() * 100, 2)')

      // Should not contain quoted versions
      expect(result.value).not.toContain("DEFAULT 'random()'")
      expect(result.value).not.toContain("DEFAULT 'floor(random() * 100)'")
      expect(result.value).not.toContain("DEFAULT 'ceil(random() * 100)'")
      expect(result.value).not.toContain("DEFAULT 'round(random() * 100, 2)'")
    })

    it('should handle mixed default types correctly', () => {
      const schema = aSchema({
        tables: {
          mixed_defaults: aTable({
            name: 'mixed_defaults',
            columns: {
              id: aColumn({
                name: 'id',
                type: 'uuid',
                notNull: true,
                default: 'gen_random_uuid()', // Function - should not be quoted
              }),
              status: aColumn({
                name: 'status',
                type: 'varchar',
                notNull: true,
                default: 'pending', // String literal - should be quoted
              }),
              is_active: aColumn({
                name: 'is_active',
                type: 'boolean',
                notNull: true,
                default: true, // Boolean - should not be quoted
              }),
              count: aColumn({
                name: 'count',
                type: 'integer',
                notNull: true,
                default: 0, // Number - should not be quoted
              }),
              created_at: aColumn({
                name: 'created_at',
                type: 'timestamptz',
                notNull: true,
                default: 'now()', // Function - should not be quoted
              }),
            },
          }),
        },
      })

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      
      // Functions should not be quoted
      expect(result.value).toContain('DEFAULT gen_random_uuid()')
      expect(result.value).toContain('DEFAULT now()')
      
      // String literals should be quoted
      expect(result.value).toContain("DEFAULT 'pending'")
      
      // Boolean and numeric values should not be quoted
      expect(result.value).toContain('DEFAULT TRUE')
      expect(result.value).toContain('DEFAULT 0')
      
      // Ensure functions are not quoted
      expect(result.value).not.toContain("DEFAULT 'gen_random_uuid()'")
      expect(result.value).not.toContain("DEFAULT 'now()'")
    })
  })
})