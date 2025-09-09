type Operation = {
  op?: string
  type?: string
  path?: string
  value?: unknown
}

const formatSaveRequirements = (args: any): string[] => {
  const lines: string[] = []
  
  // Business Requirement
  if (args.businessRequirement) {
    lines.push('📋 Business Requirement:')
    lines.push(`  ${args.businessRequirement}`)
    lines.push(' ') // Minimal space for visual separation
  }
  
  // Functional Requirements
  if (args.functionalRequirements) {
    lines.push('⚙️ Functional Requirements:')
    Object.entries(args.functionalRequirements).forEach(([category, requirements]) => {
      if (Array.isArray(requirements)) {
        lines.push(`  ${category}:`)
        requirements.forEach((req: string, index: number) => {
          lines.push(`    ${index + 1}. ${req}`)
        })
        lines.push(' ') // Minimal space for visual separation
      }
    })
  }
  
  // Non-Functional Requirements
  if (args.nonFunctionalRequirements) {
    lines.push('🔧 Non-Functional Requirements:')
    Object.entries(args.nonFunctionalRequirements).forEach(([category, requirements]) => {
      if (Array.isArray(requirements)) {
        lines.push(`  ${category}:`)
        requirements.forEach((req: string, index: number) => {
          lines.push(`    ${index + 1}. ${req}`)
        })
        lines.push(' ') // Minimal space for visual separation
      }
    })
  }
  
  // Remove only the last separator line if it exists
  if (lines.length > 0 && lines[lines.length - 1] === ' ') {
    lines.pop()
  }
  
  return lines.length > 0 ? lines : ['No requirements found']
}

const formatOperations = (operations: Operation[]): string[] => {
  const lines: string[] = []
  
  operations.forEach((op) => {
    const operationType = op.op || op.type
    const path = op.path
    const value = op.value as any
    
    // Enum作成
    if (operationType === 'add' && path?.match(/\/enums\/[^/]+$/)) {
      const enumName = path.match(/\/enums\/([^/]+)/)?.[1] ?? 'enum'
      lines.push(`Creating enum '${enumName}'`)
    }
    // Extension作成
    else if (operationType === 'add' && path?.match(/\/extensions\/[^/]+$/)) {
      const extensionName = path.match(/\/extensions\/([^/]+)/)?.[1] ?? 'extension'
      lines.push(`Enabling extension '${extensionName}'`)
    }
    // テーブル作成
    else if (operationType === 'add' && path?.match(/\/tables\/[^/]+$/)) {
      const tableName = path.match(/\/tables\/([^/]+)/)?.[1] ?? 'table'
      lines.push(`Creating table '${tableName}'`)
    }
    // カラム追加
    else if (operationType === 'add' && path?.includes('/columns/')) {
      const columnName = path.match(/\/columns\/([^/]+)/)?.[1] ?? 'column'
      const type = value?.type || 'unknown'
      const notNull = value?.notNull ? ' NOT NULL' : ''
      const unique = value?.unique ? ' UNIQUE' : ''
      const defaultVal = value?.default !== undefined ? ` DEFAULT ${JSON.stringify(value.default)}` : ''
      lines.push(`  Adding column '${columnName}' (${type}${notNull}${unique}${defaultVal})`)
    }
    // インデックス追加
    else if (operationType === 'add' && path?.includes('/indexes/')) {
      const indexName = path.match(/\/indexes\/([^/]+)/)?.[1] ?? 'index'
      const columns = value?.columns ? value.columns.join(', ') : ''
      lines.push(`  Adding index '${indexName}'${columns ? ` on (${columns})` : ''}`)
    }
    // 制約追加
    else if (operationType === 'add' && path?.includes('/constraints/')) {
      const constraintName = path.match(/\/constraints\/([^/]+)/)?.[1] ?? 'constraint'
      const type = value?.type || 'constraint'
      const columns = value?.columns ? ` on (${value.columns.join(', ')})` : ''
      const references = value?.references ? ` -> ${value.references.table}(${value.references.columns.join(', ')})` : ''
      lines.push(`  Adding ${type} '${constraintName}'${columns}${references}`)
    }
    // 削除操作
    else if (operationType === 'remove') {
      if (path?.includes('/tables/')) {
        const tableName = path.match(/\/tables\/([^/]+)/)?.[1] ?? 'table'
        lines.push(`Removing table '${tableName}'`)
      } else if (path?.includes('/columns/')) {
        const columnName = path.match(/\/columns\/([^/]+)/)?.[1] ?? 'column'
        lines.push(`  Removing column '${columnName}'`)
      } else {
        lines.push(`Removing ${path}`)
      }
    }
    // 更新操作
    else if (operationType === 'replace') {
      if (path?.includes('/columns/')) {
        const columnName = path.match(/\/columns\/([^/]+)/)?.[1] ?? 'column'
        lines.push(`  Updating column '${columnName}'`)
      } else {
        lines.push(`Updating ${path}`)
      }
    }
    // その他の操作
    else if (operationType) {
      lines.push(`${operationType}: ${path || 'unknown path'}`)
    }
  })
  
  return lines.length > 0 ? lines : ['Processing...']
}

