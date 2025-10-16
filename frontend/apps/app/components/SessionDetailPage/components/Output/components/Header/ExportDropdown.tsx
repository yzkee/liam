'use client'

import type { Schema } from '@liam-hq/schema'
import {
  type Operation,
  postgresqlOperationDeparser,
  yamlSchemaDeparser,
} from '@liam-hq/schema'
import {
  Button,
  ChevronDown,
  Copy,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  FileText,
  useToast,
} from '@liam-hq/ui'
import { fromPromise } from 'neverthrow'
import { type FC, useCallback, useState } from 'react'
import { schemaToDdl } from '../SQL/utils/schemaToDdl'
import styles from './ExportDropdown.module.css'

type Props = {
  disabled?: boolean
  schema: Schema
  artifactDoc?: string
  cumulativeOperations: Operation[]
}

const generateCumulativeDDL = (operations: Operation[]): string => {
  const ddlStatements: string[] = []

  for (const operation of operations) {
    const result = postgresqlOperationDeparser(operation)
    if (result.errors.length === 0 && result.value.trim()) {
      ddlStatements.push(result.value)
    }
  }

  return ddlStatements.join('\n\n')
}

const generateAIPrompt = (
  artifactDoc: string,
  cumulativeOperations: Operation[],
): string => {
  // Generate cumulative DDL diff
  const ddlContent = generateCumulativeDDL(cumulativeOperations)

  return `# Database Schema Design

${artifactDoc}

## Schema Migrations
\`\`\`sql
${ddlContent}\`\`\`

## Implementation Guidance
Please implement according to this design. Use the above requirements analysis and SQL schema as reference to create appropriate database design and application implementation.

- Maintain schema consistency
- Correctly implement constraints and relationships defined in requirements
- Consider performance and security
`
}

export const ExportDropdown: FC<Props> = ({
  disabled,
  schema,
  artifactDoc,
  cumulativeOperations,
}) => {
  const toast = useToast()

  const [open, setOpen] = useState(false)
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (disabled) {
        setOpen(false)
        return
      }

      setOpen(open)
    },
    [disabled],
  )

  const copyToClipboard = useCallback(
    async (
      content: string,
      successTitle: string,
      successDescription: string,
      errorContext: string,
    ) => {
      const clipboardResult = await fromPromise(
        navigator.clipboard.writeText(content),
        (error) =>
          error instanceof Error ? error : new Error('Clipboard write failed'),
      )

      clipboardResult.match(
        () => {
          toast({
            title: successTitle,
            description: successDescription,
            status: 'success',
          })
        },
        (error) => {
          console.error(`${errorContext}:`, error)
          toast({
            title: 'Copy failed',
            description: `${errorContext}: ${error.message}`,
            status: 'error',
          })
        },
      )
    },
    [toast],
  )

  const handleCopyAIPrompt = useCallback(async () => {
    if (!artifactDoc) return

    const prompt = generateAIPrompt(artifactDoc, cumulativeOperations)
    await copyToClipboard(
      prompt,
      'AI Prompt copied!',
      'AI prompt has been copied to clipboard',
      'Failed to copy AI prompt to clipboard',
    )
  }, [artifactDoc, cumulativeOperations, copyToClipboard])

  const handleCopyPostgreSQL = useCallback(async () => {
    const ddlResult = schemaToDdl(schema)
    await copyToClipboard(
      ddlResult.ddl,
      'PostgreSQL DDL copied!',
      'Schema DDL has been copied to clipboard',
      'Failed to copy PostgreSQL DDL to clipboard',
    )
  }, [schema, copyToClipboard])

  const handleCopyYaml = useCallback(async () => {
    const yamlResult = yamlSchemaDeparser(schema)

    yamlResult.match(
      async (yamlContent) => {
        await copyToClipboard(
          yamlContent,
          'YAML copied!',
          'Schema YAML has been copied to clipboard',
          'Failed to copy YAML to clipboard',
        )
      },
      (error) => {
        console.error('Failed to generate YAML:', error)
        toast({
          title: 'Export failed',
          description: `Failed to generate YAML: ${error.message}`,
          status: 'error',
        })
      },
    )
  }, [schema, copyToClipboard, toast])

  return (
    <DropdownMenuRoot open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={disabled}
          variant="outline-secondary"
          size="md"
          rightIcon={<ChevronDown size={16} />}
          className={styles.button}
        >
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" sideOffset={8}>
          {artifactDoc && cumulativeOperations.length > 0 && (
            <DropdownMenuItem
              leftIcon={<FileText size={16} />}
              onSelect={handleCopyAIPrompt}
            >
              Prompt for AI Agent
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            leftIcon={<Copy size={16} />}
            onSelect={handleCopyPostgreSQL}
          >
            Copy PostgreSQL
          </DropdownMenuItem>
          <DropdownMenuItem
            leftIcon={<Copy size={16} />}
            onSelect={handleCopyYaml}
          >
            Copy YAML
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  )
}
