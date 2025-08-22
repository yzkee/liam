'use client'

import {
  Button,
  GithubLogo,
  Input,
  LiamLogoMark,
  ModalContent,
  ModalOverlay,
  ModalPortal,
  ModalRoot,
  ModalTitle,
} from '@liam-hq/ui'
import { type ChangeEvent, type FC, useCallback, useState } from 'react'
import styles from './SignUpModal.module.css'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSwitchToSignIn: () => void
}

export const SignUpModal: FC<Props> = ({
  isOpen,
  onClose,
  onSwitchToSignIn,
}) => {
  const [email, setEmail] = useState<string>('')

  const handleChangeEmail = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }, [])

  const handleGoogleSignUp = () => {
    // TODO: Implement actual Google OAuth flow for sign up
  }

  const handleGithubSignUp = () => {
    // TODO: Implement actual GitHub OAuth flow for sign up
  }

  const handleEmailSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement actual email sign up flow
    alert('Sign up feature is not yet implemented')
  }

  return (
    <ModalRoot open={isOpen} onOpenChange={onClose}>
      <ModalPortal>
        <ModalOverlay />
        <ModalContent className={styles.dialog}>
          <ModalTitle className="sr-only">Welcome to Liam DB</ModalTitle>
          <div className={styles.dialogContent}>
            <div className={styles.dialogHeader}>
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
              <div className={styles.titleWrapper}>
                <LiamLogoMark className={styles.logoMark} />
                <h1 className={styles.title}>Welcome to Liam DB</h1>
              </div>

              <div className={styles.oauthList}>
                <form onSubmit={handleEmailSignUp} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label htmlFor="signup-email" className={styles.label}>
                      Email
                    </label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      size="md"
                      value={email}
                      onChange={handleChangeEmail}
                      required
                    />
                  </div>

                  <Button size="md" type="submit">
                    Sign up with email
                  </Button>
                </form>

                <div className={styles.divider}>
                  <span>OR</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  className={styles.oauthButton}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    role="img"
                    aria-label="Google logo"
                  >
                    <path
                      d="M17.64 9.20443C17.64 8.56625 17.5827 7.95262 17.4764 7.36353H9V10.8449H13.8436C13.635 11.9699 13.0009 12.9231 12.0477 13.5613V15.8194H14.9564C16.6582 14.2526 17.64 11.9453 17.64 9.20443Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z"
                      fill="#34A853"
                    />
                    <path
                      d="M3.96409 10.71C3.78409 10.17 3.68182 9.59319 3.68182 9.00001C3.68182 8.40683 3.78409 7.83001 3.96409 7.29001V4.95819H0.957273C0.347727 6.17319 0 7.54774 0 9.00001C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign up with Google
                </button>

                <button
                  type="button"
                  onClick={handleGithubSignUp}
                  className={styles.oauthButton}
                >
                  <GithubLogo />
                  Sign up with GitHub
                </button>
              </div>

              <div className={styles.switchAuth}>
                Already have an account?{' '}
                <button
                  type="button"
                  className={styles.signInLink}
                  onClick={onSwitchToSignIn}
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </ModalContent>
      </ModalPortal>
    </ModalRoot>
  )
}
