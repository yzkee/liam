'use client'

import { Button } from '@liam-hq/ui'
import { useRouter } from 'next/navigation'
import type { ChangeEvent, FC, FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as v from 'valibot'
import styles from './SessionsNewPage.module.css'

const ApiSessionsCreateSchema = v.object({
  success: v.boolean(),
  designSession: v.object({
    id: v.string(),
  }),
})

export const SessionsNewPage: FC = () => {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [instructions, setInstructions] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasContent = instructions.trim().length > 0

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInstructions(value)

    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  const createSession = useCallback(async () => {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      throw new Error('Failed to create session')
    }

    const data = await response.json()
    const result = v.safeParse(ApiSessionsCreateSchema, data)

    if (!result.success) {
      throw new Error('Invalid response format')
    }

    if (!result.output.success) {
      throw new Error('Session creation failed')
    }

    return result.output.designSession
  }, [])

  const sendInitialMessage = useCallback(
    async (_sessionId: string, message: string) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          schemaData: { tables: {}, relationships: {}, tableGroups: {} },
          history: [],
          mode: 'build',
          organizationId: null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send initial message')
      }
    },
    [],
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!hasContent || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const session = await createSession()

      await sendInitialMessage(session.id, instructions)

      router.push(`/app/design_sessions/${session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>What can I help you design?</h1>
        <p className={styles.subtitle}>
          Enter your database design instructions to get started
        </p>
      </div>
      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <textarea
            ref={textareaRef}
            value={instructions}
            onChange={handleChange}
            placeholder="Enter your database design instructions. For example: Design a database for an e-commerce site that manages users, products, and orders..."
            disabled={isLoading}
            className={styles.textarea}
            rows={6}
          />
          {error && <div className={styles.error}>{error}</div>}
          <Button
            type="submit"
            variant="solid-primary"
            size="lg"
            disabled={!hasContent || isLoading}
            isLoading={isLoading}
            className={styles.submitButton}
          >
            {isLoading ? 'Creating Session...' : 'Start Design Session'}
          </Button>
        </form>
      </div>
    </div>
  )
}
