import { SchemaProvider } from '@/stores'
import type { SchemaStore } from '@/stores/schema/schema'
import { aTable } from '@liam-hq/db-structure'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { CommandPalette } from './CommandPalette'

afterEach(() => {
  cleanup()
})

const schema: SchemaStore = {
  current: {
    tables: {
      users: aTable({ name: 'users' }),
      posts: aTable({ name: 'posts' }),
      follows: aTable({ name: 'follows' }),
      user_settings: aTable({ name: 'user_settings' }),
    },
    tableGroups: {},
    relationships: {},
  },
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <SchemaProvider schema={schema}>{children}</SchemaProvider>
)

it('displays nothing by default', () => {
  render(<CommandPalette />, { wrapper })

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

describe('dialog opening interactions', () => {
  it('opens the dialog with typing ⌘K', async () => {
    const user = userEvent.setup()

    render(<CommandPalette />, { wrapper })

    await user.keyboard('{Meta>}k{/Meta}')

    expect(
      screen.getByRole('dialog', { name: 'Command Palette' }),
    ).toBeInTheDocument()
  })

  it('opens the dialog with typing ctrl+K', async () => {
    const user = userEvent.setup()

    render(<CommandPalette />, { wrapper })

    await user.keyboard('{Control>}k{/Control}')

    expect(
      screen.getByRole('dialog', { name: 'Command Palette' }),
    ).toBeInTheDocument()
  })
})
