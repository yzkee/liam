'use client'

import type { Projects } from '@/components/CommonLayout/AppBar/ProjectsDropdownMenu/services/getProjects'
import { createSession } from '@/components/SessionsNewPage/actions/createSession'
import { getBranches } from '@/components/SessionsNewPage/actions/getBranches'
import { ArrowRight, Button } from '@liam-hq/ui'
import type { ChangeEvent, FC } from 'react'
import { useActionState, useEffect, useRef, useTransition } from 'react'
import styles from './SessionForm.module.css'

type Props = {
  projects: Projects | null
  defaultProjectId?: string
}

export const SessionForm: FC<Props> = ({ projects, defaultProjectId }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [, startTransition] = useTransition()
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

  // Auto-load branches when a default project is provided (e.g., from ProjectSessionsPage)
  // This ensures users don't need to manually reselect the project to see branch options
  useEffect(() => {
    if (defaultProjectId && projects?.some((p) => p.id === defaultProjectId)) {
      startTransition(() => {
        const formData = new FormData()
        formData.append('projectId', defaultProjectId)
        branchesAction(formData)
      })
    }
  }, [defaultProjectId, projects, branchesAction])

  return (
    <div className={styles.container}>
      <form action={formAction}>
        <div className={styles.formContent}>
          <div className={styles.formGroup}>
            <label htmlFor="project" className={styles.label}>
              Project (Optional)
            </label>
            <select
              id="project"
              name="projectId"
              value={defaultProjectId || ''}
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
                  <option key={branch.sha} value={branch.sha}>
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
            <label htmlFor="initialMessage" className={styles.label}>
              Initial message *
            </label>
            <div className={styles.inputWrapper}>
              <textarea
                id="initialMessage"
                name="initialMessage"
                ref={textareaRef}
                onChange={handleChange}
                placeholder="Enter your database design instructions. For example: Design a database for an e-commerce site that manages users, products, and orders..."
                disabled={isPending}
                className={styles.textarea}
                rows={6}
                aria-label="Initial message for database design"
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
  )
}
