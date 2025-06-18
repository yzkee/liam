import type { Meta, StoryObj } from '@storybook/react'
import { SessionFormActions } from './SessionFormActions'

const meta = {
  title: 'Features/Sessions/SessionFormActions',
  component: SessionFormActions,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof SessionFormActions>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
