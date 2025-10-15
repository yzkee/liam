import type { Meta, StoryObj } from '@storybook/nextjs'
import { Skeleton } from './Skeleton'

const meta = {
  component: Skeleton,
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'rectangular', 'circular'],
      description: 'The variant of the skeleton',
    },
    width: {
      control: 'text',
      description: 'The width of the skeleton (CSS value)',
    },
    height: {
      control: 'text',
      description: 'The height of the skeleton (CSS value)',
    },
  },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof Skeleton>

export const Text: Story = {
  args: {
    variant: 'text',
    width: '200px',
  },
}

export const TextMultiline: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="90%" />
    </div>
  ),
}

export const Rectangular: Story = {
  args: {
    variant: 'rectangular',
    width: '200px',
    height: '100px',
  },
}

export const Circular: Story = {
  args: {
    variant: 'circular',
    width: '48px',
    height: '48px',
  },
}

export const Avatar: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Skeleton variant="circular" width="40px" height="40px" />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
  ),
}

export const Card: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '300px',
      }}
    >
      <Skeleton variant="rectangular" width="100%" height="180px" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="60%" />
    </div>
  ),
}

export const CustomDimensions: Story = {
  args: {
    variant: 'rectangular',
    width: '150px',
    height: '150px',
  },
}

export const FullWidth: Story = {
  args: {
    variant: 'rectangular',
    width: '100%',
    height: '40px',
  },
}
