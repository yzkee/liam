import { Button } from '@liam-hq/ui'
import {
  type ChangeEvent,
  type DragEvent,
  type FC,
  useRef,
  useState,
} from 'react'
import { SessionFormActions } from '../SessionFormActions'
import { FileIcon } from './FileIcon'
import styles from './UploadSessionFormPresenter.module.css'

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
                {selectedFile && (
                  <p className={styles.selectedFile}>
                    Selected: {selectedFile.name}
                  </p>
                )}
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
