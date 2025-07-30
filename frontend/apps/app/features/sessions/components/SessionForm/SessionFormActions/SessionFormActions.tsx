'use client'

import type { FC } from 'react'
import { ActionButton } from '../ActionButton'
import { AttachButton } from '../AttachButton'
import { DeepModelingToggle } from '../DeepModelingToggle'
import { MicButton } from '../MicButton'
import styles from './SessionFormActions.module.css'

type Props = {
  isPending?: boolean
  hasContent?: boolean
  onMicClick?: () => void
  onAttachClick?: () => void
  onFileSelect?: (files: FileList) => void
  onSubmit?: () => void
  onCancel?: () => void
}

export const SessionFormActions: FC<Props> = ({
  isPending = false,
  hasContent = false,
  onMicClick,
  onAttachClick,
  onFileSelect,
  onSubmit,
  onCancel,
}) => {
  return (
    <div className={styles.container}>
      <DeepModelingToggle name="isDeepModelingEnabled" disabled={isPending}>
        Deep Modeling
      </DeepModelingToggle>
      <MicButton onClick={onMicClick || (() => {})} disabled={isPending} />
      <AttachButton
        onClick={onAttachClick || (() => {})}
        onFileSelect={onFileSelect}
        disabled={isPending}
      />
      <ActionButton
        hasContent={hasContent}
        isPending={isPending}
        onSubmit={onSubmit || (() => {})}
        onCancel={onCancel || (() => window.location.reload())}
      />
    </div>
  )
}

SessionFormActions.displayName = 'SessionFormActions'
