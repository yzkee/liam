import { Button, Check, X } from '@liam-hq/ui'
import {
  type ChangeEvent,
  type FC,
  useRef,
  useState,
} from 'react'
import { FormatIcon, type FormatType } from '../../../../../components/FormatIcon/FormatIcon'
import { AttachmentsContainer } from '../AttachmentsContainer'
import { FormatSelectDropdown } from '../FormatSelectDropdown'
import { useFileAttachments } from '../hooks/useFileAttachments'
import { useFileDragAndDrop } from '../hooks/useFileDragAndDrop'
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
  const [isHovered, setIsHovered] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('postgres')
  const [textContent, setTextContent] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // File attachments hook
  const { attachments, handleFileSelect, handleRemoveAttachment } = useFileAttachments()
  
  // File drag and drop for schema file
  const handleSchemaFileDrop = (files: FileList) => {
    const file = files[0]
    if (file && isValidFileExtension(file.name)) {
      setSelectedFile(file)
      setSelectedFormat(getFileFormat(file.name))
    }
  }
  
  const { dragActive: schemaDragActive, handleDrag: handleSchemaDrag, handleDrop: handleSchemaDrop } = useFileDragAndDrop(handleSchemaFileDrop)
  
  // File drag and drop for attachments
  const { dragActive: attachmentDragActive, handleDrag: handleAttachmentDrag, handleDrop: handleAttachmentDrop } = useFileDragAndDrop(handleFileSelect)

  const handleSchemaFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && isValidFileExtension(file.name)) {
      setSelectedFile(file)
      setSelectedFormat(getFileFormat(file.name))
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
        <input type="hidden" name="schemaFormat" value={selectedFormat} />
        <div className={styles.uploadSection}>
          <div className={styles.uploadContainer}>
            <div
              className={`${styles.dropZone} ${schemaDragActive ? styles.dropZoneActive : ''}`}
              onClick={handleSelectFile}
              onDragEnter={handleSchemaDrag}
              onDragLeave={handleSchemaDrag}
              onDragOver={handleSchemaDrag}
              onDrop={handleSchemaDrop}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className={styles.dropZoneContent}>
                <div className={styles.iconContainer}>
                  <FileIcon className={styles.fileIcon} isHovered={isHovered} isDragActive={schemaDragActive} />
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
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectFile()
                  }}
                  className={styles.selectFileButton}
                >
                  Select File
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                name="schemaFile"
                onChange={handleSchemaFileSelect}
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
                    <FormatSelectDropdown
                      selectedFormat={selectedFormat}
                      onFormatChange={setSelectedFormat}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={styles.divider} />
        <div 
          className={`${styles.inputSection} ${attachmentDragActive ? styles.dragActive : ''}`}
          onDragEnter={handleAttachmentDrag}
          onDragLeave={handleAttachmentDrag}
          onDragOver={handleAttachmentDrag}
          onDrop={handleAttachmentDrop}
        >
          <AttachmentsContainer 
            attachments={attachments}
            onRemove={handleRemoveAttachment}
          />
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
              onFileSelect={handleFileSelect}
              onCancel={() => window.location.reload()}
            />
          </div>
        </div>
      </form>
    </div>
  )
}
