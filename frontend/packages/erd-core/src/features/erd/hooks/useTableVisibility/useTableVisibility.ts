import { useNodes } from '@xyflow/react'
import { useMemo } from 'react'
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

  return { visibilityStatus }
}
