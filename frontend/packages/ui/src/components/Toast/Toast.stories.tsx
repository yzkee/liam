import type { Meta, StoryObj } from '@storybook/react'
import { Toast, ToastProvider } from './Toast'

const meta = {
  component: Toast,
  argTypes: {
    status: {
      control: 'select',
      options: ['info', 'error', 'success', 'warning'],
      description: 'The status of the toast',
    },
    isOpen: {
      control: 'boolean',
      description: 'Whether the toast is shown',
    },
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof Toast>

export default meta
type Story = StoryObj<typeof Toast>

export const Info: Story = {
  args: {
    title: 'Info Toast',
    description: 'Info Toast description',
    status: 'info',
    isOpen: true,
  },
}

export const Error: Story = {
  args: {
    title: 'Error Toast',
    description: 'Error Toast description',
    status: 'error',
    isOpen: true,
  },
}

export const Success: Story = {
  args: {
    title: 'Success Toast',
    description: 'Success Toast description',
    status: 'success',
    isOpen: true,
  },
}

export const Warning: Story = {
  args: {
    title: 'Warning Toast',
    description: 'Warning Toast description',
    status: 'warning',
    isOpen: true,
  },
}
