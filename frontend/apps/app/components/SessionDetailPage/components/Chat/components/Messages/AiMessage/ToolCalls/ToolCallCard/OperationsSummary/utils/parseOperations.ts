type Operation = {
  op?: string
  type?: string
  path?: string
  value?: unknown
}

const getAddOperationMessage = (path: string | undefined, value: unknown): string => {
  if (!path) return 'Adding new element...'
  
  // テーブル作成
  if (path.match(/\/tables\/[^/]+$/) && !path.includes('/columns/') && !path.includes('/constraints/') && !path.includes('/indexes/')) {
    const tableName = extractTableName(path)
    return `Creating table '${tableName}'`
  }
  
  // カラム追加
  if (path.includes('/columns/')) {
    const columnName = extractColumnName(path)
    const columnInfo = value as any
    const type = columnInfo?.type || 'unknown'
    return `  Adding column '${columnName}' (${type})`
  }
  
  // インデックス追加
  if (path.includes('/indexes/')) {
    const indexName = extractIndexName(path)
    const indexInfo = value as any
    const columns = indexInfo?.columns ? indexInfo.columns.join(', ') : ''
    return `  Adding index '${indexName}'${columns ? ` on (${columns})` : ''}`
  }
  
  // 制約追加
  if (path.includes('/constraints/')) {
    const constraintName = extractConstraintName(path)
    const constraintInfo = value as any
    const type = constraintInfo?.type || 'constraint'
    return `  Adding ${type} '${constraintName}'`
  }
  
  return 'Adding new element...'
}

const getRemoveOperationMessage = (path: string | undefined): string => {
  if (!path) return 'Removing element...'
  if (path.includes('/tables/')) {
    const tableName = extractTableName(path)
    return `Removing table "${tableName}"...`
  }
  if (path.includes('/columns/')) {
    const columnName = extractColumnName(path)
    return `Removing column "${columnName}"...`
  }
  return 'Removing element...'
}

const getReplaceOperationMessage = (path: string | undefined): string => {
  if (!path) return 'Updating element...'
  if (path.includes('/columns/')) {
    const columnName = extractColumnName(path)
    return `Updating column "${columnName}"...`
  }
  if (path.includes('/tables/')) {
    const tableName = extractTableName(path)
    return `Updating table "${tableName}"...`
  }
  return 'Updating element...'
}

export const parseOperations = (operations: Operation[]): string[] => {
  const summaryLines: string[] = []

  operations.forEach((op) => {
    const operationType = op.op || op.type
    const path = op.path
    const value = op.value

    switch (operationType) {
      case 'add':
        summaryLines.push(getAddOperationMessage(path, value))
        break
      case 'remove':
        summaryLines.push(getRemoveOperationMessage(path))
        break
      case 'replace':
        summaryLines.push(getReplaceOperationMessage(path))
        break
      case 'move':
        summaryLines.push('Moving element...')
        break
      default:
        if (operationType) {
          summaryLines.push(`Executing ${operationType} operation...`)
        }
    }
  })

  if (summaryLines.length === 0) {
    summaryLines.push('Processing...')
  }

  return summaryLines
}

const extractTableName = (path: string): string => {
  const match = path.match(/\/tables\/([^/]+)/)
  return match?.[1] ?? 'table'
}

const extractColumnName = (path: string): string => {
  const match = path.match(/\/columns\/([^/]+)/)
  return match?.[1] ?? 'column'
}

const extractIndexName = (path: string): string => {
  const match = path.match(/\/indexes\/([^/]+)/)
  return match?.[1] ?? 'index'
}

const extractConstraintName = (path: string): string => {
  const match = path.match(/\/constraints\/([^/]+)/)
  return match?.[1] ?? 'constraint'
}
