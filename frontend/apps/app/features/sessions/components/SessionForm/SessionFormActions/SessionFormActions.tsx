'use client'

import type { FC } from 'react'
import { useState } from 'react'
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
  onDeepModelingToggle?: (isActive: boolean) => void
}

export const SessionFormActions: FC<Props> = ({
  isPending = false,
  hasContent = false,
  onMicClick,
  onAttachClick,
  onFileSelect,
  onSubmit,
  onCancel,
  onDeepModelingToggle,
}) => {
  const [isDeepModelingActive, setIsDeepModelingActive] = useState(false)

  const handleDeepModelingToggle = () => {
    const newState = !isDeepModelingActive
    setIsDeepModelingActive(newState)
    onDeepModelingToggle?.(newState)
  }

  return (
    <div className={styles.container}>
      <DeepModelingToggle
        isActive={isDeepModelingActive}
        onClick={handleDeepModelingToggle}
        disabled={isPending}
      >
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
