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

export const TableNode: FC<Props> = ({ data }) => {
  const { showMode: _showMode } = useUserEditingStore()
  const showMode = data.showMode ?? _showMode
  const name = data?.table?.name

  const textRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isTruncated, setIsTruncated] = useState<boolean>(false)

  const isTouchDevice = useIsTouchDevice()

  // Initialize canvas once
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    return () => {
      if (canvasRef.current) {
        canvasRef.current.width = 0
        canvasRef.current.height = 0
        canvasRef.current = null
      }
    }
  }, [])

  const measureTextWidth = useCallback(() => {
    if (!textRef.current || !canvasRef.current) return

    const element = textRef.current
    const style = window.getComputedStyle(element)
    const context = canvasRef.current.getContext('2d')
    if (!context) return

    // Set the font to match the element
    context.font = style.font

    // Measure the text width
    const textMetrics = context.measureText(name)
    const textWidth = textMetrics.width

    // Check if text is truncated
    setIsTruncated(textWidth > element.clientWidth + 0.015)
  }, [name])

  // Debounced measurement
  useEffect(() => {
    if (isTouchDevice) return

    const timeoutId = setTimeout(() => {
      measureTextWidth()
    }, 100) // 100ms debounce

    return () => {
      clearTimeout(timeoutId)
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
