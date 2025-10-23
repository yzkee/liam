import type { Meta, StoryObj } from '@storybook/nextjs'
import { EmptyProjectsState } from './EmptyProjectsState'

const meta = {
  component: EmptyProjectsState,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    createProjectHref: '/organizations/new',
  },
} satisfies Meta<typeof EmptyProjectsState>

export default meta
type Story = StoryObj<typeof EmptyProjectsState>

export const NoProjects: Story = {
  args: {
    projects: null,
  },
}

export const NoSearchResults: Story = {
  args: {
    projects: [],
  },
}
