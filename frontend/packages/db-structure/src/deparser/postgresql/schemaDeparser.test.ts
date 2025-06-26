import { describe, expect, it } from 'vitest'
import type { Schema } from '../../schema/index.js'
import { postgresqlSchemaDeparser } from './schemaDeparser.js'
import { expectGeneratedSQLToBeParseable } from './testUtils.js'

describe('postgresqlSchemaDeparser', () => {
  it('should generate basic CREATE TABLE statement', async () => {
    const schema: Schema = {
      tables: {
        users: {
          name: 'users',
          columns: {
            id: {
              name: 'id',
              type: 'bigint',
              notNull: true,
              default: null,
              check: null,
              comment: null,
            },
            email: {
              name: 'email',
              type: 'varchar(255)',
              notNull: true,
              default: null,
              check: null,
              comment: null,
            },
          },
          comment: null,
          indexes: {},
          constraints: {
            users_pkey: {
              type: 'PRIMARY KEY',
              name: 'users_pkey',
              columnName: 'id',
            },
          },
        },
      },
    }

    const result = postgresqlSchemaDeparser(schema)

    expect(result.errors).toHaveLength(0)
    expect(result.value).toMatchInlineSnapshot(`
      "CREATE TABLE "users" (
        "id" bigint PRIMARY KEY,
        "email" varchar(255) NOT NULL
      );"
    `)

    await expectGeneratedSQLToBeParseable(result.value)
  })

  it('should generate CREATE TABLE with comments', async () => {
    const schema: Schema = {
      tables: {
        products: {
          name: 'products',
          columns: {
            id: {
              name: 'id',
              type: 'bigint',
              notNull: true,
              default: null,
              check: null,
              comment: 'Product ID',
            },
          },
          comment: 'Product table',
          indexes: {},
          constraints: {
            products_pkey: {
              type: 'PRIMARY KEY',
              name: 'products_pkey',
              columnName: 'id',
            },
          },
        },
      },
    }

    const result = postgresqlSchemaDeparser(schema)

    expect(result.errors).toHaveLength(0)
    expect(result.value).toMatchInlineSnapshot(`
      "CREATE TABLE "products" (
        "id" bigint PRIMARY KEY
      );

      COMMENT ON TABLE "products" IS 'Product table';
      COMMENT ON COLUMN "products"."id" IS 'Product ID';"
    `)

    await expectGeneratedSQLToBeParseable(result.value)
  })

  it('should generate CREATE TABLE with default values', async () => {
    const schema: Schema = {
      tables: {
        settings: {
          name: 'settings',
          columns: {
            id: {
              name: 'id',
              type: 'bigint',
              notNull: true,
              default: null,
              check: null,
              comment: null,
            },
            enabled: {
              name: 'enabled',
              type: 'boolean',
              notNull: true,
              default: true,
              check: null,
              comment: null,
            },
            count: {
              name: 'count',
              type: 'integer',
              notNull: false,
              default: 0,
              check: null,
              comment: null,
            },
            title: {
              name: 'title',
              type: 'varchar(50)',
              notNull: false,
              default: 'Default Title',
              check: null,
              comment: null,
            },
          },
          comment: null,
          indexes: {},
          constraints: {
            settings_pkey: {
              type: 'PRIMARY KEY',
              name: 'settings_pkey',
              columnName: 'id',
            },
          },
        },
      },
    }

    const result = postgresqlSchemaDeparser(schema)

    expect(result.errors).toHaveLength(0)
    expect(result.value).toMatchInlineSnapshot(`
      "CREATE TABLE "settings" (
        "id" bigint PRIMARY KEY,
        "enabled" boolean NOT NULL DEFAULT TRUE,
        "count" integer DEFAULT 0,
        "title" varchar(50) DEFAULT 'Default Title'
      );"
    `)

    await expectGeneratedSQLToBeParseable(result.value)
  })

  it('should handle string escaping in comments', async () => {
    const schema: Schema = {
      tables: {
        test: {
          name: 'test',
          columns: {
            id: {
              name: 'id',
              type: 'bigint',
              notNull: true,
              default: null,
              check: null,
              comment: "Column with 'quotes' in comment",
            },
          },
          comment: "Table with 'quotes' in comment",
          indexes: {},
          constraints: {
            test_pkey: {
              type: 'PRIMARY KEY',
              name: 'test_pkey',
              columnName: 'id',
            },
          },
        },
      },
    }

    const result = postgresqlSchemaDeparser(schema)

    expect(result.errors).toHaveLength(0)
    expect(result.value).toMatchInlineSnapshot(
      `
      "CREATE TABLE "test" (
        "id" bigint PRIMARY KEY
      );

      COMMENT ON TABLE "test" IS 'Table with ''quotes'' in comment';
      COMMENT ON COLUMN "test"."id" IS 'Column with ''quotes'' in comment';"
    `,
    )

    await expectGeneratedSQLToBeParseable(result.value)
  })

  it('should handle multiple tables', async () => {
    const schema: Schema = {
      tables: {
        users: {
          name: 'users',
          columns: {
            id: {
              name: 'id',
              type: 'bigint',
              notNull: true,
              default: null,
              check: null,
              comment: null,
            },
          },
          comment: null,
          indexes: {},
          constraints: {
            users_pkey: {
              type: 'PRIMARY KEY',
              name: 'users_pkey',
              columnName: 'id',
            },
          },
        },
        products: {
          name: 'products',
          columns: {
            id: {
              name: 'id',
              type: 'bigint',
              notNull: true,
              default: null,
              check: null,
              comment: null,
            },
            name: {
              name: 'name',
              type: 'varchar(100)',
              notNull: true,
              default: null,
              check: null,
              comment: null,
            },
          },
          comment: null,
          indexes: {},
          constraints: {
            products_pkey: {
              type: 'PRIMARY KEY',
              name: 'products_pkey',
              columnName: 'id',
            },
          },
        },
      },
    }

    const result = postgresqlSchemaDeparser(schema)

    expect(result.errors).toHaveLength(0)
    expect(result.value).toMatchInlineSnapshot(`
      "CREATE TABLE "users" (
        "id" bigint PRIMARY KEY
      );

      CREATE TABLE "products" (
        "id" bigint PRIMARY KEY,
        "name" varchar(100) NOT NULL
      );"
    `)

    await expectGeneratedSQLToBeParseable(result.value)
  })

  it('should handle empty schema', async () => {
    const schema: Schema = {
      tables: {},
    }

    const result = postgresqlSchemaDeparser(schema)

    expect(result.errors).toHaveLength(0)
    expect(result.value).toBe('')

    await expectGeneratedSQLToBeParseable(result.value)
  })
})
