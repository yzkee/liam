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
import { type FC, useCallback, useEffect, useRef, useState } from 'react'
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

  const textRef = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState<boolean>(false)
  const isTouchDevice = useIsTouchDevice()
  const rafRef = useRef<number>()

  const measureTextWidth = useCallback(() => {
    if (!textRef.current || !sharedContext) return

    const element = textRef.current
    const style = window.getComputedStyle(element)

    // Set the font to match the element
    sharedContext.font = style.font

    // Measure the text width
    const textMetrics = sharedContext.measureText(name)
    const textWidth = textMetrics.width

    // Check if text is truncated
    setIsTruncated(textWidth > element.clientWidth + 0.015)
  }, [name])

  // Use ResizeObserver to detect size changes
  useEffect(() => {
    if (isTouchDevice || !textRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      // Cancel any pending measurement
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      // Schedule new measurement
      rafRef.current = requestAnimationFrame(measureTextWidth)
    })

    resizeObserver.observe(textRef.current)

    // Initial measurement
    rafRef.current = requestAnimationFrame(measureTextWidth)

    return () => {
      resizeObserver.disconnect()
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isTouchDevice, measureTextWidth])

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
            <TableHeader data={data} textRef={textRef} />
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
