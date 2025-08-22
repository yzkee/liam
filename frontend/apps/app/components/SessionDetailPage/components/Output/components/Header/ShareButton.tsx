'use client'

import { Button, Link } from '@liam-hq/ui'
import type { FC } from 'react'
import { useState } from 'react'
import { useViewMode } from '@/components/SessionDetailPage/hooks/viewMode/useViewMode'
import { ShareDialog } from '@/components/ShareDialog'
import { SignInModal } from '@/components/SignInModal'
import { SignUpModal } from '@/components/SignUpModal'
import styles from './ShareButton.module.css'

type Props = {
  designSessionId: string
  initialIsPublic: boolean
}

export const ShareButton: FC<Props> = ({
  designSessionId,
  initialIsPublic = false,
}) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [authModalType, setAuthModalType] = useState<
    'signin' | 'signup' | null
  >(null)
  const { isPublic } = useViewMode()

  const handleShareClick = () => {
    if (isPublic) {
      setAuthModalType('signin')
    } else {
      setIsShareDialogOpen(true)
    }
  }

  return (
    <>
      <Button
        variant="outline-secondary"
        size="md"
        leftIcon={<Link size={16} />}
        onClick={handleShareClick}
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

      <SignInModal
        isOpen={authModalType === 'signin'}
        onClose={() => setAuthModalType(null)}
        onSwitchToSignUp={() => setAuthModalType('signup')}
      />

      <SignUpModal
        isOpen={authModalType === 'signup'}
        onClose={() => setAuthModalType(null)}
        onSwitchToSignIn={() => setAuthModalType('signin')}
      />
    </>
  )
}
