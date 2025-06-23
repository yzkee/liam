import type { Cardinality, Schema } from '@liam-hq/db-structure'
import type { Edge, Node } from '@xyflow/react'
import { zIndex } from '@/features/erd/constants'
import { columnHandleId } from '@/features/erd/utils'
import type { ShowMode } from '@/schemas/showMode'

type Params = {
  schema: Schema
  showMode: ShowMode
}

export const convertSchemaToNodes = ({
  schema,
  showMode,
}: Params): {
  nodes: Node[]
  edges: Edge[]
} => {
  const tables = Object.values(schema.tables)
  const relationships = Object.values(schema.relationships)

  const sourceColumns = new Map<string, string>()
  const tableColumnCardinalities = new Map<
    string,
    Record<string, Cardinality>
  >()
  for (const relationship of relationships) {
    sourceColumns.set(
      relationship.primaryTableName,
      relationship.primaryColumnName,
    )
    tableColumnCardinalities.set(relationship.foreignTableName, {
      ...tableColumnCardinalities.get(relationship.foreignTableName),
      [relationship.foreignColumnName]: relationship.cardinality,
    })
  }

  // Create table nodes
  const tableNodes = tables.map((table) => ({
    id: table.name,
    type: 'table',
    data: {
      table,
      sourceColumnName: sourceColumns.get(table.name),
      targetColumnCardinalities: tableColumnCardinalities.get(table.name),
    },
    position: { x: 0, y: 0 },
    ariaLabel: `${table.name} table`,
    zIndex: zIndex.nodeDefault,
  }))

  const nodes: Node[] = tableNodes

  const edges: Edge[] = relationships.map((rel) => ({
    id: rel.name,
    type: 'relationship',
    source: rel.primaryTableName,
    target: rel.foreignTableName,
    sourceHandle:
      showMode === 'TABLE_NAME'
        ? null
        : columnHandleId(rel.primaryTableName, rel.primaryColumnName),
    targetHandle:
      showMode === 'TABLE_NAME'
        ? null
        : columnHandleId(rel.foreignTableName, rel.foreignColumnName),
    data: {
      relationship: rel,
      cardinality: rel.cardinality,
    },
  }))

  return { nodes, edges }
}
