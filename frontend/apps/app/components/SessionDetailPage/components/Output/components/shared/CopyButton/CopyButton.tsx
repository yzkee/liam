'use client'

import { Check, Copy, IconButton } from '@liam-hq/ui'
import type { FC } from 'react'
import { useState } from 'react'

type Props = {
  textToCopy: string
  tooltipLabel: string
  size?: 'sm' | 'md'
}

export const CopyButton: FC<Props> = ({
  textToCopy,
  tooltipLabel,
  size = 'md',
}) => {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  return (
    <IconButton
      size={size}
      icon={isCopied ? <Check /> : <Copy />}
      tooltipContent={isCopied ? 'Copied!' : tooltipLabel}
      onClick={handleCopy}
    />
  )
}
