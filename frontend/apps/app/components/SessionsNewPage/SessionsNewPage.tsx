'use client'

import { ArrowRight, Button } from '@liam-hq/ui'
import type { ChangeEvent, FC } from 'react'
import { useActionState, useEffect, useRef } from 'react'
import styles from './SessionsNewPage.module.css'
import { createSession } from './actions/createSession'

export const SessionsNewPage: FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [state, formAction, isPending] = useActionState(createSession, {
    success: false,
  })

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  // TODO: Implement page navigation with initial message handling
  // When navigating to the session page, the initial message should be sent
  // to start the chat conversation automatically

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <h1 className={styles.title}>What can I help you Database Design?</h1>
        <div className={styles.formContainer}>
          <form action={formAction}>
            <div className={styles.formContent}>
              <div className={styles.formGroup}>
                <div className={styles.inputWrapper}>
                  <textarea
                    id="instructions"
                    name="instructions"
                    ref={textareaRef}
                    onChange={handleChange}
                    placeholder="Enter your database design instructions. For example: Design a database for an e-commerce site that manages users, products, and orders..."
                    disabled={isPending}
                    className={styles.textarea}
                    rows={6}
                    aria-label="Database design instructions"
                  />
                  {state.error && <p className={styles.error}>{state.error}</p>}
                </div>
              </div>
            </div>
            <div className={styles.divider} />
            <div className={styles.buttonContainer}>
              <Button
                type="submit"
                variant="solid-primary"
                disabled={isPending}
                isLoading={isPending}
                className={styles.buttonCustom}
                loadingIndicatorType="content"
              >
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
