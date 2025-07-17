import type { Column, Schema, Table } from '@liam-hq/db-structure'
import { postgresqlSchemaDeparser } from '@liam-hq/db-structure'

type SchemaToDdlResult = {
  ddl: string
  errors: string[]
}

// Using actual types from @liam-hq/db-structure

/**
 * Format DDL statements into a single string
 */
const formatDdlStatements = (ddlStatements: string[]): string => {
  return ddlStatements.length > 0 ? `${ddlStatements.join('\n\n')}\n` : ''
}

/**
 * Convert schema to DDL statements using the official PostgreSQL deparser
 */
export const schemaToDdl = (schema: Schema): SchemaToDdlResult => {
  try {
    const result = postgresqlSchemaDeparser(schema)

    // Add trailing newline for consistency
    const ddl = result.value ? `${result.value}\n` : ''

    return {
      ddl,
      errors: result.errors.map((err) => err.message),
    }
  } catch (error) {
    return {
      ddl: '',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Generate diff DDL between two schemas using the official deparser
 */
export const generateDiffDdl = (
  currentSchema: Schema,
  prevSchema: Schema,
): SchemaToDdlResult => {
  try {
    const ddlStatements: string[] = []
    const errors: string[] = []

    // Compare tables directly
    const currentTables = currentSchema.tables
    const prevTables = prevSchema.tables

    // Find added tables - use the official deparser for CREATE TABLE statements
    for (const [tableId, table] of Object.entries(currentTables)) {
      if (!prevTables[tableId]) {
        ddlStatements.push(`-- ADD TABLE ${table.name}`)

        // Create a mini-schema with just this table to get proper DDL
        const tableSchema: Schema = {
          tables: { [tableId]: table },
        }
        const tableResult = postgresqlSchemaDeparser(tableSchema)
        ddlStatements.push(tableResult.value)

        // Collect any errors from the deparser
        errors.push(...tableResult.errors.map((err) => err.message))
      }
    }

    // Find removed tables
    for (const [tableId, table] of Object.entries(prevTables)) {
      if (!currentTables[tableId]) {
        ddlStatements.push(`-- DROP TABLE ${table.name}`)
        ddlStatements.push(`DROP TABLE ${table.name};`)
      }
    }

    // Find modified tables (compare columns)
    for (const [tableId, currentTable] of Object.entries(currentTables)) {
      const prevTable = prevTables[tableId]
      if (!prevTable) continue

      const tableDiff = compareTableColumns(currentTable, prevTable)
      if (tableDiff.length > 0) {
        ddlStatements.push(`-- ALTER TABLE ${currentTable.name}`)
        ddlStatements.push(...tableDiff)
      }
    }

    // Join statements and ensure consistent ending with a single newline
    const ddl = formatDdlStatements(ddlStatements)

    return {
      ddl,
      errors,
    }
  } catch (error) {
    return {
      ddl: '',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Generate column definition string
 */
const generateColumnDefinition = (column: Column): string => {
  let columnDef = `${column.name} ${column.type}`
  if (column.notNull) columnDef += ' NOT NULL'
  if (column.default) columnDef += ` DEFAULT ${column.default}`
  return columnDef
}

/**
 * Find added columns and generate ADD COLUMN statements
 */
const findAddedColumns = (
  currentColumns: Record<string, Column>,
  prevColumns: Record<string, Column>,
  tableName: string,
): string[] => {
  const statements: string[] = []

  for (const [columnId, column] of Object.entries(currentColumns)) {
    if (!prevColumns[columnId]) {
      const columnDef = generateColumnDefinition(column)
      statements.push(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef};`)
    }
  }

  return statements
}

/**
 * Find removed columns and generate DROP COLUMN statements
 */
const findRemovedColumns = (
  currentColumns: Record<string, Column>,
  prevColumns: Record<string, Column>,
  tableName: string,
): string[] => {
  const statements: string[] = []

  for (const [columnId, column] of Object.entries(prevColumns)) {
    if (!currentColumns[columnId]) {
      statements.push(`ALTER TABLE ${tableName} DROP COLUMN ${column.name};`)
    }
  }

  return statements
}

/**
 * Find modified columns and generate correct PostgreSQL ALTER COLUMN statements
 */
const findModifiedColumns = (
  currentColumns: Record<string, Column>,
  prevColumns: Record<string, Column>,
  tableName: string,
): string[] => {
  const statements: string[] = []

  for (const [columnId, currentColumn] of Object.entries(currentColumns)) {
    const prevColumn = prevColumns[columnId]
    if (!prevColumn) continue

    // Handle type changes
    if (currentColumn.type !== prevColumn.type) {
      statements.push(
        `ALTER TABLE ${tableName} ALTER COLUMN ${currentColumn.name} TYPE ${currentColumn.type};`,
      )
    }

    // Handle NOT NULL changes
    if (currentColumn.notNull !== prevColumn.notNull) {
      const notNullClause = currentColumn.notNull
        ? 'SET NOT NULL'
        : 'DROP NOT NULL'
      statements.push(
        `ALTER TABLE ${tableName} ALTER COLUMN ${currentColumn.name} ${notNullClause};`,
      )
    }

    // Handle DEFAULT changes
    if (currentColumn.default !== prevColumn.default) {
      const defaultClause =
        currentColumn.default !== null
          ? `SET DEFAULT ${currentColumn.default}`
          : 'DROP DEFAULT'
      statements.push(
        `ALTER TABLE ${tableName} ALTER COLUMN ${currentColumn.name} ${defaultClause};`,
      )
    }
  }

  return statements
}

/**
 * Compare columns between two tables and generate ALTER TABLE statements
 */
const compareTableColumns = (
  currentTable: Table,
  prevTable: Table,
): string[] => {
  const currentColumns = currentTable.columns
  const prevColumns = prevTable.columns
  const tableName = currentTable.name

  const addedColumns = findAddedColumns(currentColumns, prevColumns, tableName)
  const removedColumns = findRemovedColumns(
    currentColumns,
    prevColumns,
    tableName,
  )
  const modifiedColumns = findModifiedColumns(
    currentColumns,
    prevColumns,
    tableName,
  )

  return [...addedColumns, ...removedColumns, ...modifiedColumns]
}
