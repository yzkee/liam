import type { Meta, StoryObj } from '@storybook/react'
import '@xyflow/react/dist/style.css'
import { aColumn, aSchema, aTable } from '@liam-hq/schema'
import type React from 'react'
import { ERDRenderer } from '../ErdRenderer'
import { MockProviders } from '../mocks/providers'

const meta = {
  title: 'ERDRenderer/Diff Patterns/Column Changes',
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

export const ColumnAdded: Story = {
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
                    comment: 'Newly added email column',
                  }),
                  phone: aColumn({
                    name: 'phone',
                    type: 'varchar',
                    comment: 'Another newly added column',
                  }),
                },
                constraints: {},
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
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

export const ColumnRemoved: Story = {
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
                },
                constraints: {},
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
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
                    comment: 'This column will be removed',
                  }),
                  phone: aColumn({
                    name: 'phone',
                    type: 'varchar',
                    comment: 'This column will also be removed',
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

export const ColumnTypeModified: Story = {
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
                name: 'users',
                columns: {
                  id: aColumn({
                    name: 'id',
                    type: 'bigint',
                    notNull: true,
                  }),
                  name: aColumn({
                    name: 'name',
                    type: 'text',
                    notNull: true,
                  }),
                  email: aColumn({
                    name: 'email',
                    type: 'varchar(255)',
                    notNull: true,
                  }),
                },
                constraints: {},
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
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

export const ColumnCommentModified: Story = {
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
                name: 'users',
                columns: {
                  id: aColumn({
                    name: 'id',
                    type: 'integer',
                    notNull: true,
                    comment: 'Updated primary key comment',
                  }),
                  name: aColumn({
                    name: 'name',
                    type: 'varchar',
                    notNull: true,
                    comment: 'Updated user name comment',
                  }),
                  email: aColumn({
                    name: 'email',
                    type: 'varchar',
                    notNull: true,
                    comment: 'Updated email address comment',
                  }),
                },
                constraints: {},
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
                name: 'users',
                columns: {
                  id: aColumn({
                    name: 'id',
                    type: 'integer',
                    notNull: true,
                    comment: 'Original primary key comment',
                  }),
                  name: aColumn({
                    name: 'name',
                    type: 'varchar',
                    notNull: true,
                    comment: 'Original user name comment',
                  }),
                  email: aColumn({
                    name: 'email',
                    type: 'varchar',
                    notNull: true,
                    comment: 'Original email address comment',
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

export const ColumnDefaultModified: Story = {
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
                    default: "'Anonymous'",
                  }),
                  active: aColumn({
                    name: 'active',
                    type: 'boolean',
                    notNull: true,
                    default: 'true',
                  }),
                },
                constraints: {},
              }),
            },
            enums: {},
          }),
          previous: aSchema({
            tables: {
              users: aTable({
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
                    default: "'Unknown'",
                  }),
                  active: aColumn({
                    name: 'active',
                    type: 'boolean',
                    notNull: true,
                    default: 'false',
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
