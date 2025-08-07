import type { Meta, StoryObj } from '@storybook/react'
import '@xyflow/react/dist/style.css'
import { aColumn, aSchema, aTable } from '@liam-hq/schema'
import type React from 'react'
import { ERDRenderer } from '../ErdRenderer'
import { MockProviders } from '../mocks/providers'

const aIndex = (props: {
  name: string
  columnNames: string[]
  unique?: boolean
}) => ({
  name: props.name,
  columns: props.columnNames,
  unique: props.unique ?? false,
  type: 'btree',
})

const meta = {
  title: 'ERDRenderer/Diff Patterns/Index Changes',
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
    created_at: aColumn({
      name: 'created_at',
      type: 'timestamp',
      notNull: true,
    }),
  },
  constraints: {},
})

export const IndexAdded: Story = {
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
                indexes: {
                  idx_users_email: aIndex({
                    name: 'idx_users_email',
                    columnNames: ['email'],
                    unique: true,
                  }),
                  idx_users_name: aIndex({
                    name: 'idx_users_name',
                    columnNames: ['name'],
                    unique: false,
                  }),
                  idx_users_created_at: aIndex({
                    name: 'idx_users_created_at',
                    columnNames: ['created_at'],
                    unique: false,
                  }),
                },
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
                ...baseTable,
                indexes: {
                  idx_users_email: aIndex({
                    name: 'idx_users_email',
                    columnNames: ['email'],
                    unique: true,
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

export const IndexRemoved: Story = {
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
                indexes: {
                  idx_users_email: aIndex({
                    name: 'idx_users_email',
                    columnNames: ['email'],
                    unique: true,
                  }),
                },
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
                ...baseTable,
                indexes: {
                  idx_users_email: aIndex({
                    name: 'idx_users_email',
                    columnNames: ['email'],
                    unique: true,
                  }),
                  idx_users_name: aIndex({
                    name: 'idx_users_name',
                    columnNames: ['name'],
                    unique: false,
                  }),
                  idx_users_created_at: aIndex({
                    name: 'idx_users_created_at',
                    columnNames: ['created_at'],
                    unique: false,
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

export const IndexUniqueModified: Story = {
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
                indexes: {
                  idx_users_email: aIndex({
                    name: 'idx_users_email',
                    columnNames: ['email'],
                    unique: true,
                  }),
                  idx_users_name: aIndex({
                    name: 'idx_users_name',
                    columnNames: ['name'],
                    unique: true,
                  }),
                },
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
                ...baseTable,
                indexes: {
                  idx_users_email: aIndex({
                    name: 'idx_users_email',
                    columnNames: ['email'],
                    unique: true,
                  }),
                  idx_users_name: aIndex({
                    name: 'idx_users_name',
                    columnNames: ['name'],
                    unique: false,
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

export const IndexColumnsModified: Story = {
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
                indexes: {
                  idx_users_composite: aIndex({
                    name: 'idx_users_composite',
                    columnNames: ['name', 'email', 'created_at'],
                    unique: false,
                  }),
                },
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
                ...baseTable,
                indexes: {
                  idx_users_composite: aIndex({
                    name: 'idx_users_composite',
                    columnNames: ['name', 'email'],
                    unique: false,
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

export const IndexNameModified: Story = {
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
                indexes: {
                  idx_users_email_new: aIndex({
                    name: 'idx_users_email_new',
                    columnNames: ['email'],
                    unique: true,
                  }),
                },
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
                ...baseTable,
                indexes: {
                  idx_users_email_old: aIndex({
                    name: 'idx_users_email_old',
                    columnNames: ['email'],
                    unique: true,
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
