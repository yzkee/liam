import { useNodes } from '@xyflow/react'
import { useCallback, useMemo } from 'react'
import { useUserEditingOrThrow } from '../../../../stores'
import { useCustomReactflow } from '../../../reactflow/hooks'
import { updateNodesHiddenState } from '../../components/ERDContent/utils' // invalid import path
import { isTableNode } from '../../utils'

type TableVisibilityStatus = 'all-hidden' | 'all-visible' | 'partially-visible'

export const useTableVisibility = () => {
  const nodes = useNodes()

  const visibilityStatus: TableVisibilityStatus = useMemo(() => {
    const tableNodes = nodes.filter((node) => isTableNode(node))
    const visibleTableNodes = tableNodes.filter((node) => !node.hidden)

    if (visibleTableNodes.length === 0) {
      return 'all-hidden'
    }
    if (visibleTableNodes.length === tableNodes.length) {
      return 'all-visible'
    }

    return 'partially-visible'
  }, [nodes])

  const { setHiddenNodeIds, resetSelectedNodeIds } = useUserEditingOrThrow()
  const { setNodes } = useCustomReactflow()

  const showOrHideAllNodes = useCallback(() => {
    resetSelectedNodeIds()
    const shouldHide = visibilityStatus === 'all-visible'
    const updatedNodes = updateNodesHiddenState({
      nodes,
      hiddenNodeIds: shouldHide ? nodes.map((node) => node.id) : [],
      shouldHideGroupNodeId: true,
    })
    setNodes(updatedNodes)
    setHiddenNodeIds(shouldHide ? nodes.map((node) => node.id) : null)
  }, [
    nodes,
    visibilityStatus,
    setNodes,
    setHiddenNodeIds,
    resetSelectedNodeIds,
  ])

  return { visibilityStatus, showOrHideAllNodes }
}
