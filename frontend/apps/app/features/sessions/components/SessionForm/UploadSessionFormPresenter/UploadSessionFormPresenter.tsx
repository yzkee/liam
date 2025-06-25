import { Button, Check, ChevronDown, X } from '@liam-hq/ui'
import {
  type ChangeEvent,
  type DragEvent,
  type FC,
  useRef,
  useState,
} from 'react'
import { FormatIcon } from '../../../../../components/FormatIcon/FormatIcon'
import { SessionFormActions } from '../SessionFormActions'
import { FileIcon } from './FileIcon'
import styles from './UploadSessionFormPresenter.module.css'
import { getFileFormat, getDisplayFormat, isValidFileExtension } from './utils/fileValidation'

type Props = {
  formError?: string
  isPending: boolean
  formAction: (formData: FormData) => void
}

export const UploadSessionFormPresenter: FC<Props> = ({
  formError,
  isPending,
  formAction,
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [textContent, setTextContent] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

    const file = e.dataTransfer.files?.[0]
    if (file && isValidFileExtension(file.name)) {
      setSelectedFile(file)
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && isValidFileExtension(file.name)) {
      setSelectedFile(file)
    }
  }

  const handleSelectFile = () => {
    fileInputRef.current?.click()
  }

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
    setTextContent(textarea.value)
  }

  return (
    <div className={styles.container}>
      <form action={formAction}>
        <div className={styles.uploadSection}>
          <div className={styles.uploadContainer}>
            <div
              className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className={styles.dropZoneContent}>
                <div className={styles.iconContainer}>
                  <FileIcon className={styles.fileIcon} isHovered={isHovered} isDragActive={dragActive} />
                  <div className={styles.extensionTags}>
                    <span className={styles.extensionTag}>.sql</span>
                    <span className={styles.extensionTag}>.rb</span>
                    <span className={styles.extensionTag}>.prisma</span>
                    <span className={styles.extensionTag}>.json</span>
                    <span className={styles.extensionTag}>.yaml</span>
                  </div>
                </div>
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
              </div>
              <input
                ref={fileInputRef}
                type="file"
                name="schemaFile"
                onChange={handleFileSelect}
                accept=".sql,.rb,.prisma,.json,.yaml,.yml"
                className={styles.hiddenFileInput}
              />
            </div>
            {selectedFile && (
              <div className={styles.validSchemaContainer}>
                <div className={styles.validSchemaMessage}>
                  <div className={styles.fetchStatus}>
                    <Check size={12} className={styles.checkIcon} />
                    <span className={styles.validSchemaText}>Valid Schema</span>
                  </div>
                  <span className={styles.detectedText}>
                    Detected as <span className={styles.formatName}>{getDisplayFormat(selectedFile.name)}</span> based on file extension.
                  </span>
                </div>
                <div className={styles.matchFiles}>
                  <div className={styles.matchFileItem}>
                    <div className={styles.uploadedFile}>
                      <FormatIcon format={getFileFormat(selectedFile.name)} size={16} />
                      <span className={styles.fileName}>{selectedFile.name}</span>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => setSelectedFile(null)}
                        aria-label="Remove file"
                      >
                        <X size={10} />
                      </button>
                    </div>
                    <div className={styles.formatSelect}>
                      <FormatIcon format={getFileFormat(selectedFile.name)} size={16} />
                      <span className={styles.formatText}>{getDisplayFormat(selectedFile.name)}</span>
                      <ChevronDown size={12} className={styles.chevronIcon} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.inputSection}>
          <div className={styles.textareaWrapper}>
            <textarea
              ref={textareaRef}
              name="message"
              placeholder="Enter your database design instructions. For example: Design a database for an e-commerce site that manages users, products, and orders..."
              value={textContent}
              onChange={handleTextareaChange}
              className={styles.textarea}
              disabled={isPending}
              rows={4}
            />
            {formError && <p className={styles.error}>{formError}</p>}
          </div>
          <div className={styles.buttonContainer}>
            <SessionFormActions
              isPending={isPending}
              hasContent={!!selectedFile || textContent.trim().length > 0}
              onCancel={() => window.location.reload()}
            />
          </div>
        </div>
      </form>
    </div>
  )
}
