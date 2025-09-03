import type { Meta, StoryObj } from '@storybook/nextjs'
import { type ComponentProps, useState } from 'react'
import { type SessionMode, SessionModeSelector } from './SessionModeSelector'

const meta = {
  component: SessionModeSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SessionModeSelector>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    selectedMode: 'github',
    onModeChange: () => {},
    githubTabId: 'github-tab-1',
    githubPanelId: 'github-panel-1',
    uploadTabId: 'upload-tab-1',
    uploadPanelId: 'upload-panel-1',
    urlTabId: 'url-tab-1',
    urlPanelId: 'url-panel-1',
  },
}

export const GitHubSelected: Story = {
  args: {
    selectedMode: 'github',
    onModeChange: () => {},
    githubTabId: 'github-tab-2',
    githubPanelId: 'github-panel-2',
    uploadTabId: 'upload-tab-2',
    uploadPanelId: 'upload-panel-2',
    urlTabId: 'url-tab-2',
    urlPanelId: 'url-panel-2',
  },
}

export const UploadSelected: Story = {
  args: {
    selectedMode: 'upload',
    onModeChange: () => {},
    githubTabId: 'github-tab-3',
    githubPanelId: 'github-panel-3',
    uploadTabId: 'upload-tab-3',
    uploadPanelId: 'upload-panel-3',
    urlTabId: 'url-tab-3',
    urlPanelId: 'url-panel-3',
  },
}

export const URLSelected: Story = {
  args: {
    selectedMode: 'url',
    onModeChange: () => {},
    githubTabId: 'github-tab-4',
    githubPanelId: 'github-panel-4',
    uploadTabId: 'upload-tab-4',
    uploadPanelId: 'upload-panel-4',
    urlTabId: 'url-tab-4',
    urlPanelId: 'url-panel-4',
  },
}

export const Interactive: Story = {
  args: {
    selectedMode: 'github',
    onModeChange: () => {},
    githubTabId: 'github-tab-5',
    githubPanelId: 'github-panel-5',
    uploadTabId: 'upload-tab-5',
    uploadPanelId: 'upload-panel-5',
    urlTabId: 'url-tab-5',
    urlPanelId: 'url-panel-5',
  },
  render: (args: ComponentProps<typeof SessionModeSelector>) => {
    const [selectedMode, setSelectedMode] = useState<SessionMode>(
      args.selectedMode,
    )

    return (
      <SessionModeSelector
        {...args}
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
      />
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive version with full keyboard navigation support. Use Arrow keys, Home, and End to navigate between modes.',
      },
    },
  },
}
