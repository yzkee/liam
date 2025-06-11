import type { Projects } from '@/components/CommonLayout/AppBar/ProjectsDropdownMenu/services/getProjects'
import { ArrowRight, Button } from '@liam-hq/ui'
import type { ChangeEvent, DragEvent, FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import styles from './SessionFormPresenter.module.css'
import { type SessionMode, SessionModeSelector } from './SessionModeSelector'

type Branch = {
  name: string
  sha: string
  protected: boolean
}

type Props = {
  projects: Projects
  defaultProjectId?: string
  branches: Branch[]
  isBranchesLoading: boolean
  branchesError?: string
  formError?: string
  isPending: boolean
  onProjectChange: (projectId: string) => void
  formAction: (formData: FormData) => void
}

export const SessionFormPresenter: FC<Props> = ({
  projects,
  defaultProjectId,
  branches,
  isBranchesLoading,
  branchesError,
  formError,
  isPending,
  onProjectChange,
  formAction,
}) => {
  const [mode, setMode] = useState<SessionMode>('github')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [urlPath, setUrlPath] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  const handleDrag = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSelectFile = () => {
    fileInputRef.current?.click()
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  const renderContent = () => {
    switch (mode) {
      case 'github':
        return (
          <>
            <div className={styles.formGroup}>
              <label htmlFor="project" className={styles.label}>
                Project (Optional)
              </label>
              <select
                id="project"
                name="projectId"
                defaultValue={defaultProjectId || ''}
                onChange={(e) => onProjectChange(e.target.value)}
                disabled={isPending}
                className={styles.select}
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {branches.length > 0 && (
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
                  {branches.map((branch) => (
                    <option key={branch.sha} value={branch.sha}>
                      {branch.name}
                      {branch.protected && ' (production)'}
                    </option>
                  ))}
                </select>
                {isBranchesLoading && (
                  <p className={styles.loading}>Loading branches...</p>
                )}
                {branchesError && (
                  <p className={styles.error}>{branchesError}</p>
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
                  onChange={handleTextareaChange}
                  placeholder="Enter your database design instructions. For example: Design a database for an e-commerce site that manages users, products, and orders..."
                  disabled={isPending}
                  className={styles.textarea}
                  rows={6}
                  aria-label="Initial message for database design"
                />
                {formError && <p className={styles.error}>{formError}</p>}
              </div>
            </div>
          </>
        )

      case 'upload':
        return (
          <div className={styles.formGroup}>
            <div
              className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className={styles.dropZoneContent}>
                <p className={styles.dropZoneText}>
                  Drag & drop your schema file or click to upload
                </p>
                <p className={styles.dropZoneSubtext}>
                  Supported formats: .sql, .rb, .prisma, .json, .yaml
                </p>
                <Button
                  type="button"
                  variant="solid-primary"
                  onClick={handleSelectFile}
                  className={styles.selectFileButton}
                >
                  Select File
                </Button>
                {selectedFile && (
                  <p className={styles.selectedFile}>
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".sql,.rb,.prisma,.json,.yaml,.yml"
                className={styles.hiddenFileInput}
              />
            </div>
          </div>
        )

      case 'url':
        return (
          <div className={styles.formGroup}>
            <label htmlFor="schemaUrl" className={styles.label}>
              Enter schema file path (e.g., db/schema.rb)
            </label>
            <div className={styles.urlInputWrapper}>
              <input
                id="schemaUrl"
                name="schemaUrl"
                type="text"
                value={urlPath}
                onChange={(e) => setUrlPath(e.target.value)}
                placeholder="Enter schema file path (e.g., db/schema.rb)"
                disabled={isPending}
                className={styles.urlInput}
              />
              <Button
                type="button"
                variant="solid-primary"
                disabled={!urlPath.trim() || isPending}
                className={styles.fetchButton}
              >
                Fetch Schema
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={styles.container}>
      <SessionModeSelector selectedMode={mode} onModeChange={setMode} />
      <form action={formAction}>
        <div className={styles.formContent}>{renderContent()}</div>
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
