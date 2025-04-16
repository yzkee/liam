'use client'

import type { ComponentProps } from 'react'
import styles from './Avatar.module.css'

type AvatarSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
type AvatarUser =
  | 'you'
  | 'collaborator-1'
  | 'collaborator-2'
  | 'collaborator-3'
  | 'collaborator-4'
  | 'collaborator-5'
  | 'collaborator-6'
  | 'collaborator-7'
  | 'collaborator-8'
  | 'collaborator-9'
  | 'collaborator-10'
  | 'collaborator-11'
  | 'jack'

type AvatarProps = {
  initial: string
  size?: AvatarSize
  user?: AvatarUser
  color?: string
  onClick?: (() => void) | undefined
} & Omit<ComponentProps<'button'>, 'color'>

export const Avatar = ({
  initial,
  size = 'md',
  user = 'you',
  color,
  onClick,
  ...props
}: AvatarProps) => {
  // Map size to CSS class
  const sizeClass = match(size)
    .with('xxs', () => styles.sizeXxs)
    .with('xs', () => styles.sizeXs)
    .with('sm', () => styles.sizeSm)
    .with('md', () => styles.sizeMd)
    .with('lg', () => styles.sizeLg)
    .with('xl', () => styles.sizeXl)
    .with('2xl', () => styles.size2xl)
    .otherwise(() => styles.sizeMd)

  // Determine background color based on user type
  const backgroundColor: string = color
    ? color
    : match<AvatarUser, string>(user)
        .with('you', () => 'var(--collaborator-color-you)')
        .with('collaborator-1', () => 'var(--collaborator-color-1)')
        .with('collaborator-2', () => 'var(--collaborator-color-2)')
        .with('collaborator-3', () => 'var(--collaborator-color-3)')
        .with('collaborator-4', () => 'var(--collaborator-color-4)')
        .with('collaborator-5', () => 'var(--collaborator-color-5)')
        .with('collaborator-6', () => 'var(--collaborator-color-6)')
        .with('collaborator-7', () => 'var(--collaborator-color-7)')
        .with('collaborator-8', () => 'var(--collaborator-color-8)')
        .with('collaborator-9', () => 'var(--collaborator-color-9)')
        .with('collaborator-10', () => 'var(--primary-accent)')
        .with('collaborator-11', () => 'var(--primary-accent)')
        .with('jack', () => 'var(--primary-accent)')
        .otherwise(() => 'var(--avatar-background)')

  // Special case for Jack avatar which uses an image
  if (user === 'jack') {
    return (
      <button
        className={`${styles.avatar} ${sizeClass}`}
        style={{ backgroundColor }}
        onClick={onClick}
        aria-label="User profile"
        type="button"
        {...props}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.jackIcon}
        >
          <title>User Avatar</title>
          <path
            d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM8 2.4C9.32 2.4 10.4 3.48 10.4 4.8C10.4 6.12 9.32 7.2 8 7.2C6.68 7.2 5.6 6.12 5.6 4.8C5.6 3.48 6.68 2.4 8 2.4ZM8 13.76C6 13.76 4.23 12.76 3.2 11.28C3.23 9.64 6.4 8.72 8 8.72C9.59 8.72 12.77 9.64 12.8 11.28C11.77 12.76 10 13.76 8 13.76Z"
            fill="var(--global-background)"
          />
        </svg>
      </button>
    )
  }

  return (
    <button
      className={`${styles.avatar} ${sizeClass}`}
      style={{ backgroundColor }}
      onClick={onClick}
      aria-label="User profile"
      type="button"
      {...props}
    >
      {initial}
    </button>
  )
}
