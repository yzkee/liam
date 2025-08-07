import type { Meta, StoryObj } from '@storybook/react'
import '@xyflow/react/dist/style.css'
import {
  aColumn,
  aForeignKeyConstraint,
  aSchema,
  aTable,
} from '@liam-hq/schema'
import type React from 'react'
import { ERDRenderer } from '../ErdRenderer'
import { MockProviders } from '../mocks/providers'

const meta = {
  title: 'ERDRenderer/Diff Patterns/Table Changes',
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

const baseTable = aTable({
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
  constraints: {},
})

export const TableAdded: Story = {
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
              users: baseTable,
              posts: aTable({
                name: 'posts',
                comment: 'Newly added posts table',
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
                constraints: {
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
          previous: aSchema({
            tables: {
              users: baseTable,
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

export const TableRemoved: Story = {
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
              users: baseTable,
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: baseTable,
              posts: aTable({
                name: 'posts',
                comment: 'This table will be removed',
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
                },
                constraints: {},
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

export const TableCommentModified: Story = {
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
                ...baseTable,
                comment: 'Updated user accounts table with new features',
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
                ...baseTable,
                comment: 'Original user accounts table',
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

export const TableUnchanged: Story = {
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
              users: baseTable,
              posts: aTable({
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
                  content: aColumn({
                    name: 'content',
                    type: 'text',
                  }),
                },
                constraints: {},
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: baseTable,
              posts: aTable({
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
                },
                constraints: {},
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
