import type { Preview } from '@storybook/react'
import '@liam-hq/ui/src/styles/globals.css'
import { initialize, mswDecorator } from 'msw-storybook-addon'

// Initialize MSW
initialize()

// Mock Supabase environment variables
if (typeof process !== 'undefined') {
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key'
}

const decorators = [mswDecorator]

const preview: Preview = {
  decorators,
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'light', value: '#f8f8f8' },
        { name: 'dark', value: '#333333' },
      ],
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default preview
