import { type DragEvent, useCallback, useState } from 'react'

export const useFileDragAndDrop = (
  onFilesDropped?: (files: FileList) => void,
) => {
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesDropped?.(e.dataTransfer.files)
      }
    },
    [onFilesDropped],
  )

  return {
    dragActive,
    handleDrag,
    handleDrop,
  }
}
