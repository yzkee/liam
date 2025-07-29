import { useReactFlow } from '@xyflow/react'
import { useEffect } from 'react'
import { computeAutoLayout } from '@/features/erd/utils'
import { useCustomReactflow } from '@/features/reactflow/hooks'

export const useSubscribeTidyUpCommand = () => {
  const { getNodes, getEdges, setNodes } = useReactFlow()
  const { fitView } = useCustomReactflow()

  // Tidy up ERD when ⇧T is pressed
  useEffect(() => {
    const down = async (event: KeyboardEvent) => {
      if (event.code === 'KeyT' && event.shiftKey) {
        const { nodes } = await computeAutoLayout(getNodes(), getEdges())
        setNodes(nodes)
        fitView()
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [getNodes, getEdges, setNodes, fitView])
}
