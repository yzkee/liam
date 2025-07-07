import { describe, expect, it } from 'vitest'
import type { Table } from '../../../schema/index.js'
import { aColumn, aSchema, aTable } from '../../../schema/index.js'
import { createParserTestCases } from '../../__tests__/index.js'
import { UnexpectedTokenWarningError } from '../../errors.js'
import { processor } from './index.js'

describe(processor, () => {
  const userTable = (override?: Partial<Table>) =>
    aSchema({
      tables: {
        users: aTable({
          name: 'users',
          columns: {
            id: aColumn({
              name: 'id',
              type: 'bigserial',
              notNull: true,
            }),
            ...override?.columns,
          },
          indexes: {
            ...override?.indexes,
          },
          comment: override?.comment ?? null,
          constraints: {
            ...override?.constraints,
            PRIMARY_id: {
              name: 'PRIMARY_id',
              type: 'PRIMARY KEY',
              columnName: 'id',
            },
          },
        }),
      },
    })
  const parserTestCases = createParserTestCases(userTable)

  describe('should parse CREATE TABLE statement correctly', () => {
    it('table comment', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY
        );
        COMMENT ON TABLE users IS 'store our users.';
      `)

      expect(value).toEqual(parserTestCases['table comment'])
    })

    it('column commnet', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          description TEXT
        );
        COMMENT ON COLUMN users.description IS 'this is description';
      `)

      expect(value).toEqual(parserTestCases['column comment'])
    })

    it('not null', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );
      `)

      expect(value).toEqual(parserTestCases['not null'])
    })

    it('nullable', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          description TEXT
        );
      `)

      expect(value).toEqual(parserTestCases.nullable)
    })

    it('default value as string', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          description TEXT DEFAULT 'user''s description'
        );
      `)

      expect(value).toEqual(parserTestCases['default value as string'])
    })

    it('default value as integer', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          age INTEGER DEFAULT 30
        );
      `)

      expect(value).toEqual(parserTestCases['default value as integer'])
    })

    it('default value as boolean', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          active BOOLEAN DEFAULT TRUE
        );
      `)

      expect(value).toEqual(parserTestCases['default value as boolean'])
    })

    it('unique', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          mention TEXT UNIQUE
        );
      `)

      expect(value).toEqual(
        userTable({
          columns: {
            mention: aColumn({
              name: 'mention',
              type: 'text',
            }),
          },
          constraints: {
            UNIQUE_mention: {
              name: 'UNIQUE_mention',
              type: 'UNIQUE',
              columnName: 'mention',
            },
          },
        }),
      )
    })

    it('index (unique: false)', async () => {
      const indexName = 'index_users_on_id_and_email'
      const { value } = await processor(/* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          email VARCHAR(255)
        );

        CREATE INDEX index_users_on_id_and_email ON public.users USING btree (id, email);
      `)

      expect(value).toEqual(
        parserTestCases['index (unique: false)'](indexName, 'btree'),
      )
    })

    it('index (unique: true)', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          email VARCHAR(255)
        );

        CREATE UNIQUE INDEX index_users_on_email ON public.users USING btree (email);
      `)

      expect(value).toEqual(parserTestCases['index (unique: true)']('btree'))
    })

    it('table-level primary key constraint with named constraint', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE bar (
          bar_id int,
          name text NOT NULL,
          CONSTRAINT bar_primary_key PRIMARY KEY (bar_id)
        );
      `)

      expect(value.tables['bar']?.constraints).toEqual({
        bar_primary_key: {
          name: 'bar_primary_key',
          type: 'PRIMARY KEY',
          columnName: 'bar_id',
        },
      })
    })

    it('table-level primary key constraint without named constraint', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE foo_bar (
          foo_id int,
          bar_id int,
          PRIMARY KEY (foo_id, bar_id)
        );
      `)

      expect(value.tables['foo_bar']?.constraints).toEqual({
        PRIMARY_foo_id: {
          name: 'PRIMARY_foo_id',
          type: 'PRIMARY KEY',
          columnName: 'foo_id',
        },
        PRIMARY_bar_id: {
          name: 'PRIMARY_bar_id',
          type: 'PRIMARY KEY',
          columnName: 'bar_id',
        },
      })
    })

    it('table-level single column primary key constraint', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE baz (
          baz_id int,
          name text,
          PRIMARY KEY (baz_id)
        );
      `)

      expect(value.tables['baz']?.constraints).toEqual({
        PRIMARY_baz_id: {
          name: 'PRIMARY_baz_id',
          type: 'PRIMARY KEY',
          columnName: 'baz_id',
        },
      })
    })

    it('foreign key constraint in CREATE TABLE', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE posts (
          id BIGSERIAL PRIMARY KEY,
          user_id INT,
          CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `)

      expect(value.tables['posts']?.constraints).toEqual({
        PRIMARY_id: {
          name: 'PRIMARY_id',
          type: 'PRIMARY KEY',
          columnName: 'id',
        },
        fk_posts_user_id: {
          name: 'fk_posts_user_id',
          type: 'FOREIGN KEY',
          columnName: 'user_id',
          targetTableName: 'users',
          targetColumnName: 'id',
          updateConstraint: 'NO_ACTION',
          deleteConstraint: 'NO_ACTION',
        },
      })
    })

    it('foreign key with omit key name', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE posts (
          id BIGSERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id)
        );
      `)

      // TODO: This test demonstrates the current behavior where we use defaultRelationshipName
      // instead of PostgreSQL's standard naming convention.
      //
      // Current behavior: 'users_id_to_posts_user_id' (using defaultRelationshipName)
      // Ideal behavior: 'posts_user_id_fkey' (PostgreSQL standard)
      //
      // PostgreSQL automatically generates constraint names in the format:
      // <table>_<column>_fkey when no explicit name is provided.
      //
      // We should consider migrating to PostgreSQL's standard naming convention
      // in a future major version to better reflect actual database behavior.
      expect(value.tables['posts']?.constraints).toEqual({
        PRIMARY_id: {
          name: 'PRIMARY_id',
          type: 'PRIMARY KEY',
          columnName: 'id',
        },
        users_id_to_posts_user_id: {
          name: 'users_id_to_posts_user_id',
          type: 'FOREIGN KEY',
          columnName: 'user_id',
          targetColumnName: 'id',
          targetTableName: 'users',
          updateConstraint: 'NO_ACTION',
          deleteConstraint: 'NO_ACTION',
        },
      })
    })

    it('foreign key constraint (one-to-one)', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE posts (
          id BIGSERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) UNIQUE
        );
      `)

      expect(value.tables['posts']?.constraints).toEqual({
        PRIMARY_id: {
          name: 'PRIMARY_id',
          type: 'PRIMARY KEY',
          columnName: 'id',
        },
        UNIQUE_user_id: {
          name: 'UNIQUE_user_id',
          type: 'UNIQUE',
          columnName: 'user_id',
        },
        users_id_to_posts_user_id: {
          name: 'users_id_to_posts_user_id',
          type: 'FOREIGN KEY',
          columnName: 'user_id',
          targetColumnName: 'id',
          targetTableName: 'users',
          updateConstraint: 'NO_ACTION',
          deleteConstraint: 'NO_ACTION',
        },
      })
    })

    it('check constraint', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE products (
            id SERIAL PRIMARY KEY,
            name text,
            price numeric CHECK (price > 0)
        );
      `)

      expect(value.tables['products']?.constraints).toEqual({
        PRIMARY_id: {
          name: 'PRIMARY_id',
          type: 'PRIMARY KEY',
          columnName: 'id',
        },
        CHECK_price: {
          name: 'CHECK_price',
          type: 'CHECK',
          detail: 'CHECK (price > 0)',
        },
      })
    })
  })

  describe('should parse ALTER TABLE statement correctly', () => {
    it('foreign key constraint (one-to-many)', async () => {
      const keyName = 'fk_posts_user_id'
      const { value } = await processor(/* sql */ `
        CREATE TABLE posts (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL
        );

        ALTER TABLE posts
        ADD CONSTRAINT ${keyName} FOREIGN KEY (user_id) REFERENCES users(id);
      `)

      expect(value.tables['posts']?.constraints).toEqual({
        PRIMARY_id: {
          name: 'PRIMARY_id',
          type: 'PRIMARY KEY',
          columnName: 'id',
        },
        fk_posts_user_id: {
          name: 'fk_posts_user_id',
          type: 'FOREIGN KEY',
          columnName: 'user_id',
          targetTableName: 'users',
          targetColumnName: 'id',
          updateConstraint: 'NO_ACTION',
          deleteConstraint: 'NO_ACTION',
        },
      })
    })

    it('foreign key constraint (one-to-one)', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE posts (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL UNIQUE
        );

        ALTER TABLE posts
        ADD CONSTRAINT users_id_to_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id);
      `)

      expect(value.tables['posts']?.constraints).toEqual({
        PRIMARY_id: {
          name: 'PRIMARY_id',
          type: 'PRIMARY KEY',
          columnName: 'id',
        },
        UNIQUE_user_id: {
          name: 'UNIQUE_user_id',
          type: 'UNIQUE',
          columnName: 'user_id',
        },
        users_id_to_posts_user_id: {
          name: 'users_id_to_posts_user_id',
          type: 'FOREIGN KEY',
          columnName: 'user_id',
          targetTableName: 'users',
          targetColumnName: 'id',
          updateConstraint: 'NO_ACTION',
          deleteConstraint: 'NO_ACTION',
        },
      })
    })

    it('foreign key with action', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE posts (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL
        );

        ALTER TABLE posts
        ADD CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE CASCADE;
      `)

      expect(value.tables['posts']?.constraints).toEqual({
        PRIMARY_id: {
          name: 'PRIMARY_id',
          type: 'PRIMARY KEY',
          columnName: 'id',
        },
        fk_posts_user_id: {
          name: 'fk_posts_user_id',
          type: 'FOREIGN KEY',
          columnName: 'user_id',
          targetTableName: 'users',
          targetColumnName: 'id',
          updateConstraint: 'RESTRICT',
          deleteConstraint: 'CASCADE',
        },
      })
    })

    it('check constraint', async () => {
      const { value } = await processor(/* sql */ `
        CREATE TABLE products (
            id SERIAL PRIMARY KEY,
            name text,
            price numeric
        );

        ALTER TABLE products
        ADD CONSTRAINT price_check_is_positive CHECK (price > 0);
      `)

      expect(value.tables['products']?.constraints).toEqual({
        PRIMARY_id: {
          name: 'PRIMARY_id',
          type: 'PRIMARY KEY',
          columnName: 'id',
        },
        price_check_is_positive: {
          name: 'price_check_is_positive',
          type: 'CHECK',
          detail: 'CHECK (price > 0)',
        },
      })
    })
  })

  describe('abnormal cases', () => {
    it('show error if the syntax is broken', async () => {
      const result = await processor(/* sql */ `
        CREATEe TABLE posts ();
      `)

      const value = { tables: {} }
      const errors = [
        new UnexpectedTokenWarningError('syntax error at or near "CREATEe"'),
      ]

      expect(result).toEqual({ value, errors })
    })
  })

  describe('Long "create table" statement (surpassing CHUNK_SIZE). regression test for liam-hq/liam#874', () => {
    // Use smaller chunkSize for faster testing
    const testChunkSize = 10

    it('parses without errors', async () => {
      const linePaddingForTest = '\n'.repeat(testChunkSize)
      const { value, errors } = await processor(
        /* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
          ${linePaddingForTest}
        );
      `,
        testChunkSize,
      )

      expect(value).toEqual(parserTestCases.normal)
      expect(errors).toEqual([])
    })
  })

  describe('Long "create function" statement (surpassing CHUNK_SIZE). regression test for liam-hq/liam#874', () => {
    // Use smaller chunkSize for faster testing
    const testChunkSize = 10

    it('parses without errors', async () => {
      const linePaddingForTest = '\n'.repeat(testChunkSize)
      const { value, errors } = await processor(
        /* sql */ `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );

        CREATE OR REPLACE FUNCTION test_proc(p_id integer)
        RETURNS void AS $$
        BEGIN
            RAISE NOTICE 'Stored procedure called with parameter: %', p_id;
            ${linePaddingForTest}
        END;
        $$ LANGUAGE plpgsql;
      `,
        testChunkSize,
      )
      expect(value).toEqual(parserTestCases.normal)
      expect(errors).toEqual([])
    })
  })

  describe('Schema-qualified table names with foreign keys', () => {
    it('should reproduce the issue from real dump file', async () => {
      // This test reproduces the exact structure from the failing dump file
      const { value } = await processor(/* sql */ `
        --
        -- PostgreSQL database dump
        --

        -- Dumped from database version 15.13
        -- Dumped by pg_dump version 15.13

        SET statement_timeout = 0;
        SET lock_timeout = 0;
        SET idle_in_transaction_session_timeout = 0;
        SET client_encoding = 'UTF8';
        SET standard_conforming_strings = on;
        SELECT pg_catalog.set_config('search_path', '', false);
        SET check_function_bodies = false;

        --
        -- Name: analytics; Type: SCHEMA; Schema: -; Owner: postgres
        --

        CREATE SCHEMA analytics;
        ALTER SCHEMA analytics OWNER TO postgres;

        --
        -- Name: auth; Type: SCHEMA; Schema: -; Owner: postgres
        --

        CREATE SCHEMA auth;
        ALTER SCHEMA auth OWNER TO postgres;

        --
        -- Name: ecommerce; Type: SCHEMA; Schema: -; Owner: postgres
        --

        CREATE SCHEMA ecommerce;
        ALTER SCHEMA ecommerce OWNER TO postgres;

        SET default_tablespace = '';
        SET default_table_access_method = heap;

        --
        -- Name: users; Type: TABLE; Schema: auth; Owner: postgres
        --

        CREATE TABLE auth.users (
            user_id uuid DEFAULT gen_random_uuid() NOT NULL,
            email character varying(255) NOT NULL,
            username character varying(100) NOT NULL,
            password_hash character varying(255) NOT NULL,
            is_active boolean DEFAULT true,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE auth.users OWNER TO postgres;

        --
        -- Name: page_views; Type: TABLE; Schema: analytics; Owner: postgres
        --

        CREATE TABLE analytics.page_views (
            view_id bigint NOT NULL,
            session_id uuid NOT NULL,
            user_id uuid,
            page_url text NOT NULL,
            referrer_url text,
            user_agent text,
            ip_address inet,
            country_code character(2),
            viewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE analytics.page_views OWNER TO postgres;

        --
        -- Name: products; Type: TABLE; Schema: ecommerce; Owner: postgres
        --

        CREATE TABLE ecommerce.products (
            product_id uuid DEFAULT gen_random_uuid() NOT NULL,
            sku character varying(100) NOT NULL,
            product_name character varying(255) NOT NULL,
            description text,
            price numeric(10,2) NOT NULL,
            cost numeric(10,2),
            stock_quantity integer DEFAULT 0,
            weight numeric(8,3),
            is_active boolean DEFAULT true,
            created_by uuid,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE ecommerce.products OWNER TO postgres;

        --
        -- Name: customers; Type: TABLE; Schema: ecommerce; Owner: postgres
        --

        CREATE TABLE ecommerce.customers (
            customer_id uuid DEFAULT gen_random_uuid() NOT NULL,
            user_id uuid,
            customer_number character varying(50) NOT NULL,
            company_name character varying(255),
            tax_id character varying(50),
            credit_limit numeric(12,2) DEFAULT 0.00
        );

        ALTER TABLE ecommerce.customers OWNER TO postgres;

        --
        -- Name: page_views page_views_pkey; Type: CONSTRAINT; Schema: analytics; Owner: postgres
        --

        ALTER TABLE ONLY analytics.page_views
            ADD CONSTRAINT page_views_pkey PRIMARY KEY (view_id);

        --
        -- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
        --

        ALTER TABLE ONLY auth.users
            ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);

        --
        -- Name: customers customers_pkey; Type: CONSTRAINT; Schema: ecommerce; Owner: postgres
        --

        ALTER TABLE ONLY ecommerce.customers
            ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);

        --
        -- Name: products products_pkey; Type: CONSTRAINT; Schema: ecommerce; Owner: postgres
        --

        ALTER TABLE ONLY ecommerce.products
            ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);

        --
        -- Name: page_views fk_page_view_user; Type: FK CONSTRAINT; Schema: analytics; Owner: postgres
        --

        ALTER TABLE ONLY analytics.page_views
            ADD CONSTRAINT fk_page_view_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE SET NULL;

        --
        -- Name: customers fk_customer_user; Type: FK CONSTRAINT; Schema: ecommerce; Owner: postgres
        --

        ALTER TABLE ONLY ecommerce.customers
            ADD CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE SET NULL;

        --
        -- Name: products fk_product_creator; Type: FK CONSTRAINT; Schema: ecommerce; Owner: postgres
        --

        ALTER TABLE ONLY ecommerce.products
            ADD CONSTRAINT fk_product_creator FOREIGN KEY (created_by) REFERENCES auth.users(user_id) ON DELETE SET NULL;
      `)

      // All three foreign keys should be parsed correctly
      expect(
        value.tables['page_views']?.constraints?.['fk_page_view_user'],
      ).toBeDefined()
      expect(
        value.tables['customers']?.constraints?.['fk_customer_user'],
      ).toBeDefined()
      expect(
        value.tables['products']?.constraints?.['fk_product_creator'],
      ).toBeDefined()

      // This test should fail if schema-qualified names cause issues
      expect(
        value.tables['page_views']?.constraints?.['fk_page_view_user'],
      ).toEqual({
        name: 'fk_page_view_user',
        type: 'FOREIGN KEY',
        columnName: 'user_id',
        targetTableName: 'users',
        targetColumnName: 'user_id',
        updateConstraint: 'NO_ACTION',
        deleteConstraint: 'SET_NULL',
      })
    })

    it('should parse all foreign key constraints from a complex dump file (FAILING TEST)', async () => {
      // This test uses the actual content from the real dump file to demonstrate
      // that many foreign key constraints are not being parsed correctly

      // For testing purposes, we'll simulate processing the real dump file
      // In a real scenario, you would fetch and process the actual file
      // The real dump contains 16 foreign key constraints but only ~4 are parsed correctly

      // This test deliberately expects 16 foreign keys to demonstrate the issue
      const { value } = await processor(/* sql */ `
        -- Simulated complex dump with all the foreign keys that should be parsed
        -- Based on the real dump file structure
        
        CREATE SCHEMA analytics;
        CREATE SCHEMA auth;
        CREATE SCHEMA ecommerce;

        CREATE TABLE auth.users (user_id uuid PRIMARY KEY);
        CREATE TABLE auth.roles (role_id int PRIMARY KEY);
        CREATE TABLE auth.user_profiles (profile_id uuid PRIMARY KEY, user_id uuid);
        CREATE TABLE auth.user_roles (user_id uuid, role_id int);
        
        CREATE TABLE analytics.page_views (view_id bigint PRIMARY KEY, user_id uuid);
        CREATE TABLE analytics.product_stats (stat_id int PRIMARY KEY, product_id uuid);
        
        CREATE TABLE ecommerce.categories (category_id int PRIMARY KEY, parent_category_id int);
        CREATE TABLE ecommerce.customers (customer_id uuid PRIMARY KEY, user_id uuid);
        CREATE TABLE ecommerce.products (product_id uuid PRIMARY KEY, created_by uuid);
        CREATE TABLE ecommerce.product_images (image_id int PRIMARY KEY, product_id uuid);
        CREATE TABLE ecommerce.product_categories (product_id uuid, category_id int);
        CREATE TABLE ecommerce.orders (order_id uuid PRIMARY KEY, customer_id uuid);
        CREATE TABLE ecommerce.order_items (order_item_id uuid PRIMARY KEY, order_id uuid, product_id uuid);
        CREATE TABLE ecommerce.reviews (review_id uuid PRIMARY KEY, product_id uuid, customer_id uuid);

        -- All 16 foreign key constraints that exist in the real dump
        ALTER TABLE ONLY analytics.page_views ADD CONSTRAINT fk_page_view_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE SET NULL;
        ALTER TABLE ONLY analytics.product_stats ADD CONSTRAINT fk_product_stats_product FOREIGN KEY (product_id) REFERENCES ecommerce.products(product_id) ON DELETE CASCADE;
        ALTER TABLE ONLY auth.user_profiles ADD CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE CASCADE;
        ALTER TABLE ONLY auth.user_roles ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES auth.roles(role_id) ON DELETE CASCADE;
        ALTER TABLE ONLY auth.user_roles ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE CASCADE;
        ALTER TABLE ONLY ecommerce.categories ADD CONSTRAINT fk_category_parent FOREIGN KEY (parent_category_id) REFERENCES ecommerce.categories(category_id) ON DELETE CASCADE;
        ALTER TABLE ONLY ecommerce.customers ADD CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE SET NULL;
        ALTER TABLE ONLY ecommerce.product_images ADD CONSTRAINT fk_image_product FOREIGN KEY (product_id) REFERENCES ecommerce.products(product_id) ON DELETE CASCADE;
        ALTER TABLE ONLY ecommerce.orders ADD CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES ecommerce.customers(customer_id);
        ALTER TABLE ONLY ecommerce.order_items ADD CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES ecommerce.orders(order_id) ON DELETE CASCADE;
        ALTER TABLE ONLY ecommerce.order_items ADD CONSTRAINT fk_order_item_product FOREIGN KEY (product_id) REFERENCES ecommerce.products(product_id);
        ALTER TABLE ONLY ecommerce.product_categories ADD CONSTRAINT fk_prod_cat_category FOREIGN KEY (category_id) REFERENCES ecommerce.categories(category_id) ON DELETE CASCADE;
        ALTER TABLE ONLY ecommerce.product_categories ADD CONSTRAINT fk_prod_cat_product FOREIGN KEY (product_id) REFERENCES ecommerce.products(product_id) ON DELETE CASCADE;
        ALTER TABLE ONLY ecommerce.products ADD CONSTRAINT fk_product_creator FOREIGN KEY (created_by) REFERENCES auth.users(user_id) ON DELETE SET NULL;
        ALTER TABLE ONLY ecommerce.reviews ADD CONSTRAINT fk_review_customer FOREIGN KEY (customer_id) REFERENCES ecommerce.customers(customer_id);
        ALTER TABLE ONLY ecommerce.reviews ADD CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES ecommerce.products(product_id) ON DELETE CASCADE;
      `)

      // Count total foreign key constraints across all tables
      const totalForeignKeys = Object.values(value.tables).reduce(
        (count, table) => {
          const foreignKeys = Object.values(table.constraints || {}).filter(
            (constraint) => constraint.type === 'FOREIGN KEY',
          )
          return count + foreignKeys.length
        },
        0,
      )

      // Log which foreign keys were parsed
      Object.entries(value.tables).forEach(([_tableName, table]) => {
        const foreignKeys = Object.values(table.constraints || {}).filter(
          (constraint) => constraint.type === 'FOREIGN KEY',
        )
        if (foreignKeys.length > 0) {
        }
      })

      // This assertion should fail, demonstrating the issue
      expect(totalForeignKeys).toBe(16)
    })

    it('minimal reproduction - step 1: basic structure from real dump', async () => {
      // Start with just the basic structure from the real dump file
      const { value } = await processor(/* sql */ `
        -- Basic PostgreSQL dump structure
        SET statement_timeout = 0;
        SET lock_timeout = 0;
        SET idle_in_transaction_session_timeout = 0;
        SET client_encoding = 'UTF8';
        SET standard_conforming_strings = on;
        SELECT pg_catalog.set_config('search_path', '', false);
        SET check_function_bodies = false;

        CREATE SCHEMA analytics;
        CREATE SCHEMA auth;
        CREATE SCHEMA ecommerce;

        ALTER SCHEMA analytics OWNER TO postgres;
        ALTER SCHEMA auth OWNER TO postgres;
        ALTER SCHEMA ecommerce OWNER TO postgres;

        SET default_tablespace = '';
        SET default_table_access_method = heap;

        -- Simple tables
        CREATE TABLE auth.users (
            user_id uuid DEFAULT gen_random_uuid() NOT NULL,
            email character varying(255) NOT NULL
        );

        CREATE TABLE analytics.page_views (
            view_id bigint NOT NULL,
            user_id uuid
        );

        CREATE TABLE ecommerce.products (
            product_id uuid DEFAULT gen_random_uuid() NOT NULL,
            created_by uuid
        );

        ALTER TABLE auth.users OWNER TO postgres;
        ALTER TABLE analytics.page_views OWNER TO postgres;
        ALTER TABLE ecommerce.products OWNER TO postgres;

        -- Add constraints
        ALTER TABLE ONLY auth.users
            ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);

        ALTER TABLE ONLY analytics.page_views
            ADD CONSTRAINT page_views_pkey PRIMARY KEY (view_id);

        ALTER TABLE ONLY ecommerce.products
            ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);

        -- Foreign key constraints
        ALTER TABLE ONLY analytics.page_views
            ADD CONSTRAINT fk_page_view_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE SET NULL;

        ALTER TABLE ONLY ecommerce.products
            ADD CONSTRAINT fk_product_creator FOREIGN KEY (created_by) REFERENCES auth.users(user_id) ON DELETE SET NULL;
      `)

      const totalForeignKeys = Object.values(value.tables).reduce(
        (count, table) => {
          const foreignKeys = Object.values(table.constraints || {}).filter(
            (constraint) => constraint.type === 'FOREIGN KEY',
          )
          return count + foreignKeys.length
        },
        0,
      )

      Object.entries(value.tables).forEach(([_tableName, table]) => {
        const foreignKeys = Object.values(table.constraints || {}).filter(
          (constraint) => constraint.type === 'FOREIGN KEY',
        )
        if (foreignKeys.length > 0) {
        }
      })

      expect(totalForeignKeys).toBe(2)
    })

    it('minimal reproduction - step 2: add more tables and FKs', async () => {
      // Add more tables and foreign keys, similar to real dump
      const { value } = await processor(/* sql */ `
        SET statement_timeout = 0;
        SET client_encoding = 'UTF8';
        SET standard_conforming_strings = on;
        SELECT pg_catalog.set_config('search_path', '', false);

        CREATE SCHEMA analytics;
        CREATE SCHEMA auth;
        CREATE SCHEMA ecommerce;

        SET default_tablespace = '';
        SET default_table_access_method = heap;

        -- Tables from real dump
        CREATE TABLE auth.users (
            user_id uuid DEFAULT gen_random_uuid() NOT NULL,
            email character varying(255) NOT NULL
        );

        CREATE TABLE auth.roles (
            role_id integer NOT NULL,
            role_name character varying(50) NOT NULL
        );

        CREATE TABLE auth.user_roles (
            user_id uuid NOT NULL,
            role_id integer NOT NULL
        );

        CREATE TABLE analytics.page_views (
            view_id bigint NOT NULL,
            user_id uuid
        );

        CREATE TABLE ecommerce.customers (
            customer_id uuid DEFAULT gen_random_uuid() NOT NULL,
            user_id uuid
        );

        CREATE TABLE ecommerce.products (
            product_id uuid DEFAULT gen_random_uuid() NOT NULL,
            created_by uuid
        );

        -- Primary keys
        ALTER TABLE ONLY auth.users ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);
        ALTER TABLE ONLY auth.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);
        ALTER TABLE ONLY analytics.page_views ADD CONSTRAINT page_views_pkey PRIMARY KEY (view_id);
        ALTER TABLE ONLY ecommerce.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);
        ALTER TABLE ONLY ecommerce.products ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);

        -- Foreign key constraints (5 total)
        ALTER TABLE ONLY analytics.page_views
            ADD CONSTRAINT fk_page_view_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE SET NULL;

        ALTER TABLE ONLY auth.user_roles
            ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE CASCADE;

        ALTER TABLE ONLY auth.user_roles
            ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES auth.roles(role_id) ON DELETE CASCADE;

        ALTER TABLE ONLY ecommerce.customers
            ADD CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE SET NULL;

        ALTER TABLE ONLY ecommerce.products
            ADD CONSTRAINT fk_product_creator FOREIGN KEY (created_by) REFERENCES auth.users(user_id) ON DELETE SET NULL;
      `)

      const totalForeignKeys = Object.values(value.tables).reduce(
        (count, table) => {
          const foreignKeys = Object.values(table.constraints || {}).filter(
            (constraint) => constraint.type === 'FOREIGN KEY',
          )
          return count + foreignKeys.length
        },
        0,
      )

      Object.entries(value.tables).forEach(([_tableName, table]) => {
        const foreignKeys = Object.values(table.constraints || {}).filter(
          (constraint) => constraint.type === 'FOREIGN KEY',
        )
        if (foreignKeys.length > 0) {
        }
      })

      expect(totalForeignKeys).toBe(5)
    })

    it('minimal reproduction - step 3: add complex elements from real dump', async () => {
      // Add elements that might cause parsing issues
      const { value } = await processor(/* sql */ `
        SET statement_timeout = 0;
        SET client_encoding = 'UTF8';
        SET standard_conforming_strings = on;
        SELECT pg_catalog.set_config('search_path', '', false);

        CREATE SCHEMA analytics;
        CREATE SCHEMA auth; 
        CREATE SCHEMA ecommerce;

        -- Add ENUM type like in real dump
        CREATE TYPE ecommerce.order_status_type AS ENUM (
            'pending',
            'confirmed',
            'processing',
            'shipped'
        );

        -- Add DOMAIN type like in real dump
        CREATE DOMAIN ecommerce.positive_decimal AS numeric(10,2)
          CONSTRAINT positive_decimal_check CHECK ((VALUE >= (0)::numeric));

        -- Add FUNCTION like in real dump
        CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
            LANGUAGE plpgsql
            AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$;

        SET default_tablespace = '';
        SET default_table_access_method = heap;

        CREATE TABLE auth.users (
            user_id uuid DEFAULT gen_random_uuid() NOT NULL,
            email character varying(255) NOT NULL
        );

        CREATE TABLE analytics.page_views (
            view_id bigint NOT NULL,
            user_id uuid
        );

        CREATE TABLE ecommerce.products (
            product_id uuid DEFAULT gen_random_uuid() NOT NULL,
            created_by uuid
        );

        -- Add owner statements like in real dump
        ALTER TABLE auth.users OWNER TO postgres;
        ALTER TABLE analytics.page_views OWNER TO postgres; 
        ALTER TABLE ecommerce.products OWNER TO postgres;

        -- Add table comments like in real dump
        COMMENT ON TABLE analytics.page_views IS 'Page view tracking data';
        COMMENT ON COLUMN ecommerce.products.product_id IS 'Product ID';

        -- Add sequence like in real dump
        CREATE SEQUENCE analytics.page_views_view_id_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1;

        ALTER SEQUENCE analytics.page_views_view_id_seq OWNED BY analytics.page_views.view_id;

        -- Primary keys
        ALTER TABLE ONLY auth.users ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);
        ALTER TABLE ONLY analytics.page_views ADD CONSTRAINT page_views_pkey PRIMARY KEY (view_id);
        ALTER TABLE ONLY ecommerce.products ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);

        -- Foreign key constraints
        ALTER TABLE ONLY analytics.page_views
            ADD CONSTRAINT fk_page_view_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE SET NULL;

        ALTER TABLE ONLY ecommerce.products
            ADD CONSTRAINT fk_product_creator FOREIGN KEY (created_by) REFERENCES auth.users(user_id) ON DELETE SET NULL;
      `)

      const totalForeignKeys = Object.values(value.tables).reduce(
        (count, table) => {
          const foreignKeys = Object.values(table.constraints || {}).filter(
            (constraint) => constraint.type === 'FOREIGN KEY',
          )
          return count + foreignKeys.length
        },
        0,
      )

      Object.entries(value.tables).forEach(([_tableName, table]) => {
        const foreignKeys = Object.values(table.constraints || {}).filter(
          (constraint) => constraint.type === 'FOREIGN KEY',
        )
        if (foreignKeys.length > 0) {
        }
      })

      expect(totalForeignKeys).toBe(2)
    })

    it('minimal reproduction - step 4: test specific failed FKs from real dump', async () => {
      // Test specific foreign keys that failed in the real dump
      const { value } = await processor(/* sql */ `
        CREATE SCHEMA analytics;
        CREATE SCHEMA auth;
        CREATE SCHEMA ecommerce;

        -- Create tables exactly as they appear in the dump
        CREATE TABLE auth.users (
            user_id uuid DEFAULT gen_random_uuid() NOT NULL
        );

        CREATE TABLE auth.roles (
            role_id integer NOT NULL
        );

        CREATE TABLE auth.user_roles (
            user_id uuid NOT NULL,
            role_id integer NOT NULL
        );

        CREATE TABLE ecommerce.categories (
            category_id integer NOT NULL,
            parent_category_id integer
        );

        CREATE TABLE ecommerce.customers (
            customer_id uuid DEFAULT gen_random_uuid() NOT NULL,
            user_id uuid
        );

        CREATE TABLE analytics.product_stats (
            stat_id integer NOT NULL,
            product_id uuid NOT NULL
        );

        CREATE TABLE ecommerce.products (
            product_id uuid DEFAULT gen_random_uuid() NOT NULL
        );

        -- Primary keys
        ALTER TABLE ONLY auth.users ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);
        ALTER TABLE ONLY auth.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);
        ALTER TABLE ONLY ecommerce.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);
        ALTER TABLE ONLY ecommerce.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);
        ALTER TABLE ONLY analytics.product_stats ADD CONSTRAINT product_stats_pkey PRIMARY KEY (stat_id);
        ALTER TABLE ONLY ecommerce.products ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);

        -- Test the exact foreign keys that failed from the real dump
        ALTER TABLE ONLY analytics.product_stats
            ADD CONSTRAINT fk_product_stats_product FOREIGN KEY (product_id) REFERENCES ecommerce.products(product_id) ON DELETE CASCADE;

        ALTER TABLE ONLY auth.user_roles
            ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES auth.roles(role_id) ON DELETE CASCADE;

        ALTER TABLE ONLY auth.user_roles
            ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE CASCADE;

        ALTER TABLE ONLY ecommerce.categories
            ADD CONSTRAINT fk_category_parent FOREIGN KEY (parent_category_id) REFERENCES ecommerce.categories(category_id) ON DELETE CASCADE;

        ALTER TABLE ONLY ecommerce.customers
            ADD CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE SET NULL;
      `)

      const totalForeignKeys = Object.values(value.tables).reduce(
        (count, table) => {
          const foreignKeys = Object.values(table.constraints || {}).filter(
            (constraint) => constraint.type === 'FOREIGN KEY',
          )
          return count + foreignKeys.length
        },
        0,
      )

      Object.entries(value.tables).forEach(([_tableName, table]) => {
        const foreignKeys = Object.values(table.constraints || {}).filter(
          (constraint) => constraint.type === 'FOREIGN KEY',
        )
        if (foreignKeys.length > 0) {
        }
      })

      // This should help us understand why these specific FKs failed in the real dump
      expect(totalForeignKeys).toBe(5)
    })
    it('should parse foreign key constraints with schema-qualified table names', async () => {
      const { value } = await processor(/* sql */ `
        -- Create schemas
        CREATE SCHEMA auth;
        CREATE SCHEMA analytics;
        CREATE SCHEMA ecommerce;

        -- Create tables in different schemas
        CREATE TABLE auth.users (
          user_id uuid PRIMARY KEY,
          email varchar(255) NOT NULL
        );

        CREATE TABLE analytics.page_views (
          view_id bigint PRIMARY KEY,
          user_id uuid,
          page_url text NOT NULL
        );

        CREATE TABLE ecommerce.products (
          product_id uuid PRIMARY KEY,
          product_name varchar(255) NOT NULL,
          created_by uuid
        );

        -- Add foreign key constraints with schema-qualified references (using ONLY keyword like pg_dump)
        ALTER TABLE ONLY analytics.page_views
          ADD CONSTRAINT fk_page_view_user 
          FOREIGN KEY (user_id) REFERENCES auth.users(user_id) ON DELETE SET NULL;

        ALTER TABLE ONLY ecommerce.products
          ADD CONSTRAINT fk_product_creator 
          FOREIGN KEY (created_by) REFERENCES auth.users(user_id) ON DELETE SET NULL;
      `)

      // Expected: Both foreign key constraints should be parsed correctly
      expect(value.tables['page_views']?.constraints).toEqual({
        PRIMARY_view_id: {
          name: 'PRIMARY_view_id',
          type: 'PRIMARY KEY',
          columnName: 'view_id',
        },
        fk_page_view_user: {
          name: 'fk_page_view_user',
          type: 'FOREIGN KEY',
          columnName: 'user_id',
          targetTableName: 'users',
          targetColumnName: 'user_id',
          updateConstraint: 'NO_ACTION',
          deleteConstraint: 'SET_NULL',
        },
      })

      expect(value.tables['products']?.constraints).toEqual({
        PRIMARY_product_id: {
          name: 'PRIMARY_product_id',
          type: 'PRIMARY KEY',
          columnName: 'product_id',
        },
        fk_product_creator: {
          name: 'fk_product_creator',
          type: 'FOREIGN KEY',
          columnName: 'created_by',
          targetTableName: 'users',
          targetColumnName: 'user_id',
          updateConstraint: 'NO_ACTION',
          deleteConstraint: 'SET_NULL',
        },
      })

      // Verify all tables are present
      expect(Object.keys(value.tables)).toContain('users')
      expect(Object.keys(value.tables)).toContain('page_views')
      expect(Object.keys(value.tables)).toContain('products')
    })

    it('should handle multiple schema-qualified foreign key constraints', async () => {
      const { value } = await processor(/* sql */ `
        CREATE SCHEMA ecommerce;
        CREATE SCHEMA analytics;

        CREATE TABLE ecommerce.customers (
          customer_id uuid PRIMARY KEY,
          email varchar(255) NOT NULL
        );

        CREATE TABLE ecommerce.orders (
          order_id uuid PRIMARY KEY,
          customer_id uuid NOT NULL,
          total_amount decimal(10,2) NOT NULL
        );

        CREATE TABLE ecommerce.order_items (
          order_item_id uuid PRIMARY KEY,
          order_id uuid NOT NULL,
          product_id uuid NOT NULL,
          quantity integer NOT NULL
        );

        CREATE TABLE ecommerce.products (
          product_id uuid PRIMARY KEY,
          product_name varchar(255) NOT NULL
        );

        -- Add multiple foreign key constraints
        ALTER TABLE ecommerce.orders
          ADD CONSTRAINT fk_order_customer 
          FOREIGN KEY (customer_id) REFERENCES ecommerce.customers(customer_id);

        ALTER TABLE ecommerce.order_items
          ADD CONSTRAINT fk_order_item_order 
          FOREIGN KEY (order_id) REFERENCES ecommerce.orders(order_id) ON DELETE CASCADE;

        ALTER TABLE ecommerce.order_items
          ADD CONSTRAINT fk_order_item_product 
          FOREIGN KEY (product_id) REFERENCES ecommerce.products(product_id);
      `)

      // Expected: All foreign key constraints should be parsed correctly
      expect(value.tables['orders']?.constraints).toEqual(
        expect.objectContaining({
          fk_order_customer: {
            name: 'fk_order_customer',
            type: 'FOREIGN KEY',
            columnName: 'customer_id',
            targetTableName: 'customers',
            targetColumnName: 'customer_id',
            updateConstraint: 'NO_ACTION',
            deleteConstraint: 'NO_ACTION',
          },
        }),
      )

      expect(value.tables['order_items']?.constraints).toEqual(
        expect.objectContaining({
          fk_order_item_order: {
            name: 'fk_order_item_order',
            type: 'FOREIGN KEY',
            columnName: 'order_id',
            targetTableName: 'orders',
            targetColumnName: 'order_id',
            updateConstraint: 'NO_ACTION',
            deleteConstraint: 'CASCADE',
          },
          fk_order_item_product: {
            name: 'fk_order_item_product',
            type: 'FOREIGN KEY',
            columnName: 'product_id',
            targetTableName: 'products',
            targetColumnName: 'product_id',
            updateConstraint: 'NO_ACTION',
            deleteConstraint: 'NO_ACTION',
          },
        }),
      )
    })
  })
})
