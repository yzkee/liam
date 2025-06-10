'use client'

import type { Schema, TableGroup } from '@liam-hq/db-structure'
import { Button } from '@liam-hq/ui'
import { MessageCircleIcon } from 'lucide-react'
import type { FC } from 'react'
import { useState } from 'react'
import styles from './ChatbotButton.module.css'
import { ChatbotDialog } from './components/ChatbotDialog'

interface ChatbotButtonProps {
  schemaData: Schema
  tableGroups?: Record<string, TableGroup>
  projectId: string
}

export const ChatbotButton: FC<ChatbotButtonProps> = ({
  schemaData,
  tableGroups,
  projectId,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Button
        className={styles.chatButton}
        onClick={() => setIsDialogOpen(true)}
      >
        <MessageCircleIcon size={20} />
        <span className={styles.buttonText}>Schema Chat</span>
      </Button>

      <ChatbotDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        schemaData={schemaData}
        tableGroups={tableGroups}
        projectId={projectId}
      />
    </>
  )
}
