'use client'
import type { Schema } from '@liam-hq/db-structure'
import {
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
} from '@liam-hq/ui'
import clsx from 'clsx'
import type * as React from 'react'
import type { ChangeEvent, FC, FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import styles from './ChatInput.module.css'
import { CancelButton } from './components/CancelButton'
import {
  type InputProps,
  type MentionItem,
  MentionSuggestor,
} from './components/MentionSuggestor'
import { type Mode, ModeToggleSwitch } from './components/ModeToggleSwitch'
import { SendButton } from './components/SendButton'
import {
  handleMentionSelect as getMentionText,
  handleMentionKeyboardEvents as handleMentionKeyboard,
  handleNormalKeyboardEvents as handleNormalKeyboard,
  handleRegularTextInput as isRegularTextInput,
} from './keyboardHandlers'
import { getAllMentionCandidates } from './mentionUtils'

interface ChatInputProps {
  onSendMessage: (message: string, mode: Mode) => void
  onCancel?: () => void // New prop for cancellation
  isLoading: boolean
  error?: boolean
  initialMessage?: string
  schema: Schema
  initialMode?: Mode
}

export const ChatInput: FC<ChatInputProps> = ({
  onSendMessage,
  onCancel,
  isLoading,
  error = false,
  initialMessage = '',
  schema,
  initialMode = 'ask',
}) => {
  const [message, setMessage] = useState(initialMessage)
  const [mode, setMode] = useState<Mode>(initialMode)
  const hasContent = message.trim().length > 0
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // --- States for suggestion ---
  const [mentionCaret, setMentionCaret] = useState(0)
  const [mentionVisible, setMentionVisible] = useState(false)

  // State to track IME composition status
  const [isImeComposing, setIsImeComposing] = useState(false)

  // Input props for mention suggestor
  // Use useRef instead of useState to avoid unnecessary re-renders
  const inputPropsRef = useRef<InputProps>({})

  // Adjust height on initial render
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  // Get all mention candidates from the schema
  const mentionCandidates = getAllMentionCandidates(schema)

  // Handle textarea changes
  // Update mode when initialMode changes
  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)

    // Detect mention trigger
    const caret = e.target.selectionStart
    setMentionCaret(caret)
    const before = value.slice(0, caret)
    const atMatch = /@([\w-]*)$/.exec(before)
    if (atMatch) {
      setMentionVisible(true)
    } else {
      setMentionVisible(false)
    }

    // Adjust height after content changes
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  // Handle mention suggestion selection
  const handleMentionSelect = (item: MentionItem, byKeyboard?: boolean) => {
    setMessage((prev) => getMentionText(item, prev, mentionCaret))
    setMentionVisible(false)
    if (byKeyboard) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
  }

  // When IME composition starts
  const handleCompositionStart = () => {
    setIsImeComposing(true)
  }

  // When IME composition ends
  const handleCompositionEnd = () => {
    setIsImeComposing(false)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (isLoading) {
      onCancel?.()
    } else if (hasContent) {
      // If not loading and has content, send message
      onSendMessage(message, mode)
      setMessage('')
      setTimeout(() => {
        const textarea = textareaRef.current
        if (textarea) {
          textarea.style.height = '24px'
        }
      }, 0)
    }
  }

  // Main keyboard event handler with reduced complexity
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // First check for regular text input which is always allowed
    if (isRegularTextInput(e)) {
      return
    }

    // Then handle events based on whether mention suggestions are visible
    if (mentionVisible) {
      handleMentionKeyboard(e, inputPropsRef)
    } else {
      handleNormalKeyboard(e, isImeComposing, hasContent, handleSubmit)
    }
  }

  return (
    <div className={styles.container}>
      <form
        className={clsx(
          styles.inputContainer,
          isLoading && styles.disabled,
          isLoading && styles.loading,
          error && styles.error,
        )}
        onSubmit={handleSubmit}
      >
        <div className={styles.inputWrapper} style={{ position: 'relative' }}>
          {/* Use memoized props to avoid unnecessary renders */}
          <PopoverRoot
            open={mentionVisible}
            onOpenChange={(open) => {
              // Only update if the value actually changes
              if (open !== mentionVisible) {
                setMentionVisible(open)
              }
            }}
          >
            <PopoverAnchor asChild>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleChange}
                placeholder="Ask anything, @ to mention schema tables"
                disabled={isLoading}
                className={styles.input}
                rows={1}
                data-error={error ? 'true' : undefined}
                // Apply keyboard event handlers for mention suggestions
                onKeyDown={handleKeyDown}
                // IME composition event handlers
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                // Apply ARIA attributes for accessibility
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-expanded={mentionVisible}
                aria-controls={
                  mentionVisible ? 'chatinput-suggest-list' : undefined
                }
                // Apply ID from mention input props if available
                id={
                  mentionVisible && inputPropsRef.current
                    ? inputPropsRef.current.id || undefined
                    : undefined
                }
              />
            </PopoverAnchor>
            <PopoverPortal>
              <PopoverContent
                side="top"
                align="start"
                sideOffset={4}
                style={{ minWidth: textareaRef.current?.offsetWidth || 200 }}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <MentionSuggestor
                  trigger="@"
                  input={message}
                  caret={mentionCaret}
                  candidates={mentionCandidates}
                  visible={mentionVisible}
                  noItemsMessage="No commands found"
                  onSelect={handleMentionSelect}
                  onClose={() => {
                    setMentionVisible(false)
                  }}
                  onInputProps={(inputProps) => {
                    // Directly receive inputProps
                    inputPropsRef.current = {
                      id: inputProps.id,
                      onKeyDown: inputProps.onKeyDown,
                    }
                  }}
                />
              </PopoverContent>
            </PopoverPortal>
          </PopoverRoot>
        </div>
        {isLoading ? (
          <CancelButton
            hasContent={true}
            onClick={handleSubmit}
            disabled={false}
          />
        ) : (
          <SendButton
            hasContent={hasContent}
            onClick={handleSubmit}
            disabled={isLoading || error}
          />
        )}
      </form>
      <ModeToggleSwitch
        className={styles.modeToggle}
        value={mode}
        onChange={setMode}
      />
    </div>
  )
}
