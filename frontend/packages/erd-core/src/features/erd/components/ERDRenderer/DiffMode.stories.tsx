import type { Meta, StoryObj } from '@storybook/react'
import '@xyflow/react/dist/style.css'
import type React from 'react'
import { ERDRenderer } from './ErdRenderer'
import {
  addedTableSchema,
  diffSchemas,
  modifiedTableSchema,
  removedTableSchema,
} from './fixtures/schemas'
import { MockProviders } from './mocks/providers'

const meta = {
  title: 'ERDRenderer/Diff Mode',
  component: ERDRenderer,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  argTypes: {
    defaultSidebarOpen: {
      control: 'boolean',
      description: 'Whether the sidebar is open by default',
    },
    withAppBar: {
      control: 'boolean',
      description: 'Whether to show the app bar',
    },
  },
} satisfies Meta<typeof ERDRenderer>

export default meta
type Story = StoryObj<typeof ERDRenderer>

export const DiffModeEnabled: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={diffSchemas}
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

export const DiffModeWithAppBar: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: true,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={diffSchemas}
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

export const DiffModeTableNameOnly: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={diffSchemas}
        showDiff={true}
        defaultShowMode="TABLE_NAME"
      >
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story {...args} />
        </div>
      </MockProviders>
    ),
  ],
}

export const DiffModeKeyOnly: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={diffSchemas}
        showDiff={true}
        defaultShowMode="KEY_ONLY"
      >
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story {...args} />
        </div>
      </MockProviders>
    ),
  ],
}

export const AddedTable: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={addedTableSchema}
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

export const RemovedTable: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={removedTableSchema}
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

export const ModifiedTable: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={modifiedTableSchema}
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
