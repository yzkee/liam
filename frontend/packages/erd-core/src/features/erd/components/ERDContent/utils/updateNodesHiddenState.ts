import type { Node } from '@xyflow/react'
import { NON_RELATED_TABLE_GROUP_NODE_ID } from '@/features/erd/constants'

type Params = {
  nodes: Node[]
  hiddenNodeIds: string[]
  shouldHideGroupNodeId: boolean
}

export function updateNodesHiddenState({
  nodes,
  hiddenNodeIds,
  shouldHideGroupNodeId,
}: Params): Node[] {
  return nodes.map((node) => {
    const isHiddenById = hiddenNodeIds.includes(node.id)
    const isGroupNodeToHide = node.id === NON_RELATED_TABLE_GROUP_NODE_ID && shouldHideGroupNodeId
    
    return {
      ...node,
      hidden: isHiddenById || isGroupNodeToHide,
    }
  })
}