const formatObject = (obj: unknown, depth = 0): string[] => {
  const lines: string[] = []
  const indent = '  '.repeat(depth)
  
  if (obj === null || obj === undefined) {
    return ['No arguments']
  }
  
  if (typeof obj !== 'object') {
    return [String(obj)]
  }
  
  if (Array.isArray(obj)) {
    // For short arrays, display inline
    if (obj.length <= 3 && obj.every(item => typeof item !== 'object' || item === null)) {
      return [`${indent}[${obj.map(item => JSON.stringify(item)).join(', ')}]`]
    }
    
    // For longer arrays, show items with better formatting
    obj.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        lines.push(`${indent}[${index}]:`)
        lines.push(...formatObject(item, depth + 1))
      } else {
        lines.push(`${indent}[${index}]: ${JSON.stringify(item)}`)
      }
    })
    return lines
  }
  
  // Object formatting with improved readability
  const entries = Object.entries(obj)
  
  entries.forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        // Compact display for simple arrays
        if (value.length === 0) {
          lines.push(`${indent}${key}: []`)
        } else if (value.length <= 5 && value.every(item => typeof item !== 'object' || item === null)) {
          lines.push(`${indent}${key}: [${value.map(item => JSON.stringify(item)).join(', ')}]`)
        } else if (value.length > 0 && typeof value[0] === 'object') {
          lines.push(`${indent}${key}: [${value.length} items]`)
          // Show all items - user can use expand/collapse to manage
          value.forEach((item, i) => {
            lines.push(`${indent}  [${i}]:`)
            lines.push(...formatObject(item, depth + 2))
          })
        } else {
          lines.push(`${indent}${key}: ${JSON.stringify(value)}`)
        }
      } else {
        // For nested objects, add a colon and indent
        lines.push(`${indent}${key}:`)
        lines.push(...formatObject(value, depth + 1))
      }
    } else {
      // Format primitive values with better display
      const valueStr = typeof value === 'string' && value.length > 50 
        ? `"${value.substring(0, 47)}..."` 
        : JSON.stringify(value)
      lines.push(`${indent}${key}: ${valueStr}`)
    }
  })
  
  return lines
}

export const formatArguments = (args: unknown): string[] => {
  // Special handling for operations (Database Schema Design)
  if (typeof args === 'object' && args !== null && 'operations' in args) {
    const operations = (args as any).operations
    if (Array.isArray(operations) && operations.length > 0) {
      const formatted = formatOperations(operations)
      return formatted
    }
  }
  
  // Special handling for Save Requirements Tool
  if (typeof args === 'object' && args !== null && 
      ('businessRequirement' in args || 'functionalRequirements' in args || 'nonFunctionalRequirements' in args)) {
    const formatted = formatSaveRequirements(args)
    return formatted
  }
  
  // General object formatting - show everything, user can collapse if needed
  return formatObject(args)
}