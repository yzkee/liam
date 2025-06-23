import { describe, expect, it } from 'vitest'
import type { Tables } from '../schema/index.js'
import { constraintsToRelationships } from './constraintsToRelationships.js'

describe('constraintsToRelationships', () => {
  it('should convert foreign key constraints to relationships', () => {
    const tables: Tables = {
      users: {
        name: 'users',
        columns: {
          id: {
            name: 'id',
            type: 'bigint',
            primary: true,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
          name: {
            name: 'name',
            type: 'varchar',
            primary: false,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
        },
        indexes: {},
        constraints: {},
        comment: null,
      },
      posts: {
        name: 'posts',
        columns: {
          id: {
            name: 'id',
            type: 'bigint',
            primary: true,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
          user_id: {
            name: 'user_id',
            type: 'bigint',
            primary: false,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
        },
        indexes: {},
        constraints: {
          fk_posts_user: {
            type: 'FOREIGN KEY',
            name: 'fk_posts_user',
            columnName: 'user_id',
            targetTableName: 'users',
            targetColumnName: 'id',
            updateConstraint: 'CASCADE',
            deleteConstraint: 'CASCADE',
          },
        },
        comment: null,
      },
    }

    const result = constraintsToRelationships(tables)

    expect(result).toEqual({
      fk_posts_user: {
        name: 'fk_posts_user',
        primaryTableName: 'users',
        primaryColumnName: 'id',
        foreignTableName: 'posts',
        foreignColumnName: 'user_id',
        cardinality: 'ONE_TO_MANY',
        updateConstraint: 'CASCADE',
        deleteConstraint: 'CASCADE',
      },
    })
  })

  it('should detect ONE_TO_ONE relationship when foreign key column is unique', () => {
    const tables: Tables = {
      users: {
        name: 'users',
        columns: {
          id: {
            name: 'id',
            type: 'bigint',
            primary: true,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
        },
        indexes: {},
        constraints: {},
        comment: null,
      },
      profiles: {
        name: 'profiles',
        columns: {
          id: {
            name: 'id',
            type: 'bigint',
            primary: true,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
          user_id: {
            name: 'user_id',
            type: 'bigint',
            primary: false,
            unique: true, // unique column
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
        },
        indexes: {},
        constraints: {
          fk_profiles_user: {
            type: 'FOREIGN KEY',
            name: 'fk_profiles_user',
            columnName: 'user_id',
            targetTableName: 'users',
            targetColumnName: 'id',
            updateConstraint: 'CASCADE',
            deleteConstraint: 'CASCADE',
          },
        },
        comment: null,
      },
    }

    const result = constraintsToRelationships(tables)

    expect(result['fk_profiles_user']?.cardinality).toBe('ONE_TO_ONE')
  })

  it('should detect ONE_TO_ONE relationship when column has UNIQUE constraint', () => {
    const tables: Tables = {
      users: {
        name: 'users',
        columns: {
          id: {
            name: 'id',
            type: 'bigint',
            primary: true,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
        },
        indexes: {},
        constraints: {},
        comment: null,
      },
      profiles: {
        name: 'profiles',
        columns: {
          id: {
            name: 'id',
            type: 'bigint',
            primary: true,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
          user_id: {
            name: 'user_id',
            type: 'bigint',
            primary: false,
            unique: false, // not unique on column
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
        },
        indexes: {},
        constraints: {
          fk_profiles_user: {
            type: 'FOREIGN KEY',
            name: 'fk_profiles_user',
            columnName: 'user_id',
            targetTableName: 'users',
            targetColumnName: 'id',
            updateConstraint: 'CASCADE',
            deleteConstraint: 'CASCADE',
          },
          uk_user_id: {
            type: 'UNIQUE',
            name: 'uk_user_id',
            columnName: 'user_id',
          },
        },
        comment: null,
      },
    }

    const result = constraintsToRelationships(tables)

    expect(result['fk_profiles_user']?.cardinality).toBe('ONE_TO_ONE')
  })

  it('should handle multiple foreign key constraints', () => {
    const tables: Tables = {
      users: {
        name: 'users',
        columns: {
          id: {
            name: 'id',
            type: 'bigint',
            primary: true,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
        },
        indexes: {},
        constraints: {},
        comment: null,
      },
      categories: {
        name: 'categories',
        columns: {
          id: {
            name: 'id',
            type: 'bigint',
            primary: true,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
        },
        indexes: {},
        constraints: {},
        comment: null,
      },
      posts: {
        name: 'posts',
        columns: {
          id: {
            name: 'id',
            type: 'bigint',
            primary: true,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
          user_id: {
            name: 'user_id',
            type: 'bigint',
            primary: false,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
          category_id: {
            name: 'category_id',
            type: 'bigint',
            primary: false,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
        },
        indexes: {},
        constraints: {
          fk_posts_user: {
            type: 'FOREIGN KEY',
            name: 'fk_posts_user',
            columnName: 'user_id',
            targetTableName: 'users',
            targetColumnName: 'id',
            updateConstraint: 'CASCADE',
            deleteConstraint: 'CASCADE',
          },
          fk_posts_category: {
            type: 'FOREIGN KEY',
            name: 'fk_posts_category',
            columnName: 'category_id',
            targetTableName: 'categories',
            targetColumnName: 'id',
            updateConstraint: 'CASCADE',
            deleteConstraint: 'SET_NULL',
          },
        },
        comment: null,
      },
    }

    const result = constraintsToRelationships(tables)

    expect(Object.keys(result)).toHaveLength(2)
    expect(result['fk_posts_user']).toBeDefined()
    expect(result['fk_posts_category']).toBeDefined()
    expect(result['fk_posts_category']?.deleteConstraint).toBe('SET_NULL')
  })

  it('should return empty object when no foreign key constraints exist', () => {
    const tables: Tables = {
      users: {
        name: 'users',
        columns: {
          id: {
            name: 'id',
            type: 'bigint',
            primary: true,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
        },
        indexes: {},
        constraints: {
          pk_users: {
            type: 'PRIMARY KEY',
            name: 'pk_users',
            columnName: 'id',
          },
        },
        comment: null,
      },
    }

    const result = constraintsToRelationships(tables)

    expect(result).toEqual({})
  })

  it('should ignore non-foreign key constraints', () => {
    const tables: Tables = {
      users: {
        name: 'users',
        columns: {
          id: {
            name: 'id',
            type: 'bigint',
            primary: true,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
          email: {
            name: 'email',
            type: 'varchar',
            primary: false,
            unique: true,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
          age: {
            name: 'age',
            type: 'integer',
            primary: false,
            unique: false,
            notNull: true,
            default: null,
            check: null,
            comment: null,
          },
        },
        indexes: {},
        constraints: {
          pk_users: {
            type: 'PRIMARY KEY',
            name: 'pk_users',
            columnName: 'id',
          },
          uk_email: {
            type: 'UNIQUE',
            name: 'uk_email',
            columnName: 'email',
          },
          chk_age: {
            type: 'CHECK',
            name: 'chk_age',
            detail: 'age >= 0',
          },
        },
        comment: null,
      },
    }

    const result = constraintsToRelationships(tables)

    expect(result).toEqual({})
  })
})
