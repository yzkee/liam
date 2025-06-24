'use client'

import { X } from 'lucide-react'
import type { FC } from 'react'
import styles from './AttachmentPreview.module.css'

type Props = {
  src: string
  alt: string
  onRemove: () => void
}

export const AttachmentPreview: FC<Props> = ({ src, alt, onRemove }) => {
  return (
    <div className={styles.container}>
      <img src={src} alt={alt} className={styles.image} />
      <button
        type="button"
        className={styles.removeButton}
        onClick={onRemove}
        aria-label="Remove attachment"
      >
        <X className={styles.removeIcon} />
      </button>
    </div>
  )
}

AttachmentPreview.displayName = 'AttachmentPreview'
