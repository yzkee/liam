import type {
  AddTableOperation,
  Operation,
} from '../../operation/operationsSchema.js'
import { isAddTableOperation } from '../../operation/operationsSchema.js'
import type { OperationDeparser } from '../type.js'
import { generateCreateTableStatement } from './utils.js'

/**
 * Extract table name from operation path
 */
function extractTableNameFromPath(path: string): string | null {
  const match = path.match(/^\/tables\/([^/]+)/)
  return match?.[1] || null
}

/**
 * Generate CREATE TABLE DDL from table creation operation
 */
function generateCreateTableFromOperation(
  operation: AddTableOperation,
): string {
  const tableName = extractTableNameFromPath(operation.path)
  if (!tableName) {
    throw new Error(`Invalid table path: ${operation.path}`)
  }

  return generateCreateTableStatement(operation.value)
}

export const postgresqlOperationDeparser: OperationDeparser = (
  operation: Operation,
) => {
  const errors: { message: string }[] = []

  if (isAddTableOperation(operation)) {
    const value = generateCreateTableFromOperation(operation)
    return { value, errors }
  }

  return {
    value: '',
    errors: [
      {
        message: `Unsupported operation: ${operation.op} at path ${operation.path}`,
      },
    ],
  }
}
