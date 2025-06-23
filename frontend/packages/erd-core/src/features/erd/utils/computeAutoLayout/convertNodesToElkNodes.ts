import type { Node } from '@xyflow/react'
import type { ElkNode } from 'elkjs'

export function convertNodesToElkNodes(nodes: Node[]): ElkNode[] {
  const nodeMap: Record<string, ElkNode> = {}

  const elkNodes: ElkNode[] = []
  for (const node of nodes) {
    const elkNode: ElkNode = {
      ...node,
      width: node.measured?.width ?? 0,
      height: node.measured?.height ?? 0,
      layoutOptions: {
        'elk.aspectRatio': '1.6f',
        'elk.alignment': 'LEFT',
      },
    }
    nodeMap[node.id] = elkNode

    if (node.parentId) {
      const parentNode = nodeMap[node.parentId]
      if (!parentNode) continue

      if (!parentNode.children) {
        parentNode.children = []
      }

      parentNode.children.push(elkNode)
    } else {
      elkNodes.push(elkNode)
    }
  }

  return elkNodes
}
