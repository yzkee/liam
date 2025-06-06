'use client'

import { ArrowRight, Button } from '@liam-hq/ui'
import type { ChangeEvent, FC } from 'react'
import { useActionState, useEffect, useRef, useTransition } from 'react'
import type { Projects } from '../CommonLayout/AppBar/ProjectsDropdownMenu/services/getProjects'
import styles from './SessionsNewPage.module.css'
import { createSession } from './actions/createSession'
import { getBranches } from './actions/getBranches'

type Props = {
  projects: Projects | null
}

export const SessionsNewPage: FC<Props> = ({ projects }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [_isPending, startTransition] = useTransition()
  const [state, formAction, isPending] = useActionState(createSession, {
    success: false,
  })

  const [branchesState, branchesAction, isBranchesLoading] = useActionState(
    getBranches,
    { branches: [], loading: false },
  )

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
                <label htmlFor="project" className={styles.label}>
                  Project (Optional)
                </label>
                <select
                  id="project"
                  name="projectId"
                  onChange={(e) => {
                    startTransition(() => {
                      const formData = new FormData()
                      formData.append('projectId', e.target.value)
                      branchesAction(formData)
                    })
                  }}
                  disabled={isPending}
                  className={styles.select}
                >
                  <option value="">Select a project...</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {branchesState.branches.length > 0 && (
                <div className={styles.formGroup}>
                  <label htmlFor="branch" className={styles.label}>
                    Branch
                  </label>
                  <select
                    id="branch"
                    name="gitSha"
                    disabled={isPending || isBranchesLoading}
                    className={styles.select}
                  >
                    <option value="">Select a branch...</option>
                    {branchesState.branches.map((branch) => (
                      <option key={branch.name} value={branch.sha}>
                        {branch.name}
                        {branch.protected && ' (production)'}
                      </option>
                    ))}
                  </select>
                  {isBranchesLoading && (
                    <p className={styles.loading}>Loading branches...</p>
                  )}
                  {branchesState.error && (
                    <p className={styles.error}>{branchesState.error}</p>
                  )}
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="instructions" className={styles.label}>
                  Instructions
                </label>
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
