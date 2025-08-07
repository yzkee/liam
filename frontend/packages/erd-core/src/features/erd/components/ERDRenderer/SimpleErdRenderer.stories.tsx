import type { Meta, StoryObj } from '@storybook/react'
import '@xyflow/react/dist/style.css'

const SimpleDiffDemo = ({
  title,
  diffType,
}: {
  title: string
  diffType: 'added' | 'removed' | 'modified' | 'unchanged'
}) => {
  const getBackgroundColor = () => {
    switch (diffType) {
      case 'added':
        return '#dcfce7'
      case 'removed':
        return '#fef2f2'
      case 'modified':
        return '#fef3c7'
      case 'unchanged':
        return '#f8fafc'
    }
  }

  const getBorderColor = () => {
    switch (diffType) {
      case 'added':
        return '#16a34a'
      case 'removed':
        return '#dc2626'
      case 'modified':
        return '#d97706'
      case 'unchanged':
        return '#64748b'
    }
  }

  return (
    <div
      style={{
        padding: '16px',
        margin: '8px',
        border: `2px solid ${getBorderColor()}`,
        backgroundColor: getBackgroundColor(),
        borderRadius: '8px',
        fontFamily: 'monospace',
        minWidth: '200px',
      }}
    >
      <h3 style={{ margin: '0 0 8px 0', color: getBorderColor() }}>{title}</h3>
      <div style={{ fontSize: '12px', color: '#374151' }}>
        Status: <strong>{diffType}</strong>
      </div>
      <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
        This demonstrates how {diffType} elements appear in diff mode
      </div>
    </div>
  )
}

const meta = {
  title: 'ERDRenderer/Diff Patterns Demo',
  component: SimpleDiffDemo,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'light',
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Title of the element',
    },
    diffType: {
      control: 'select',
      options: ['added', 'removed', 'modified', 'unchanged'],
      description: 'Type of diff change',
    },
  },
} satisfies Meta<typeof SimpleDiffDemo>

export default meta
type Story = StoryObj<typeof SimpleDiffDemo>

export const AddedTable: Story = {
  args: {
    title: 'users_new',
    diffType: 'added',
  },
}

export const RemovedTable: Story = {
  args: {
    title: 'old_table',
    diffType: 'removed',
  },
}

export const ModifiedTable: Story = {
  args: {
    title: 'posts',
    diffType: 'modified',
  },
}

export const UnchangedTable: Story = {
  args: {
    title: 'comments',
    diffType: 'unchanged',
  },
}

export const AllDiffTypes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '16px',
      }}
    >
      <SimpleDiffDemo title="new_table" diffType="added" />
      <SimpleDiffDemo title="removed_table" diffType="removed" />
      <SimpleDiffDemo title="modified_table" diffType="modified" />
      <SimpleDiffDemo title="unchanged_table" diffType="unchanged" />
    </div>
  ),
}

export const TableWithColumns: Story = {
  render: () => (
    <div style={{ padding: '16px' }}>
      <SimpleDiffDemo title="users (modified)" diffType="modified" />
      <div style={{ marginLeft: '20px', marginTop: '8px' }}>
        <SimpleDiffDemo
          title="+ email_verified (added column)"
          diffType="added"
        />
        <SimpleDiffDemo
          title="- old_field (removed column)"
          diffType="removed"
        />
        <SimpleDiffDemo title="~ name (modified column)" diffType="modified" />
        <SimpleDiffDemo title="id (unchanged column)" diffType="unchanged" />
      </div>
    </div>
  ),
}
