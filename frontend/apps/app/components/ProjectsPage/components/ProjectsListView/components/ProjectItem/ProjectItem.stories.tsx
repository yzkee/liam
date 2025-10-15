import type { Meta, StoryObj } from '@storybook/nextjs'
import { ProjectItem } from './ProjectItem'

const meta = {
  component: ProjectItem,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    project: {
      description: 'Project data including repository mappings',
    },
  },
} satisfies Meta<typeof ProjectItem>

export default meta
type Story = StoryObj<typeof ProjectItem>

export const WithRepository: Story = {
  args: {
    project: {
      id: 'project-1',
      name: 'Main Application',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      organization_id: 'org-1',
      project_repository_mappings: [
        {
          repository: {
            id: 'repo-1',
            name: 'main-app',
            owner: 'acme-corp',
            github_installation_identifier: 12345,
            github_repository_identifier: 67890,
            organization_id: 'org-1',
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z',
          },
        },
      ],
    },
  },
}

export const WithoutRepository: Story = {
  args: {
    project: {
      id: 'project-2',
      name: 'Demo Project',
      created_at: '2024-02-20T14:45:00Z',
      updated_at: '2024-02-20T14:45:00Z',
      organization_id: 'org-1',
    },
  },
}

export const LongProjectName: Story = {
  args: {
    project: {
      id: 'project-3',
      name: 'Very Long Project Name That Might Need Truncation',
      created_at: '2024-03-10T08:15:00Z',
      updated_at: '2024-03-10T08:15:00Z',
      organization_id: 'org-1',
      project_repository_mappings: [
        {
          repository: {
            id: 'repo-3',
            name: 'long-repository-name',
            owner: 'very-long-organization-name',
            github_installation_identifier: 78901,
            github_repository_identifier: 23456,
            organization_id: 'org-1',
            created_at: '2024-03-10T08:15:00Z',
            updated_at: '2024-03-10T08:15:00Z',
          },
        },
      ],
    },
  },
}
