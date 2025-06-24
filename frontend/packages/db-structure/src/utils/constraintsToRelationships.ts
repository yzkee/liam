import * as v from 'valibot'
import type { Cardinality, Relationships, Tables } from '../schema/index.js'
import { foreignKeyConstraintSchema } from '../schema/index.js'

/**
 * Convert foreign key constraints to relationships for UI display
 * @param tables - The tables object containing constraints
 * @returns Relationships derived from foreign key constraints
 */
export const constraintsToRelationships = (tables: Tables): Relationships => {
  const relationships: Relationships = {}

  for (const table of Object.values(tables)) {
    for (const constraint of Object.values(table.constraints)) {
      const result = v.safeParse(foreignKeyConstraintSchema, constraint)
      if (!result.success) {
        continue
      }

      const foreignKeyConstraint = result.output
      const cardinality = determineCardinality(
        tables,
        table.name,
        foreignKeyConstraint.columnName,
      )

      relationships[constraint.name] = {
        name: constraint.name,
        primaryTableName: foreignKeyConstraint.targetTableName,
        primaryColumnName: foreignKeyConstraint.targetColumnName,
        foreignTableName: table.name,
        foreignColumnName: foreignKeyConstraint.columnName,
        cardinality,
        updateConstraint: foreignKeyConstraint.updateConstraint,
        deleteConstraint: foreignKeyConstraint.deleteConstraint,
      }
    }
  }

  return relationships
}

/**
 * Determine the cardinality of a relationship based on column constraints
 */
const determineCardinality = (
  tables: Tables,
  tableName: string,
  columnName: string,
): Cardinality => {
  const table = tables[tableName]
  if (!table) {
    return 'ONE_TO_MANY'
  }

  const column = table.columns[columnName]

  // Check if column has unique constraint
  if (column?.unique) {
    return 'ONE_TO_ONE'
  }

  // Check for UNIQUE constraint in table constraints
  for (const constraint of Object.values(table.constraints)) {
    if (constraint.type === 'UNIQUE' && constraint.columnName === columnName) {
      return 'ONE_TO_ONE'
    }
  }

  return 'ONE_TO_MANY'
}
