import type { Node } from '@xyflow/react'
import { NON_RELATED_TABLE_GROUP_NODE_ID } from '@/features/erd/constants'

type Params = {
  nodes: Node[]
  hiddenNodeIds: string[]
}

export function updateNodesHiddenState({
  nodes,
  hiddenNodeIds,
}: Params): Node[] {
  return nodes.map((node) => ({
    ...node,
    hidden:
      hiddenNodeIds.includes(node.id) ||
      node.id === NON_RELATED_TABLE_GROUP_NODE_ID,
  }))
}
