import {
  aColumn,
  aForeignKeyConstraint,
  aSchema,
  aTable,
  aUniqueConstraint,
} from '@liam-hq/schema'

// Basic schema without diff
export const basicSchema = aSchema({
  tables: {
    users: aTable({
      name: 'users',
      comment: 'User accounts table',
      columns: {
        id: aColumn({
          name: 'id',
          type: 'integer',
          notNull: true,
          comment: 'Primary key',
        }),
        name: aColumn({
          name: 'name',
          type: 'varchar',
          notNull: true,
          comment: 'User full name',
        }),
        email: aColumn({
          name: 'email',
          type: 'varchar',
          notNull: true,
          comment: 'User email address',
        }),
        created_at: aColumn({
          name: 'created_at',
          type: 'timestamp',
          notNull: true,
          default: 'CURRENT_TIMESTAMP',
        }),
        updated_at: aColumn({
          name: 'updated_at',
          type: 'timestamp',
          notNull: true,
          default: 'CURRENT_TIMESTAMP',
        }),
      },
      constraints: {
        users_email_unique: aUniqueConstraint({
          name: 'users_email_unique',
          columnNames: ['email'],
        }),
      },
    }),
    posts: aTable({
      name: 'posts',
      comment: 'Blog posts table',
      columns: {
        id: aColumn({
          name: 'id',
          type: 'integer',
          notNull: true,
        }),
        title: aColumn({
          name: 'title',
          type: 'varchar',
          notNull: true,
          comment: 'Post title',
        }),
        content: aColumn({
          name: 'content',
          type: 'text',
          comment: 'Post content',
        }),
        user_id: aColumn({
          name: 'user_id',
          type: 'integer',
          notNull: true,
          comment: 'Author user ID',
        }),
        published: aColumn({
          name: 'published',
          type: 'boolean',
          notNull: true,
          default: 'false',
        }),
        created_at: aColumn({
          name: 'created_at',
          type: 'timestamp',
          notNull: true,
          default: 'CURRENT_TIMESTAMP',
        }),
      },
      constraints: {
        posts_user_id_fkey: aForeignKeyConstraint({
          name: 'posts_user_id_fkey',
          columnNames: ['user_id'],
          targetTableName: 'users',
          targetColumnNames: ['id'],
          deleteConstraint: 'CASCADE',
          updateConstraint: 'CASCADE',
        }),
      },
    }),
  },
  enums: {},
})

// Previous schema for diff
const previousSchema = aSchema({
  tables: {
    users: aTable({
      name: 'users',
      comment: 'User accounts table',
      columns: {
        id: aColumn({
          name: 'id',
          type: 'integer',
          notNull: true,
        }),
        name: aColumn({
          name: 'name',
          type: 'varchar',
          notNull: true,
        }),
        email: aColumn({
          name: 'email',
          type: 'varchar',
          notNull: true,
        }),
      },
      constraints: {
        users_email_unique: aUniqueConstraint({
          name: 'users_email_unique',
          columnNames: ['email'],
        }),
      },
    }),
    // posts table will be "added" in diff
  },
  enums: {},
})

// Schema with various diff patterns
export const diffSchemas = {
  current: basicSchema,
  previous: previousSchema,
}

// Create a deep copy of a table to avoid reference issues
const cloneTable = (table: any) => {
  if (!table) return table
  return JSON.parse(JSON.stringify(table))
}

// Schema with added table
export const addedTableSchema = {
  current: basicSchema,
  previous: aSchema({
    tables: {
      users: cloneTable(basicSchema.tables['users']),
      // posts table is missing in previous schema
    },
    enums: {},
  }),
}

// Schema with removed table
export const removedTableSchema = {
  current: aSchema({
    tables: {
      users: cloneTable(basicSchema.tables['users']),
      // posts table is missing in current schema
    },
    enums: {},
  }),
  previous: basicSchema,
}

// Schema with modified table
export const modifiedTableSchema = {
  current: basicSchema,
  previous: aSchema({
    tables: {
      users: aTable({
        name: 'users',
        comment: 'Old user accounts table comment', // Changed comment
        columns: { ...basicSchema.tables['users']?.columns },
        constraints: { ...basicSchema.tables['users']?.constraints },
      }),
      posts: cloneTable(basicSchema.tables['posts']),
    },
    enums: {},
  }),
}
