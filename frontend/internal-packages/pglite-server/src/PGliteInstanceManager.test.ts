import { beforeAll, describe, expect, it } from 'vitest'
import { PGliteInstanceManager } from './PGliteInstanceManager'

describe('PGliteInstanceManager', () => {
  const manager = new PGliteInstanceManager()

  // Warm up the pg-query-emscripten module before tests
  beforeAll(async () => {
    // Execute a simple query to initialize the parser
    await manager.executeQuery('SELECT 1', [])
  }, 30000)

  it('should handle single statement', async () => {
    const sql = 'SELECT 1;'
    const results = await manager.executeQuery(sql, [])

    expect(results).toHaveLength(1)
    expect(results[0]?.success).toBe(true)
    expect(results[0]?.sql.trim()).toBe('SELECT 1')
  })

  it('should handle multiple statements', async () => {
    const sql = 'SELECT 1; SELECT 2;'
    const results = await manager.executeQuery(sql, [])

    expect(results).toHaveLength(2)
    expect(results[0]?.success).toBe(true)
    expect(results[0]?.sql.trim()).toBe('SELECT 1')
    expect(results[1]?.success).toBe(true)
    expect(results[1]?.sql.trim()).toBe('SELECT 2')
  })

  it('should handle dollar-quoted function definitions', async () => {
    const sql = `
      CREATE OR REPLACE FUNCTION hello()
      RETURNS TEXT AS $$
      BEGIN
        RETURN 'Hello, World!';
      END;
      $$ LANGUAGE plpgsql;

      SELECT hello();
    `

    const results = await manager.executeQuery(sql, [])

    // Should parse into 2 statements: CREATE FUNCTION and SELECT
    expect(results).toHaveLength(2)
    expect(results[0]?.success).toBe(true)
    expect(results[0]?.sql).toContain('CREATE OR REPLACE FUNCTION')
    expect(results[0]?.sql).toContain('$$')
    expect(results[1]?.success).toBe(true)
    expect(results[1]?.sql.trim()).toBe('SELECT hello()')
  })

  it('should handle complex dollar-quoted strings with semicolons inside', async () => {
    const sql = `
      CREATE OR REPLACE FUNCTION complex_function()
      RETURNS TEXT AS $func$
      BEGIN
        EXECUTE 'SELECT 1; SELECT 2;'; -- semicolons inside dollar quotes
        RETURN 'Done; finished;'; -- more semicolons
      END;
      $func$ LANGUAGE plpgsql;
    `

    const results = await manager.executeQuery(sql, [])

    // Should be parsed as single statement despite internal semicolons
    expect(results).toHaveLength(1)
    expect(results[0]?.sql).toContain('CREATE OR REPLACE FUNCTION')
    expect(results[0]?.sql).toContain('$func$')
    expect(results[0]?.sql).toContain('SELECT 1; SELECT 2;')
  })

  it('should handle mixed dollar-quoted and regular statements', async () => {
    const sql = `
      SELECT 'before function';

      CREATE OR REPLACE FUNCTION test_func()
      RETURNS INTEGER AS $$
      DECLARE
        result INTEGER;
      BEGIN
        result := 42;
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;

      SELECT test_func();
    `

    const results = await manager.executeQuery(sql, [])

    expect(results).toHaveLength(3)
    expect(results[0]?.sql.trim()).toBe("SELECT 'before function'")
    expect(results[1]?.sql).toContain('CREATE OR REPLACE FUNCTION')
    expect(results[1]?.sql).toContain('$$')
    expect(results[2]?.sql.trim()).toBe('SELECT test_func()')
  })

  it('should fallback to simple splitting on parse errors', async () => {
    // Intentionally malformed SQL to test fallback
    const sql = 'INVALID SQL SYNTAX;;;'
    const results = await manager.executeQuery(sql, [])

    // Should still attempt to execute (though it will fail)
    expect(results).toHaveLength(1)
    expect(results[0]?.success).toBe(false)
    expect(results[0]?.result).toStrictEqual({
      error: 'Parse error: syntax error at or near "INVALID"',
    })
  })

  describe('Transaction Error Handling', () => {
    it('should FAIL when using explicit BEGIN without proper error handling', async () => {
      // This test demonstrates the actual problem when BEGIN is used
      const manager = new PGliteInstanceManager()

      const sql = `
        CREATE TABLE test_problem (id INT PRIMARY KEY, value TEXT);
        BEGIN;  -- Start explicit transaction
        INSERT INTO test_problem (id, value) VALUES (1, 'first');
        INSERT INTO test_problem (id, value) VALUES (1, 'duplicate'); -- Will fail
        INSERT INTO test_problem (id, value) VALUES (2, 'second'); -- Should work but won't due to transaction abort
        COMMIT; -- Will succeed but transaction was already aborted
        SELECT COUNT(*) FROM test_problem; -- Will show only 0 rows (transaction rolled back)
      `

      const results = await manager.executeQuery(sql, [])

      const normalizedResults = results.map((r) => ({
        sql: r.sql,
        success: r.success,
        result: r.result,
      }))

      // This test demonstrates the transaction abort problem with explicit BEGIN
      expect(normalizedResults).toStrictEqual([
        {
          sql: 'CREATE TABLE test_problem (id INT PRIMARY KEY, value TEXT)',
          success: true,
          result: { rows: [], fields: [], affectedRows: 0 },
        },
        {
          sql: 'BEGIN',
          success: true,
          result: { rows: [], fields: [], affectedRows: 0 },
        },
        {
          sql: "-- Start explicit transaction\n        INSERT INTO test_problem (id, value) VALUES (1, 'first')",
          success: true,
          result: { rows: [], fields: [], affectedRows: 1 },
        },
        {
          sql: "INSERT INTO test_problem (id, value) VALUES (1, 'duplicate')",
          success: false,
          result: {
            error:
              'duplicate key value violates unique constraint "test_problem_pkey"',
          },
        },
        {
          sql: "-- Will fail\n        INSERT INTO test_problem (id, value) VALUES (2, 'second')",
          success: false,
          result: {
            error:
              'current transaction is aborted, commands ignored until end of transaction block',
          },
        },
        {
          sql: "-- Should work but won't due to transaction abort\n        COMMIT",
          success: true,
          result: { rows: [], fields: [], affectedRows: 0 },
        },
        {
          sql: '-- Will succeed but transaction was already aborted\n        SELECT COUNT(*) FROM test_problem',
          success: true,
          result: {
            rows: [{ count: 0 }], // 0 because the transaction was rolled back
            fields: [{ name: 'count', dataTypeID: 20 }],
            affectedRows: 0,
          },
        },
      ])
    })
  })

  describe('Extension Support', () => {
    it('should handle basic extension loading scenarios', async () => {
      // Test multiple scenarios in one test to reduce redundancy

      // 1. Empty extensions
      let results = await manager.executeQuery('SELECT 1;', [])
      expect(results).toHaveLength(1)
      expect(results[0]?.success).toBe(true)

      // 2. Supported extensions (including normalization)
      results = await manager.executeQuery('SELECT 1;', ['uuid-ossp', 'hstore'])
      expect(results).toHaveLength(1)
      expect(results[0]?.success).toBe(true)

      // 3. Mixed supported/unsupported extensions
      results = await manager.executeQuery('SELECT 1;', [
        'hstore',
        'fake_extension',
        'pg_trgm',
        'unsupported',
      ])
      expect(results).toHaveLength(1)
      expect(results[0]?.success).toBe(true)
    })

    it('should load representative extensions successfully', async () => {
      const extensions = ['live', 'uuid-ossp', 'hstore', 'vector', 'pg_trgm']

      for (const ext of extensions) {
        const results = await manager.executeQuery('SELECT 1;', [ext])
        expect(results).toHaveLength(1)
        expect(results[0]?.success).toBe(true)
      }
    })

    describe('CREATE EXTENSION DDL Filtering', () => {
      it('should handle supported and unsupported extensions in DDL', async () => {
        const sql = `
          CREATE EXTENSION IF NOT EXISTS hstore;
          CREATE EXTENSION IF NOT EXISTS fake_extension;
          CREATE EXTENSION IF NOT EXISTS pg_trgm;
          SELECT 1;
        `
        const results = await manager.executeQuery(sql, ['hstore', 'pg_trgm'])

        // Should execute: hstore, pg_trgm, SELECT
        // fake_extension should be completely removed
        expect(results).toHaveLength(3)
        expect(results[0]?.sql).toBe('CREATE EXTENSION IF NOT EXISTS hstore')
        expect(results[1]?.sql).toBe('CREATE EXTENSION IF NOT EXISTS pg_trgm')
        expect(results[2]?.sql).toBe('SELECT 1')
      })

      it('should completely remove all unsupported extensions', async () => {
        const sql = `
          CREATE EXTENSION IF NOT EXISTS fake_extension;
          CREATE EXTENSION IF NOT EXISTS another_fake;
          SELECT 1;
        `
        const results = await manager.executeQuery(sql, [])

        expect(results).toHaveLength(1)
        expect(results[0]?.sql).toBe('SELECT 1')
        expect(results[0]?.success).toBe(true)
      })

      it('should handle quoted extension names and normalization', async () => {
        const sql = `
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          CREATE EXTENSION IF NOT EXISTS "hstore";
          CREATE EXTENSION pg_trgm;
        `
        const results = await manager.executeQuery(sql, [
          'uuid-ossp',
          'hstore',
          'pg_trgm',
        ])

        expect(results).toHaveLength(3)
        expect(results[0]?.sql).toContain('uuid-ossp')
        expect(results[1]?.sql).toContain('"hstore"')
        expect(results[2]?.sql).toContain('pg_trgm')
      })

      it('should simplify complex CREATE EXTENSION statements by removing WITH clauses', async () => {
        // This test verifies that complex CREATE EXTENSION statements are simplified for PGlite compatibility
        const sql = `
          CREATE EXTENSION IF NOT EXISTS pg_ivm
            WITH VERSION '1.9'
            SCHEMA public
            CASCADE;
          CREATE EXTENSION fake_complex
            WITH VERSION '2.0'
            SCHEMA test;
          SELECT 1;
        `
        const results = await manager.executeQuery(sql, ['pg_ivm'])

        // Complex CREATE EXTENSION should be simplified to basic form for PGlite compatibility
        // The pg_ivm extension is supported, so it should execute as simplified form
        // The fake_complex extension should be completely removed
        // The SELECT 1 should execute successfully
        expect(results).toHaveLength(2) // CREATE EXTENSION pg_ivm and SELECT 1

        // First result: Simplified CREATE EXTENSION pg_ivm (should succeed)
        expect(results[0]?.sql).toBe('CREATE EXTENSION IF NOT EXISTS pg_ivm')
        expect(results[0]?.success).toBe(true)

        // Second result: SELECT 1 (should succeed)
        expect(results[1]?.sql).toBe('SELECT 1')
        expect(results[1]?.success).toBe(true)
      })
    })
  })

  describe('COMMENT Statement String Processing', () => {
    it('should handle COMMENT statements with apostrophes in possessive form', async () => {
      const sql = `
CREATE TABLE users (
  id UUID PRIMARY KEY,
  full_name TEXT,
  bio TEXT
);

COMMENT ON TABLE users IS 'User''s account information';
COMMENT ON COLUMN users.id IS 'User''s unique identifier';
COMMENT ON COLUMN users.full_name IS 'User''s display name';
COMMENT ON COLUMN users.bio IS 'User''s biography';
      `

      const results = await manager.executeQuery(sql, [])

      expect(results).toHaveLength(5)
      
      // CREATE TABLE should succeed
      expect(results[0]?.success).toBe(true)
      expect(results[0]?.sql).toContain('CREATE TABLE')
      
      // All COMMENT statements should succeed and start with COMMENT, not OMMENT
      for (let i = 1; i <= 4; i++) {
        expect(results[i]?.success).toBe(true)
        expect(results[i]?.sql.trim()).toMatch(/^COMMENT ON/)
        expect(results[i]?.sql).not.toMatch(/^OMMENT/)
      }
    })

    it('should handle multiple COMMENT statements after table with escaped apostrophes', async () => {
      const sql = `
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID,
  description TEXT
);
COMMENT ON TABLE organizations IS 'Organization''s main table';
COMMENT ON COLUMN organizations.name IS 'Organization''s display name';
COMMENT ON COLUMN organizations.owner_id IS 'Organization''s owner reference';
COMMENT ON COLUMN organizations.description IS 'Organization''s detailed description';

CREATE TABLE teams (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  name TEXT
);

COMMENT ON TABLE teams IS 'Team''s information';
COMMENT ON COLUMN teams.name IS 'Team''s name';
      `

      const results = await manager.executeQuery(sql, [])

      // Should have: 2 CREATE TABLE + 6 COMMENT statements
      expect(results).toHaveLength(8)
      
      // Check all statements succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      // Check COMMENT statements are not truncated
      const commentStatements = results.filter(r => r.sql.includes('COMMENT ON'))
      expect(commentStatements).toHaveLength(6)
      
      commentStatements.forEach(result => {
        expect(result.sql.trim()).toMatch(/^COMMENT ON/)
        expect(result.sql).not.toMatch(/^OMMENT/)
      })
    })

    it('should fail to parse SQL containing U+2019 (right single quotation mark)', async () => {
      // This test demonstrates that U+2019 causes a parse error
      // U+2019 (') is not a valid SQL string delimiter and breaks parsing
      const sql = `
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

COMMENT ON TABLE products IS 'Product's main table';
COMMENT ON COLUMN products.name IS 'Product's display name';
COMMENT ON COLUMN products.description IS 'Product's detailed info';
      `

      const results = await manager.executeQuery(sql, [])

      // Current behavior on main branch: U+2019 causes a parse error
      // The entire SQL is returned as a single failed result
      expect(results).toHaveLength(1)
      expect(results[0]?.success).toBe(false)
      expect(results[0]?.result.error).toContain('Parse error: syntax error at or near "s"')
      
      // The error occurs because U+2019 is interpreted as closing the string,
      // making the 's' in "Product's" appear as invalid SQL syntax
    })

    it.skip('should demonstrate the OMMENT truncation bug with U+2019 (devin branch behavior)', async () => {
      // This test is skipped on main branch but shows the bug that exists in devin branch
      // where U+2019 causes subsequent statements to be truncated
      const sql = `
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

COMMENT ON TABLE products IS 'Product's main table';
COMMENT ON COLUMN products.name IS 'Product's display name';
COMMENT ON COLUMN products.description IS 'Product's detailed info';
      `

      const results = await manager.executeQuery(sql, [])

      // On devin branch with PR #3492, this would produce:
      expect(results).toHaveLength(4)
      
      // 1. CREATE TABLE succeeds
      expect(results[0]?.success).toBe(true)
      expect(results[0]?.sql).toContain('CREATE TABLE products')
      
      // 2. First COMMENT succeeds (contains U+2019)
      expect(results[1]?.success).toBe(true)
      expect(results[1]?.sql).toContain('COMMENT ON TABLE products')
      
      // 3. Second COMMENT is truncated to "OMMENT" - this is the bug!
      expect(results[2]?.success).toBe(false)
      expect(results[2]?.sql).toMatch(/^OMMENT ON COLUMN/)
      
      // 4. Third COMMENT is truncated to "MENT" - cumulative offset
      expect(results[3]?.success).toBe(false)
      expect(results[3]?.sql).toMatch(/^MENT ON COLUMN/)
    })
  })
})
