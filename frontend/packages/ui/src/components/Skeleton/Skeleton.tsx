import clsx from 'clsx'
import type { FC } from 'react'
import styles from './Skeleton.module.css'

type Props = {
  className?: string
  width?: string
  height?: string
  variant?: 'text' | 'rectangular' | 'circular'
}

export const Skeleton: FC<Props> = ({
  className,
  width,
  height,
  variant = 'text',
}) => {
  const variantClass = (() => {
    switch (variant) {
      case 'text':
        return styles.text
      case 'rectangular':
        return styles.rectangular
      case 'circular':
        return styles.circular
    }
  })()

  return (
    <div
      className={clsx(styles.skeleton, variantClass, className)}
      style={{
        width,
        height,
      }}
    />
  )
}
