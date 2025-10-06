import type { Meta, StoryObj } from '@storybook/nextjs'
import { SchemaFilePathForm } from './SchemaFilePathForm'

const meta = {
  component: SchemaFilePathForm,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    projectId: {
      description: 'The project ID',
      control: 'text',
    },
    existingPath: {
      description: 'Existing schema file path',
      control: 'text',
    },
    existingFormat: {
      description: 'Existing schema format',
      control: 'select',
      options: ['schemarb', 'postgres', 'prisma', 'tbls', null, undefined],
    },
  },
} satisfies Meta<typeof SchemaFilePathForm>

export default meta
type Story = StoryObj<typeof SchemaFilePathForm>

export const Empty: Story = {
  args: {
    projectId: 'project-123',
    existingPath: null,
    existingFormat: null,
  },
}

export const WithExistingPostgresPath: Story = {
  args: {
    projectId: 'project-123',
    existingPath: 'schema.sql',
    existingFormat: 'postgres',
  },
}

export const WithExistingRailsPath: Story = {
  args: {
    projectId: 'project-123',
    existingPath: 'db/schema.rb',
    existingFormat: 'schemarb',
  },
}

export const WithExistingPrismaPath: Story = {
  args: {
    projectId: 'project-123',
    existingPath: 'prisma/schema.prisma',
    existingFormat: 'prisma',
  },
}

export const WithExistingTblsPath: Story = {
  args: {
    projectId: 'project-123',
    existingPath: 'tbls.yml',
    existingFormat: 'tbls',
  },
}

export const WithLongPath: Story = {
  args: {
    projectId: 'project-123',
    existingPath: 'database/migrations/very/long/path/to/schema/file.sql',
    existingFormat: 'postgres',
  },
}
