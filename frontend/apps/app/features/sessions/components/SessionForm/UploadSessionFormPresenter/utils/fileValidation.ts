import type { FormatType } from '@/components/FormatIcon/FormatIcon'

const getFileExtension = (fileName: string): string => {
  if (!fileName || typeof fileName !== 'string') {
    return ''
  }

  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex > 0 && lastDotIndex < fileName.length - 1) {
    return fileName.slice(lastDotIndex + 1).toLowerCase()
  }

  return ''
}

export const getFileFormat = (fileName: string): FormatType => {
  const extension = getFileExtension(fileName)

  const formatMap: Record<string, FormatType> = {
    sql: 'postgres',
    rb: 'schemarb',
    prisma: 'prisma',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
  }

  return formatMap[extension] || 'postgres'
}

export const getDisplayFormat = (fileName: string): string => {
  const extension = getFileExtension(fileName)

  const displayMap: Record<string, string> = {
    sql: 'postgresql',
    rb: 'ruby',
    prisma: 'prisma',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
  }

  return displayMap[extension] || 'postgresql'
}

export const VALID_EXTENSIONS = ['sql', 'rb', 'prisma', 'json', 'yaml', 'yml'] as const
export const DISPLAY_EXTENSIONS = ['sql', 'rb', 'prisma', 'json', 'yaml'] as const

export const isValidFileExtension = (fileName: string): boolean => {
  const extension = getFileExtension(fileName)
  return (VALID_EXTENSIONS as readonly string[]).includes(extension)
}
