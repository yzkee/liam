import type { Meta, StoryObj } from '@storybook/react'
import '@xyflow/react/dist/style.css'
import {
  aColumn,
  aForeignKeyConstraint,
  aSchema,
  aTable,
  aUniqueConstraint,
} from '@liam-hq/schema'
import type React from 'react'
import { ERDRenderer } from '../ErdRenderer'
import { MockProviders } from '../mocks/providers'

const meta = {
  title: 'ERDRenderer/Diff Patterns/Constraint Changes',
  component: ERDRenderer,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
} satisfies Meta<typeof ERDRenderer>

export default meta
type Story = StoryObj<typeof ERDRenderer>

const usersTable = aTable({
  name: 'users',
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
  constraints: {},
})

const postsTable = aTable({
  name: 'posts',
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
    }),
    user_id: aColumn({
      name: 'user_id',
      type: 'integer',
      notNull: true,
    }),
  },
  constraints: {},
})

export const ForeignKeyConstraintAdded: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={{
          current: aSchema({
            tables: {
              users: usersTable,
              posts: aTable({
                ...postsTable,
                constraints: {
                  ...postsTable.constraints,
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
          }),
          previous: aSchema({
            tables: {
              users: usersTable,
              posts: postsTable,
            },
            enums: {},
          }),
        }}
        showDiff={true}
        defaultShowMode="ALL_FIELDS"
      >
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story {...args} />
        </div>
      </MockProviders>
    ),
  ],
}

export const UniqueConstraintAdded: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={{
          current: aSchema({
            tables: {
              users: aTable({
                ...usersTable,
                constraints: {
                  ...usersTable.constraints,
                  users_email_unique: aUniqueConstraint({
                    name: 'users_email_unique',
                    columnNames: ['email'],
                  }),
                  users_name_unique: aUniqueConstraint({
                    name: 'users_name_unique',
                    columnNames: ['name'],
                  }),
                },
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: usersTable,
            },
            enums: {},
          }),
        }}
        showDiff={true}
        defaultShowMode="ALL_FIELDS"
      >
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story {...args} />
        </div>
      </MockProviders>
    ),
  ],
}

export const ConstraintRemoved: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={{
          current: aSchema({
            tables: {
              users: usersTable,
              posts: postsTable,
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
                ...usersTable,
                constraints: {
                  ...usersTable.constraints,
                  users_email_unique: aUniqueConstraint({
                    name: 'users_email_unique',
                    columnNames: ['email'],
                  }),
                },
              }),
              posts: aTable({
                ...postsTable,
                constraints: {
                  ...postsTable.constraints,
                  posts_user_id_fkey: aForeignKeyConstraint({
                    name: 'posts_user_id_fkey',
                    columnNames: ['user_id'],
                    targetTableName: 'users',
                    targetColumnNames: ['id'],
                  }),
                },
              }),
            },
            enums: {},
          }),
        }}
        showDiff={true}
        defaultShowMode="ALL_FIELDS"
      >
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story {...args} />
        </div>
      </MockProviders>
    ),
  ],
}

export const ForeignKeyConstraintModified: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={{
          current: aSchema({
            tables: {
              users: usersTable,
              posts: aTable({
                ...postsTable,
                constraints: {
                  ...postsTable.constraints,
                  posts_user_id_fkey: aForeignKeyConstraint({
                    name: 'posts_user_id_fkey',
                    columnNames: ['user_id'],
                    targetTableName: 'users',
                    targetColumnNames: ['id'],
                    deleteConstraint: 'CASCADE',
                    updateConstraint: 'RESTRICT',
                  }),
                },
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: usersTable,
              posts: aTable({
                ...postsTable,
                constraints: {
                  ...postsTable.constraints,
                  posts_user_id_fkey: aForeignKeyConstraint({
                    name: 'posts_user_id_fkey',
                    columnNames: ['user_id'],
                    targetTableName: 'users',
                    targetColumnNames: ['id'],
                    deleteConstraint: 'SET_NULL',
                    updateConstraint: 'CASCADE',
                  }),
                },
              }),
            },
            enums: {},
          }),
        }}
        showDiff={true}
        defaultShowMode="ALL_FIELDS"
      >
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story {...args} />
        </div>
      </MockProviders>
    ),
  ],
}
