import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Command } from 'cmdk'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  CommandPaletteInputMode,
  CommandPaletteSuggestion,
} from '../types'
import { CommandPaletteSearchInput } from './CommandPaletteSearchInput'

const mockSetMode = vi.fn()

const wrapper = (props: PropsWithChildren) => (
  <Command>{props.children}</Command>
)

afterEach(() => {
  vi.clearAllMocks()
})

describe('in case input mode is "default"', () => {
  describe('when the user pressed > key', () => {
    it('should switch to "command" mode when value is empty', async () => {
      const user = userEvent.setup()
      render(
        <CommandPaletteSearchInput
          mode={{ type: 'default' }}
          suggestion={null}
          setMode={mockSetMode}
        />,
        { wrapper },
      )
      screen.getByRole('combobox').focus()

      await user.keyboard('>')

      expect(mockSetMode).toHaveBeenCalledWith({ type: 'command' })
    })

    it('should not switch input mode when value is not empty', async () => {
      const user = userEvent.setup()
      render(
        <CommandPaletteSearchInput
          mode={{ type: 'default' }}
          suggestion={null}
          setMode={mockSetMode}
        />,
        { wrapper },
      )
      screen.getByRole('combobox').focus()

      // make the input not empty
      await user.keyboard('hello')

      await user.keyboard('>')

      expect(mockSetMode).not.toHaveBeenCalled()
    })
  })

  describe('when the user pressed Tab key', () => {
    it('should switch to "column" mode and make the input empty when a table is suggested', async () => {
      const user = userEvent.setup()
      render(
        <CommandPaletteSearchInput
          mode={{ type: 'default' }}
          suggestion={{ type: 'table', name: 'users' }}
          setMode={mockSetMode}
        />,
        { wrapper },
      )
      const input = screen.getByRole('combobox')
      input.focus()

      // make the input not empty
      await user.keyboard('user')

      await user.keyboard('{Tab}')

      expect(mockSetMode).toHaveBeenCalledWith({
        type: 'column',
        tableName: 'users',
      })
      expect(input).toHaveValue('')
    })

    it.each<CommandPaletteSuggestion | null>([
      { type: 'command', name: 'Copy Link' },
      null,
    ])(
      'should not switch input mode and do not modify input value when suggestion is %o',
      async (suggestion) => {
        const user = userEvent.setup()
        render(
          <CommandPaletteSearchInput
            mode={{ type: 'default' }}
            suggestion={suggestion}
            setMode={mockSetMode}
          />,
          { wrapper },
        )
        const input = screen.getByRole('combobox')
        input.focus()

        // make the input not empty
        await user.keyboard('user')

        await user.keyboard('{Tab}')

        expect(mockSetMode).not.toHaveBeenCalled()
        expect(input).toHaveValue('user')
      },
    )
  })
})

describe.each<CommandPaletteInputMode>([
  { type: 'command' },
  { type: 'column', tableName: 'users' },
])('in case input mode is $type', (inputMode) => {
  describe('when the user pressed Backspace key', () => {
    it('should switch to "default" mode when value is empty', async () => {
      const user = userEvent.setup()
      render(
        <CommandPaletteSearchInput
          mode={inputMode}
          suggestion={null}
          setMode={mockSetMode}
        />,
        { wrapper },
      )
      screen.getByRole('combobox').focus()

      await user.keyboard('{backspace}')

      expect(mockSetMode).toHaveBeenCalledWith({ type: 'default' })
    })
  })

  it('should not switch input mode when value is not empty', async () => {
    const user = userEvent.setup()
    render(
      <CommandPaletteSearchInput
        mode={inputMode}
        suggestion={null}
        setMode={mockSetMode}
      />,
      { wrapper },
    )
    screen.getByRole('combobox').focus()

    // make the input not empty
    await user.keyboard('hello')

    await user.keyboard('{backspace}')

    expect(mockSetMode).not.toHaveBeenCalled()
  })
})
