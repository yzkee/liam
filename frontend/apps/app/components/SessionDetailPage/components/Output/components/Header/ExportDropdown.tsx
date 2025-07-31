'use client'

import type { Schema } from '@liam-hq/db-structure'
import {
  Button,
  ChevronDown,
  Copy,
  Download,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  useToast,
} from '@liam-hq/ui'
import { fromPromise } from 'neverthrow'
import type { FC } from 'react'
import { schemaToDdl } from '../SQL/utils/schemaToDdl'
import styles from './ExportDropdown.module.css'

type Props = {
  schema: Schema
}

export const ExportDropdown: FC<Props> = ({ schema }) => {
  const toast = useToast()

  const handleCopyPostgreSQL = async () => {
    const ddlResult = schemaToDdl(schema)

    const clipboardResult = await fromPromise(
      navigator.clipboard.writeText(ddlResult.ddl),
      (error) =>
        error instanceof Error ? error : new Error('Clipboard write failed'),
    )

    clipboardResult.match(
      () => {
        toast({
          title: 'PostgreSQL DDL copied!',
          description: 'Schema DDL has been copied to clipboard',
          status: 'success',
        })
      },
      (error) => {
        console.error('Failed to copy PostgreSQL DDL to clipboard:', error)
        toast({
          title: 'Copy failed',
          description: `Failed to copy DDL to clipboard: ${error.message}`,
          status: 'error',
        })
      },
    )
  }

  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline-secondary"
          size="sm"
          leftIcon={<Download size={16} />}
          rightIcon={<ChevronDown size={16} />}
          className={styles.button}
        >
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" sideOffset={8}>
          <DropdownMenuItem
            leftIcon={<Copy size={16} />}
            onSelect={handleCopyPostgreSQL}
          >
            Copy PostgreSQL
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  )
}
