'use client'

import { Button } from '@liam-hq/ui'
import type { FC } from 'react'
import { useState } from 'react'
import { ShareDialog } from '@/components/ShareDialog'
import styles from './ShareButton.module.css'

type Props = {
  designSessionId: string
  initialIsPublic?: boolean
}

export const ShareButton: FC<Props> = ({
  designSessionId,
  initialIsPublic = false,
}) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline-secondary"
        size="md"
        leftIcon={<span style={{ fontSize: '14px' }}>🔗</span>}
        onClick={() => setIsShareDialogOpen(true)}
        className={styles.button}
      >
        Share
      </Button>

      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        designSessionId={designSessionId}
        initialIsPublic={initialIsPublic}
      />
    </>
  )
}
