import clsx from 'clsx'
import { type ChangeEvent, type FC, useId, useRef, useState } from 'react'
import type { FormatType } from '../../../../../components/FormatIcon/FormatIcon'
import { createAccessibleOpacityTransition } from '../../../../../utils/accessibleTransitions'
import {
  SchemaInfoSection,
  type SchemaStatus,
} from '../../GitHubSessionForm/SchemaInfoSection'
import { useAutoResizeTextarea } from '../../shared/hooks/useAutoResizeTextarea'
import { useEnterKeySubmission } from '../../shared/hooks/useEnterKeySubmission'
import { SessionFormActions } from '../../shared/SessionFormActions'
import styles from './PasteSessionFormPresenter.module.css'

type Props = {
  formError?: string
  isPending: boolean
  formAction: (formData: FormData) => void
  isTransitioning?: boolean
}

const usePasteFormState = () => {
  const [schemaContent, setSchemaContent] = useState('')
  const [textContent, setTextContent] = useState('')
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('postgres')
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatus>('idle')

  return {
    schemaContent,
    setSchemaContent,
    textContent,
    setTextContent,
    selectedFormat,
    setSelectedFormat,
    schemaStatus,
    setSchemaStatus,
  }
}

const usePasteFormHandlers = (state: ReturnType<typeof usePasteFormState>) => {
  const {
    setSchemaContent,
    setTextContent,
    setSelectedFormat,
    setSchemaStatus,
  } = state

  const handleReset = () => {
    setSchemaContent('')
    setTextContent('')
    setSelectedFormat('postgres')
    setSchemaStatus('idle')
  }

  const handleSchemaContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value
    setSchemaContent(content)
    if (content.trim()) {
      setSchemaStatus('valid')
    } else {
      setSchemaStatus('idle')
    }
  }

  return {
    handleReset,
    handleSchemaContentChange,
  }
}

const renderSchemaInputSection = (
  state: ReturnType<typeof usePasteFormState>,
  handlers: ReturnType<typeof usePasteFormHandlers>,
  isPending: boolean,
  schemaContentId: string,
) => {
  const { schemaContent, schemaStatus, selectedFormat } = state
  const { handleSchemaContentChange } = handlers

  return (
    <div className={styles.schemaSection}>
      <div className={styles.schemaInputWrapper}>
        <label htmlFor={schemaContentId} className={styles.label}>
          Schema Content
        </label>
        <textarea
          id={schemaContentId}
          name="schemaContent"
          value={schemaContent}
          onChange={handleSchemaContentChange}
          placeholder="Paste your schema here (SQL, schema.rb, Prisma, or TBLS format)..."
          className={styles.schemaTextarea}
          disabled={isPending}
          rows={12}
        />
      </div>
      {schemaStatus === 'valid' && schemaContent.trim() && (
        <SchemaInfoSection
          status={schemaStatus}
          schemaName="Pasted Schema"
          detectedFormat={selectedFormat}
          selectedFormat={selectedFormat}
          onFormatChange={state.setSelectedFormat}
          onRemove={() => {
            state.setSchemaContent('')
            state.setSchemaStatus('idle')
          }}
        />
      )}
    </div>
  )
}

export const PasteSessionFormPresenter: FC<Props> = ({
  formError,
  isPending,
  formAction,
  isTransitioning = false,
}) => {
  const initialMessageId = useId()
  const schemaContentId = useId()
  const state = usePasteFormState()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handlers = usePasteFormHandlers(state)

  const { handleChange } = useAutoResizeTextarea(textareaRef)
  const handleTextareaChange = handleChange(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      state.setTextContent(e.target.value)
    },
  )

  const hasContent =
    state.schemaContent.trim().length > 0 || state.textContent.trim().length > 0

  const handleEnterKeySubmission = useEnterKeySubmission(
    hasContent,
    isPending,
    formRef,
  )

  return (
    <div
      className={clsx(
        styles.container,
        isPending && styles.pending,
        formError && styles.error,
      )}
    >
      <form
        ref={formRef}
        action={formAction}
        className={styles.form}
        style={createAccessibleOpacityTransition(!isTransitioning)}
      >
        <input type="hidden" name="schemaFormat" value={state.selectedFormat} />
        {renderSchemaInputSection(state, handlers, isPending, schemaContentId)}
        <div className={styles.divider} />
        <div className={styles.inputSection}>
          <div className={styles.textareaWrapper}>
            <label htmlFor={initialMessageId} className={styles.label}>
              Initial Message
            </label>
            <textarea
              ref={textareaRef}
              id={initialMessageId}
              name="initialMessage"
              placeholder="Enter your database design instructions. For example: Design a database for an e-commerce site that manages users, products, and orders..."
              value={state.textContent}
              onChange={handleTextareaChange}
              onKeyDown={handleEnterKeySubmission}
              className={styles.textarea}
              disabled={isPending}
              rows={4}
            />
            {formError && <p className={styles.error}>{formError}</p>}
          </div>
          <div className={styles.buttonContainer}>
            <SessionFormActions
              isPending={isPending}
              hasContent={hasContent}
              onCancel={handlers.handleReset}
            />
          </div>
        </div>
      </form>
    </div>
  )
}
