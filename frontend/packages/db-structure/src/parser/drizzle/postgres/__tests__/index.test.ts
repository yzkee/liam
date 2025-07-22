import { describe, expect, it } from 'vitest'
import type { Constraint } from '@/schema/index.js'
import { processor as _processor } from '../index.js'

describe(_processor, () => {
  // PostgreSQL-specific tests (tests that are unique to PostgreSQL and not covered by unified tests)
  describe('PostgreSQL-specific functionality', () => {
    it('test actual schema from test_schema.ts pattern', async () => {
      const { value } = await _processor(`
        import {
          pgTable,
          pgEnum,
          serial,
          text,
          timestamp,
          boolean,
          integer,
          numeric,
          jsonb,
          uuid,
          primaryKey,
        } from 'drizzle-orm/pg-core';
        import { relations } from 'drizzle-orm';

        export const userRoleEnum = pgEnum('user_role', ['student', 'instructor', 'admin']);

        export const users = pgTable('users', {
          id: serial('id').primaryKey(),
          uuid: uuid('uuid').defaultRandom().notNull().unique(),
          name: text('name').notNull(),
          email: text('email').notNull().unique(),
          passwordHash: text('password_hash').notNull(),
          role: userRoleEnum('role').default('student').notNull(),
          bio: text('bio'),
          profilePictureUrl: text('profile_picture_url'),
          createdAt: timestamp('created_at').defaultNow().notNull(),
          updatedAt: timestamp('updated_at').defaultNow().notNull(),
        });

        export const instructors = pgTable('instructors', {
          id: serial('id').primaryKey(),
          userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
          specialization: text('specialization'),
          experienceYears: integer('experience_years').default(0).notNull(),
          externalLink: text('external_link'),
        });

        export const usersRelations = relations(users, ({ one, many }) => ({
          instructor: one(instructors), // users has 1:1 with instructors
        }));

        export const instructorsRelations = relations(instructors, ({ one, many }) => ({
          user: one(users, {
            fields: [instructors.userId],
            references: [users.id],
          }), // instructors has 1:1 with users (reverse direction)
        }));
      `)

      // Focus on the key relationship elements

      // The critical constraint for 1:1 relationship
      expect(value.tables['instructors']?.constraints).toHaveProperty(
        'UNIQUE_user_id',
      )
      expect(value.tables['instructors']?.constraints).toHaveProperty(
        'instructors_user_id_users_id_fk',
      )

      // With unique constraint + foreign key, this establishes a proper 1:1 relationship
      const uniqueConstraint =
        value.tables['instructors']?.constraints['UNIQUE_user_id']
      const foreignKeyConstraint =
        value.tables['instructors']?.constraints[
          'instructors_user_id_users_id_fk'
        ]

      expect(uniqueConstraint?.type).toBe('UNIQUE')
      expect(foreignKeyConstraint?.type).toBe('FOREIGN KEY')

      // Type guard to check if it's a ForeignKeyConstraint
      if (foreignKeyConstraint && foreignKeyConstraint.type === 'FOREIGN KEY') {
        expect(foreignKeyConstraint.targetTableName).toBe('users')
      }
    })

    it('multiple PostgreSQL schemas', async () => {
      const { value } = await _processor(`
        import { pgTable, serial, varchar, integer } from 'drizzle-orm/pg-core';
        import { pgSchema } from 'drizzle-orm/pg-core';

        // Define schemas
        export const authSchema = pgSchema('auth');
        export const publicSchema = pgSchema('public');

        // Auth schema table
        export const authUsers = authSchema.table('users', {
          id: serial('id').primaryKey(),
          email: varchar('email', { length: 255 }).notNull(),
        });

        // Public schema tables with foreign keys
        export const publicPosts = publicSchema.table('posts', {
          id: serial('id').primaryKey(),
          userId: integer('user_id').references(() => authUsers.id),
          title: varchar('title', { length: 255 }),
        });

        export const publicComments = publicSchema.table('comments', {
          id: serial('id').primaryKey(),
          postId: integer('post_id').references(() => publicPosts.id),
          userId: integer('user_id').references(() => authUsers.id),
        });
      `)

      // Check that all tables are parsed
      expect(Object.keys(value.tables)).toHaveLength(3)
      expect(value.tables).toHaveProperty('users')
      expect(value.tables).toHaveProperty('posts')
      expect(value.tables).toHaveProperty('comments')

      // Verify foreign key constraints across schemas
      const postsFK =
        value.tables['posts']?.constraints['posts_user_id_authUsers_id_fk']
      expect(postsFK).toBeDefined()
      if (postsFK && postsFK.type === 'FOREIGN KEY') {
        expect(postsFK.targetTableName).toBe('users') // Should reference table name, not variable name
      }

      // Verify multiple FKs in one table
      const commentsFKs = value.tables['comments']?.constraints || {}
      const foreignKeyCount = Object.values(commentsFKs).filter(
        (c: Constraint) => c.type === 'FOREIGN KEY',
      ).length
      expect(foreignKeyCount).toBe(2)
    })
  })
})
