import type { Node } from '@xyflow/react'

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
    hidden: hiddenNodeIds.includes(node.id),
  }))
}