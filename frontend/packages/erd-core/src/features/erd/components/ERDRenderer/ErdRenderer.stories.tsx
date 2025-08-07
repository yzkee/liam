import type { Meta, StoryObj } from '@storybook/react'
import '@xyflow/react/dist/style.css'
import type React from 'react'
import { ERDRenderer } from './ErdRenderer'
import { basicSchema } from './fixtures/schemas'
import { MockProviders } from './mocks/providers'

const meta = {
  title: 'ERDRenderer/Basic',
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
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={{ current: basicSchema }}
        showDiff={false}
        defaultShowMode="ALL_FIELDS"
      >
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story {...args} />
        </div>
      </MockProviders>
    ),
  ],
} satisfies Meta<typeof ERDRenderer>

export default meta
type Story = StoryObj<typeof ERDRenderer>

export const Default: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
}

export const WithAppBar: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: true,
  },
}

export const SidebarClosed: Story = {
  args: {
    defaultSidebarOpen: false,
    withAppBar: false,
  },
}

export const TableNameMode: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={{ current: basicSchema }}
        showDiff={false}
        defaultShowMode="TABLE_NAME"
      >
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story {...args} />
        </div>
      </MockProviders>
    ),
  ],
}

export const KeyOnlyMode: Story = {
  args: {
    defaultSidebarOpen: true,
    withAppBar: false,
  },
  decorators: [
    (Story: React.ComponentType<any>, { args }: { args: any }) => (
      <MockProviders
        schema={{ current: basicSchema }}
        showDiff={false}
        defaultShowMode="KEY_ONLY"
      >
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story {...args} />
        </div>
      </MockProviders>
    ),
  ],
}
