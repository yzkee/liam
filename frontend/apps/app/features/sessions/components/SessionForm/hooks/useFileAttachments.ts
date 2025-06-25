import { useCallback, useState } from 'react'

export interface FileAttachment {
  id: string
  url: string
  name: string
}

export const useFileAttachments = () => {
  const [attachments, setAttachments] = useState<FileAttachment[]>([])

  const handleFileSelect = useCallback((files: FileList) => {
    const newAttachments = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }))
    setAttachments((prev) => [...prev, ...newAttachments])
  }, [])

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].url)
      updated.splice(index, 1)
      return updated
    })
  }, [])

  const clearAttachments = useCallback(() => {
    attachments.forEach((attachment) => {
      URL.revokeObjectURL(attachment.url)
    })
    setAttachments([])
  }, [attachments])

  return {
    attachments,
    handleFileSelect,
    handleRemoveAttachment,
    clearAttachments,
  }
}
