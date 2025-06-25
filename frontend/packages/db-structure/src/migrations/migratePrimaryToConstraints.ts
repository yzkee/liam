import type { Schema } from '../schema/index.js'

/**
 * Migrates primary field from columns to PRIMARY KEY constraints
 * This function converts the deprecated column.primary: true format
 * to the new PRIMARY KEY constraint format
 *
 * @param schema - The schema to migrate
 * @returns The migrated schema with PRIMARY KEY constraints
 */
export const migratePrimaryToConstraints = (schema: Schema): Schema => {
  const migratedTables = { ...schema.tables }

  for (const [tableName, table] of Object.entries(migratedTables)) {
    const migratedTable = { ...table }
    const migratedColumns = { ...table.columns }
    const migratedConstraints = { ...table.constraints }

    // Check each column for the primary field
    for (const [columnName, column] of Object.entries(migratedColumns)) {
      // @ts-expect-error - primary field was removed from Column type but may exist in old schemas
      if (column.primary === true) {
        // Create a PRIMARY KEY constraint for this column
        const constraintName = `PRIMARY_${columnName}`

        // Only add if not already present
        if (!migratedConstraints[constraintName]) {
          migratedConstraints[constraintName] = {
            type: 'PRIMARY KEY',
            name: constraintName,
            columnName: columnName,
          }
        }

        // Remove the primary field from the column
        const { primary, ...columnWithoutPrimary } = column as Record<
          string,
          unknown
        >
        migratedColumns[columnName] = columnWithoutPrimary as typeof column
      }
    }

    migratedTable.columns = migratedColumns
    migratedTable.constraints = migratedConstraints
    migratedTables[tableName] = migratedTable
  }

  return {
    ...schema,
    tables: migratedTables,
  }
}
