import type { TableNodeType } from '@/features/erd/types'
import { useIsTouchDevice } from '@/hooks'
import { useUserEditingStore } from '@/stores'
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@liam-hq/ui'
import type { NodeProps } from '@xyflow/react'
import clsx from 'clsx'
import { type FC, useCallback, useMemo, useState } from 'react'
import { TableColumnList } from './TableColumnList'
import { TableHeader } from './TableHeader'
import styles from './TableNode.module.css'

type Props = NodeProps<TableNodeType>

// Create a single shared canvas for all instances
const sharedCanvas = document.createElement('canvas')
const sharedContext = sharedCanvas.getContext('2d')

export const TableNode: FC<Props> = ({ data }) => {
  const { showMode: _showMode } = useUserEditingStore()
  const showMode = data.showMode ?? _showMode
  const name = data?.table?.name

  const [isTruncated, setIsTruncated] = useState<boolean>(false)
  const isTouchDevice = useIsTouchDevice()

  const measureTextWidth = useCallback(
    (element: HTMLSpanElement | null) => {
      if (!element || !sharedContext) return

      const style = window.getComputedStyle(element)
      sharedContext.font = style.font

      const textMetrics = sharedContext.measureText(name)
      const textWidth = textMetrics.width

      setIsTruncated(textWidth > element.clientWidth + 0.015)
    },
    [name],
  )

  // Memoize the text ref callback to prevent unnecessary re-renders
  const textRefCallback = useMemo(
    () => (element: HTMLSpanElement | null) => {
      if (isTouchDevice) return
      if (element) {
        measureTextWidth(element)
      }
    },
    [isTouchDevice, measureTextWidth],
  )

  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <div
            className={clsx(
              styles.wrapper,
              data.isHighlighted && styles.wrapperHighlighted,
              data.isActiveHighlighted && styles.wrapperActive,
            )}
            data-erd={
              (data.isHighlighted || data.isActiveHighlighted) &&
              'table-node-highlighted'
            }
          >
            <TableHeader data={data} textRef={textRefCallback} />
            {showMode === 'ALL_FIELDS' && <TableColumnList data={data} />}
            {showMode === 'KEY_ONLY' && (
              <TableColumnList data={data} filter="KEY_ONLY" />
            )}
          </div>
        </TooltipTrigger>

        <TooltipPortal>
          <TooltipContent side={'top'} sideOffset={4} hidden={!isTruncated}>
            {name}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </TooltipProvider>
  )
}
