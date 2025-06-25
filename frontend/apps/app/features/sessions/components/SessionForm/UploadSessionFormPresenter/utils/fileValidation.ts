import type { FormatType } from '../../../../../../components/FormatIcon/FormatIcon'

export const getFileFormat = (fileName: string): FormatType => {
  const extension = fileName.split('.').pop()?.toLowerCase()

  const formatMap: Record<string, FormatType> = {
    sql: 'postgres',
    rb: 'schemarb',
    prisma: 'prisma',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
  }

  return formatMap[extension || ''] || 'postgres'
}

export const getDisplayFormat = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase()

  const displayMap: Record<string, string> = {
    sql: 'postgresql',
    rb: 'ruby',
    prisma: 'prisma',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
  }

  return displayMap[extension || ''] || 'postgresql'
}

export const isValidFileExtension = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  const validExtensions = ['sql', 'rb', 'prisma', 'json', 'yaml', 'yml']
  return validExtensions.includes(extension || '')
}
