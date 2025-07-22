import { describe, expect, it } from 'vitest'
import { processor as _processor } from '../index.js'

describe(_processor, () => {
  // MySQL-specific tests (tests that are unique to MySQL and not covered by unified tests)
  describe('MySQL-specific functionality', () => {
    it('test actual MySQL schema pattern', async () => {
      const { value } = await _processor(`
        import {
          mysqlTable,
          mysqlEnum,
          int,
          text,
          timestamp,
          boolean,
          decimal,
          json,
          varchar,
          primaryKey,
        } from 'drizzle-orm/mysql-core';
        import { relations } from 'drizzle-orm';

        export const userRoleEnum = mysqlEnum('user_role', ['student', 'instructor', 'admin']);

        export const users = mysqlTable('users', {
          id: int('id').primaryKey().autoincrement(),
          name: text('name').notNull(),
          email: varchar('email', { length: 255 }).notNull().unique(),
          passwordHash: text('password_hash').notNull(),
          role: userRoleEnum.default('student').notNull(),
          bio: text('bio'),
          profilePictureUrl: text('profile_picture_url'),
          createdAt: timestamp('created_at').defaultNow().notNull(),
          updatedAt: timestamp('updated_at').defaultNow().notNull(),
        });

        export const instructors = mysqlTable('instructors', {
          id: int('id').primaryKey().autoincrement(),
          userId: int('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
          specialization: text('specialization'),
          experienceYears: int('experience_years').default(0).notNull(),
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

    it('table-level unique constraints', async () => {
      const { value } = await _processor(`
        import { mysqlTable, int, varchar, unique } from 'drizzle-orm/mysql-core';

        export const users = mysqlTable('users', {
          id: int('id').primaryKey().autoincrement(),
          firstName: varchar('first_name', { length: 255 }),
          lastName: varchar('last_name', { length: 255 }),
          email: varchar('email', { length: 255 }),
        }, (table) => ({
          fullNameUnique: unique('users_full_name_unique').on(table.firstName, table.lastName),
          emailUnique: unique('users_email_unique').on(table.email),
        }));
      `)

      expect(value.tables['users']?.constraints).toHaveProperty(
        'users_full_name_unique',
      )
      expect(
        value.tables['users']?.constraints['users_full_name_unique'],
      ).toEqual({
        type: 'UNIQUE',
        name: 'users_full_name_unique',
        columnNames: ['firstName', 'lastName'],
      })

      expect(value.tables['users']?.constraints).toHaveProperty(
        'users_email_unique',
      )
      expect(value.tables['users']?.constraints['users_email_unique']).toEqual({
        type: 'UNIQUE',
        name: 'users_email_unique',
        columnNames: ['email'],
      })
    })
  })
})
