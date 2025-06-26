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
              primary: true,
              notNull: true,
              unique: false,
              default: null,
              check: null,
              comment: null,
            },
            email: {
              name: 'email',
              type: 'varchar(255)',
              primary: false,
              notNull: true,
              unique: true,
              default: null,
              check: null,
              comment: null,
            },
          },
          comment: null,
          indexes: {},
          constraints: {},
        },
      },
    }

    const result = postgresqlSchemaDeparser(schema)

    expect(result.errors).toHaveLength(0)
    expect(result.value).toMatchInlineSnapshot(`
      "CREATE TABLE \"users\" (
        \"id\" bigint PRIMARY KEY,
        \"email\" varchar(255) UNIQUE NOT NULL
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
              primary: true,
              notNull: true,
              unique: false,
              default: null,
              check: null,
              comment: 'Product ID',
            },
          },
          comment: 'Product table',
          indexes: {},
          constraints: {},
        },
      },
    }

    const result = postgresqlSchemaDeparser(schema)

    expect(result.errors).toHaveLength(0)
    expect(result.value).toMatchInlineSnapshot(`
      "CREATE TABLE \"products\" (
        \"id\" bigint PRIMARY KEY
      );

      COMMENT ON TABLE \"products\" IS 'Product table';
      COMMENT ON COLUMN \"products\".\"id\" IS 'Product ID';"
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
              primary: true,
              notNull: true,
              unique: false,
              default: null,
              check: null,
              comment: null,
            },
            enabled: {
              name: 'enabled',
              type: 'boolean',
              primary: false,
              notNull: true,
              unique: false,
              default: true,
              check: null,
              comment: null,
            },
            count: {
              name: 'count',
              type: 'integer',
              primary: false,
              notNull: false,
              unique: false,
              default: 0,
              check: null,
              comment: null,
            },
            title: {
              name: 'title',
              type: 'varchar(50)',
              primary: false,
              notNull: false,
              unique: false,
              default: 'Default Title',
              check: null,
              comment: null,
            },
          },
          comment: null,
          indexes: {},
          constraints: {},
        },
      },
    }

    const result = postgresqlSchemaDeparser(schema)

    expect(result.errors).toHaveLength(0)
    expect(result.value).toMatchInlineSnapshot(`
      "CREATE TABLE \"settings\" (
        \"id\" bigint PRIMARY KEY,
        \"enabled\" boolean NOT NULL DEFAULT TRUE,
        \"count\" integer DEFAULT 0,
        \"title\" varchar(50) DEFAULT 'Default Title'
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
              primary: true,
              notNull: true,
              unique: false,
              default: null,
              check: null,
              comment: "Column with 'quotes' in comment",
            },
          },
          comment: "Table with 'quotes' in comment",
          indexes: {},
          constraints: {},
        },
      },
    }

    const result = postgresqlSchemaDeparser(schema)

    expect(result.errors).toHaveLength(0)
    expect(result.value).toMatchInlineSnapshot(
      `
      "CREATE TABLE \"test\" (
        \"id\" bigint PRIMARY KEY
      );

      COMMENT ON TABLE \"test\" IS 'Table with ''quotes'' in comment';
      COMMENT ON COLUMN \"test\".\"id\" IS 'Column with ''quotes'' in comment';"
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
              primary: true,
              notNull: true,
              unique: false,
              default: null,
              check: null,
              comment: null,
            },
          },
          comment: null,
          indexes: {},
          constraints: {},
        },
        products: {
          name: 'products',
          columns: {
            id: {
              name: 'id',
              type: 'bigint',
              primary: true,
              notNull: true,
              unique: false,
              default: null,
              check: null,
              comment: null,
            },
            name: {
              name: 'name',
              type: 'varchar(100)',
              primary: false,
              notNull: true,
              unique: false,
              default: null,
              check: null,
              comment: null,
            },
          },
          comment: null,
          indexes: {},
          constraints: {},
        },
      },
    }

    const result = postgresqlSchemaDeparser(schema)

    expect(result.errors).toHaveLength(0)
    expect(result.value).toMatchInlineSnapshot(`
      "CREATE TABLE \"users\" (
        \"id\" bigint PRIMARY KEY
      );

      CREATE TABLE \"products\" (
        \"id\" bigint PRIMARY KEY,
        \"name\" varchar(100) NOT NULL
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

  describe('index generation', () => {
    it('should generate CREATE INDEX statements', async () => {
      const schema: Schema = {
        tables: {
          users: {
            name: 'users',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              email: {
                name: 'email',
                type: 'varchar(255)',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {
              idx_users_email: {
                name: 'idx_users_email',
                unique: false,
                columns: ['email'],
                type: 'BTREE',
              },
            },
            constraints: {},
          },
        },
      }

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.value).toMatchInlineSnapshot(`
        "CREATE TABLE \"users\" (
          \"id\" bigint PRIMARY KEY,
          \"email\" varchar(255) NOT NULL
        );

        CREATE INDEX \"idx_users_email\" ON \"users\" USING BTREE (\"email\");"
      `)

      await expectGeneratedSQLToBeParseable(result.value)
    })

    it('should generate UNIQUE INDEX statements', async () => {
      const schema: Schema = {
        tables: {
          users: {
            name: 'users',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              username: {
                name: 'username',
                type: 'varchar(50)',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {
              idx_users_username_unique: {
                name: 'idx_users_username_unique',
                unique: true,
                columns: ['username'],
                type: 'BTREE',
              },
            },
            constraints: {},
          },
        },
      }

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.value).toMatchInlineSnapshot(`
        "CREATE TABLE \"users\" (
          \"id\" bigint PRIMARY KEY,
          \"username\" varchar(50) NOT NULL
        );

        CREATE UNIQUE INDEX \"idx_users_username_unique\" ON \"users\" USING BTREE (\"username\");"
      `)

      await expectGeneratedSQLToBeParseable(result.value)
    })

    it('should generate composite INDEX statements', async () => {
      const schema: Schema = {
        tables: {
          orders: {
            name: 'orders',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              user_id: {
                name: 'user_id',
                type: 'bigint',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              created_at: {
                name: 'created_at',
                type: 'timestamp',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {
              idx_orders_user_date: {
                name: 'idx_orders_user_date',
                unique: false,
                columns: ['user_id', 'created_at'],
                type: 'BTREE',
              },
            },
            constraints: {},
          },
        },
      }

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.value).toMatchInlineSnapshot(`
        "CREATE TABLE \"orders\" (
          \"id\" bigint PRIMARY KEY,
          \"user_id\" bigint NOT NULL,
          \"created_at\" timestamp NOT NULL
        );

        CREATE INDEX \"idx_orders_user_date\" ON \"orders\" USING BTREE (\"user_id\", \"created_at\");"
      `)

      await expectGeneratedSQLToBeParseable(result.value)
    })

    it('should handle indexes without type specified', async () => {
      const schema: Schema = {
        tables: {
          products: {
            name: 'products',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              category_id: {
                name: 'category_id',
                type: 'bigint',
                primary: false,
                notNull: false,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {
              idx_products_category: {
                name: 'idx_products_category',
                unique: false,
                columns: ['category_id'],
                type: '',
              },
            },
            constraints: {},
          },
        },
      }

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.value).toMatchInlineSnapshot(`
        "CREATE TABLE \"products\" (
          \"id\" bigint PRIMARY KEY,
          \"category_id\" bigint
        );

        CREATE INDEX \"idx_products_category\" ON \"products\" (\"category_id\");"
      `)

      await expectGeneratedSQLToBeParseable(result.value)
    })
  })

  describe('constraint generation', () => {
    it('should generate PRIMARY KEY constraints', async () => {
      const schema: Schema = {
        tables: {
          users: {
            name: 'users',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {},
            constraints: {
              pk_users_id: {
                type: 'PRIMARY KEY',
                name: 'pk_users_id',
                columnName: 'id',
              },
            },
          },
        },
      }

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.value).toMatchInlineSnapshot(`
        "CREATE TABLE \"users\" (
          \"id\" bigint NOT NULL
        );

        ALTER TABLE \"users\" ADD CONSTRAINT \"pk_users_id\" PRIMARY KEY (\"id\");"
      `)

      await expectGeneratedSQLToBeParseable(result.value)
    })

    it('should generate FOREIGN KEY constraints', async () => {
      const schema: Schema = {
        tables: {
          users: {
            name: 'users',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {},
            constraints: {},
          },
          orders: {
            name: 'orders',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              user_id: {
                name: 'user_id',
                type: 'bigint',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {},
            constraints: {
              fk_orders_user_id: {
                type: 'FOREIGN KEY',
                name: 'fk_orders_user_id',
                columnName: 'user_id',
                targetTableName: 'users',
                targetColumnName: 'id',
                updateConstraint: 'CASCADE',
                deleteConstraint: 'SET_NULL',
              },
            },
          },
        },
      }

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.value).toMatchInlineSnapshot(`
        "CREATE TABLE \"users\" (
          \"id\" bigint PRIMARY KEY
        );

        CREATE TABLE \"orders\" (
          \"id\" bigint PRIMARY KEY,
          \"user_id\" bigint NOT NULL
        );

        ALTER TABLE \"orders\" ADD CONSTRAINT \"fk_orders_user_id\" FOREIGN KEY (\"user_id\") REFERENCES \"users\" (\"id\") ON UPDATE CASCADE ON DELETE SET NULL;"
      `)

      await expectGeneratedSQLToBeParseable(result.value)
    })

    it('should generate UNIQUE constraints', async () => {
      const schema: Schema = {
        tables: {
          users: {
            name: 'users',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              email: {
                name: 'email',
                type: 'varchar(255)',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {},
            constraints: {
              uk_users_email: {
                type: 'UNIQUE',
                name: 'uk_users_email',
                columnName: 'email',
              },
            },
          },
        },
      }

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.value).toMatchInlineSnapshot(`
        "CREATE TABLE \"users\" (
          \"id\" bigint PRIMARY KEY,
          \"email\" varchar(255) NOT NULL
        );

        ALTER TABLE \"users\" ADD CONSTRAINT \"uk_users_email\" UNIQUE (\"email\");"
      `)

      await expectGeneratedSQLToBeParseable(result.value)
    })

    it('should generate CHECK constraints', async () => {
      const schema: Schema = {
        tables: {
          products: {
            name: 'products',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              price: {
                name: 'price',
                type: 'decimal(10,2)',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {},
            constraints: {
              ck_products_price_positive: {
                type: 'CHECK',
                name: 'ck_products_price_positive',
                detail: 'price > 0',
              },
            },
          },
        },
      }

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.value).toMatchInlineSnapshot(`
        "CREATE TABLE \"products\" (
          \"id\" bigint PRIMARY KEY,
          \"price\" decimal(10,2) NOT NULL
        );

        ALTER TABLE \"products\" ADD CONSTRAINT \"ck_products_price_positive\" CHECK (price > 0);"
      `)

      await expectGeneratedSQLToBeParseable(result.value)
    })
  })

  describe('complex schemas', () => {
    it('should handle schema with multiple tables, indexes, and constraints', async () => {
      const schema: Schema = {
        tables: {
          users: {
            name: 'users',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: 'User ID',
              },
              email: {
                name: 'email',
                type: 'varchar(255)',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              created_at: {
                name: 'created_at',
                type: 'timestamp',
                primary: false,
                notNull: true,
                unique: false,
                default: 'CURRENT_TIMESTAMP',
                check: null,
                comment: null,
              },
            },
            comment: 'Users table',
            indexes: {
              idx_users_email: {
                name: 'idx_users_email',
                unique: true,
                columns: ['email'],
                type: 'BTREE',
              },
            },
            constraints: {},
          },
          products: {
            name: 'products',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              name: {
                name: 'name',
                type: 'varchar(100)',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              price: {
                name: 'price',
                type: 'decimal(10,2)',
                primary: false,
                notNull: true,
                unique: false,
                default: 0,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {
              idx_products_name: {
                name: 'idx_products_name',
                unique: false,
                columns: ['name'],
                type: '',
              },
            },
            constraints: {
              ck_products_price: {
                type: 'CHECK',
                name: 'ck_products_price',
                detail: 'price >= 0',
              },
            },
          },
          orders: {
            name: 'orders',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              user_id: {
                name: 'user_id',
                type: 'bigint',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              product_id: {
                name: 'product_id',
                type: 'bigint',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              quantity: {
                name: 'quantity',
                type: 'integer',
                primary: false,
                notNull: true,
                unique: false,
                default: 1,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {
              idx_orders_user_product: {
                name: 'idx_orders_user_product',
                unique: false,
                columns: ['user_id', 'product_id'],
                type: 'BTREE',
              },
            },
            constraints: {
              fk_orders_user: {
                type: 'FOREIGN KEY',
                name: 'fk_orders_user',
                columnName: 'user_id',
                targetTableName: 'users',
                targetColumnName: 'id',
                updateConstraint: 'CASCADE',
                deleteConstraint: 'CASCADE',
              },
              fk_orders_product: {
                type: 'FOREIGN KEY',
                name: 'fk_orders_product',
                columnName: 'product_id',
                targetTableName: 'products',
                targetColumnName: 'id',
                updateConstraint: 'CASCADE',
                deleteConstraint: 'RESTRICT',
              },
            },
          },
        },
      }

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.value).toMatchInlineSnapshot(`
        "CREATE TABLE \"users\" (
          \"id\" bigint PRIMARY KEY,
          \"email\" varchar(255) NOT NULL,
          \"created_at\" timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
        );

        COMMENT ON TABLE \"users\" IS 'Users table';
        COMMENT ON COLUMN \"users\".\"id\" IS 'User ID';

        CREATE TABLE \"products\" (
          \"id\" bigint PRIMARY KEY,
          \"name\" varchar(100) NOT NULL,
          \"price\" decimal(10,2) NOT NULL DEFAULT 0
        );

        CREATE TABLE \"orders\" (
          \"id\" bigint PRIMARY KEY,
          \"user_id\" bigint NOT NULL,
          \"product_id\" bigint NOT NULL,
          \"quantity\" integer NOT NULL DEFAULT 1
        );

        CREATE UNIQUE INDEX \"idx_users_email\" ON \"users\" USING BTREE (\"email\");

        CREATE INDEX \"idx_products_name\" ON \"products\" (\"name\");

        CREATE INDEX \"idx_orders_user_product\" ON \"orders\" USING BTREE (\"user_id\", \"product_id\");

        ALTER TABLE \"products\" ADD CONSTRAINT \"ck_products_price\" CHECK (price >= 0);

        ALTER TABLE \"orders\" ADD CONSTRAINT \"fk_orders_user\" FOREIGN KEY (\"user_id\") REFERENCES \"users\" (\"id\") ON UPDATE CASCADE ON DELETE CASCADE;

        ALTER TABLE \"orders\" ADD CONSTRAINT \"fk_orders_product\" FOREIGN KEY (\"product_id\") REFERENCES \"products\" (\"id\") ON UPDATE CASCADE ON DELETE RESTRICT;"
      `)

      await expectGeneratedSQLToBeParseable(result.value)
    })

    it('should handle circular foreign key references', async () => {
      const schema: Schema = {
        tables: {
          departments: {
            name: 'departments',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              name: {
                name: 'name',
                type: 'varchar(100)',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              manager_id: {
                name: 'manager_id',
                type: 'bigint',
                primary: false,
                notNull: false,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {},
            constraints: {
              fk_departments_manager: {
                type: 'FOREIGN KEY',
                name: 'fk_departments_manager',
                columnName: 'manager_id',
                targetTableName: 'employees',
                targetColumnName: 'id',
                updateConstraint: 'CASCADE',
                deleteConstraint: 'SET_NULL',
              },
            },
          },
          employees: {
            name: 'employees',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              name: {
                name: 'name',
                type: 'varchar(100)',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
              department_id: {
                name: 'department_id',
                type: 'bigint',
                primary: false,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {},
            constraints: {
              fk_employees_department: {
                type: 'FOREIGN KEY',
                name: 'fk_employees_department',
                columnName: 'department_id',
                targetTableName: 'departments',
                targetColumnName: 'id',
                updateConstraint: 'CASCADE',
                deleteConstraint: 'RESTRICT',
              },
            },
          },
        },
      }

      const result = postgresqlSchemaDeparser(schema)

      expect(result.errors).toHaveLength(0)
      expect(result.value).toMatchInlineSnapshot(`
        "CREATE TABLE \"departments\" (
          \"id\" bigint PRIMARY KEY,
          \"name\" varchar(100) NOT NULL,
          \"manager_id\" bigint
        );

        CREATE TABLE \"employees\" (
          \"id\" bigint PRIMARY KEY,
          \"name\" varchar(100) NOT NULL,
          \"department_id\" bigint NOT NULL
        );

        ALTER TABLE \"departments\" ADD CONSTRAINT \"fk_departments_manager\" FOREIGN KEY (\"manager_id\") REFERENCES \"employees\" (\"id\") ON UPDATE CASCADE ON DELETE SET NULL;

        ALTER TABLE \"employees\" ADD CONSTRAINT \"fk_employees_department\" FOREIGN KEY (\"department_id\") REFERENCES \"departments\" (\"id\") ON UPDATE CASCADE ON DELETE RESTRICT;"
      `)

      await expectGeneratedSQLToBeParseable(result.value)
    })
  })

  describe('error handling', () => {
    it('should handle empty table name', async () => {
      const schema: Schema = {
        tables: {
          '': {
            name: '',
            columns: {
              id: {
                name: 'id',
                type: 'bigint',
                primary: true,
                notNull: true,
                unique: false,
                default: null,
                check: null,
                comment: null,
              },
            },
            comment: null,
            indexes: {},
            constraints: {},
          },
        },
      }

      const result = postgresqlSchemaDeparser(schema)

      // Empty table names are technically valid in PostgreSQL when escaped
      expect(result.errors).toHaveLength(0)
      expect(result.value).toContain('CREATE TABLE ""')
    })
  })
})
