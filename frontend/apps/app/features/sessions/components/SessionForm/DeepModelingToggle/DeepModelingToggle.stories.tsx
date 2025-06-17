import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { DeepModelingToggle } from './DeepModelingToggle'

const meta: Meta<typeof DeepModelingToggle> = {
  title: 'Features/Sessions/DeepModelingToggle',
  component: DeepModelingToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isActive: false,
    children: 'Deep Modeling',
  },
}

export const Active: Story = {
  args: {
    isActive: true,
    children: 'Deep Modeling',
  },
}

export const Interactive: Story = {
  render: () => {
    const [isActive, setIsActive] = useState(false)

    return (
      <DeepModelingToggle
        isActive={isActive}
        onClick={() => setIsActive(!isActive)}
      >
        Deep Modeling
      </DeepModelingToggle>
    )
  },
}