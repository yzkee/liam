'use client'

import {
  ArrowRight,
  ArrowTooltipContent,
  ArrowTooltipPortal,
  ArrowTooltipProvider,
  ArrowTooltipRoot,
  ArrowTooltipTrigger,
  Button,
} from '@liam-hq/ui'
import type { FC } from 'react'
import { useState } from 'react'
import { AttachButton } from '../AttachButton'
import { DeepModelingToggle } from '../DeepModelingToggle'
import { MicButton } from '../MicButton'
import styles from './SessionFormActions.module.css'

type Props = {
  isPending?: boolean
  onSubmit?: () => void
  onMicClick?: () => void
  onAttachClick?: () => void
}

export const SessionFormActions: FC<Props> = ({
  isPending = false,
  onSubmit,
  onMicClick,
  onAttachClick,
}) => {
  const [isDeepModelingActive, setIsDeepModelingActive] = useState(false)

  return (
    <div className={styles.container}>
      <DeepModelingToggle
        isActive={isDeepModelingActive}
        onClick={() => setIsDeepModelingActive((prev) => !prev}
      >
        Deep Modeling
      </DeepModelingToggle>
      <MicButton onClick={onMicClick || (() => {})} />
      <AttachButton onClick={onAttachClick || (() => {})} />
      <ArrowTooltipProvider>
        <ArrowTooltipRoot>
          <ArrowTooltipTrigger asChild>
            <Button
              type="submit"
              variant="solid-primary"
              disabled={isPending}
              isLoading={isPending}
              className={styles.sendButton}
              loadingIndicatorType="content"
            >
              <ArrowRight size={16} />
            </Button>
          </ArrowTooltipTrigger>
          <ArrowTooltipPortal>
            <ArrowTooltipContent side="top" align="center">
              Send
            </ArrowTooltipContent>
          </ArrowTooltipPortal>
        </ArrowTooltipRoot>
      </ArrowTooltipProvider>
    </div>
  )
}

SessionFormActions.displayName = 'SessionFormActions'
