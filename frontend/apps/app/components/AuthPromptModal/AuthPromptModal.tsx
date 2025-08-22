'use client'

import {
  Button,
  ModalContent,
  ModalOverlay,
  ModalPortal,
  ModalRoot,
  ModalTitle,
} from '@liam-hq/ui'
import type { FC } from 'react'
import styles from './AuthPromptModal.module.css'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export const AuthPromptModal: FC<Props> = ({ isOpen, onClose }) => {
  const handleLogin = () => {
    // TODO: Implement actual login flow
  }

  const handleSignup = () => {
    // TODO: Implement actual signup flow
  }

  return (
    <ModalRoot open={isOpen} onOpenChange={onClose}>
      <ModalPortal>
        <ModalOverlay />
        <ModalContent className={styles.dialog}>
          <div className={styles.dialogContent}>
            <div className={styles.dialogHeader}>
              <ModalTitle className={styles.dialogTitle}>
                ログインが必要です
              </ModalTitle>
              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.authContent}>
              <p className={styles.description}>
                この機能を使用するにはログインまたはサインアップしてください
              </p>

              <div className={styles.buttonGroup}>
                <Button
                  variant="solid-primary"
                  size="lg"
                  onClick={handleLogin}
                  className={styles.authButton}
                >
                  ログイン
                </Button>
                <Button
                  variant="outline-secondary"
                  size="lg"
                  onClick={handleSignup}
                  className={styles.authButton}
                >
                  サインアップ
                </Button>
              </div>
            </div>
          </div>
        </ModalContent>
      </ModalPortal>
    </ModalRoot>
  )
}
