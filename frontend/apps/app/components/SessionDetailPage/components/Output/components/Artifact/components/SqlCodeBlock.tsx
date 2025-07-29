'use client'

import { syntaxCodeTagProps, syntaxCustomStyle, syntaxTheme } from '@liam-hq/ui'
import type { FC } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import styles from './SqlCodeBlock.module.css'

type Props = {
  sql: string
}

export const SqlCodeBlock: FC<Props> = ({ sql }) => {
  return (
    <div className={styles.container}>
      <SyntaxHighlighter
        style={syntaxTheme}
        language="sql"
        PreTag="div"
        customStyle={syntaxCustomStyle}
        codeTagProps={syntaxCodeTagProps}
      >
        {sql}
      </SyntaxHighlighter>
    </div>
  )
}
