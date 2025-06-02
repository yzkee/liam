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
import { type FC, useCallback, useRef, useState } from 'react'
import { TableColumnList } from './TableColumnList'
import { TableHeader } from './TableHeader'
import styles from './TableNode.module.css'

type Props = NodeProps<TableNodeType>

export const TableNode: FC<Props> = ({ data }) => {
  const isMobile = useIsTouchDevice()
  const { showMode: _showMode } = useUserEditingStore()
  const showMode = data.showMode ?? _showMode
  const name = data?.table?.name

  const [isTruncated, setIsTruncated] = useState<boolean>(false)
  const textRef = useRef<HTMLSpanElement | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const measureText = useCallback((element: HTMLSpanElement) => {
    // Create a range to measure the text
    const range = document.createRange()
    range.selectNodeContents(element)

    // Get the text width using getBoundingClientRect
    const textWidth = range.getBoundingClientRect().width
    const containerWidth = element.getBoundingClientRect().width

    // Add a small threshold (0.016px) to account for subpixel rendering
    setIsTruncated(textWidth > containerWidth + 0.016)
  }, [])

  const setRef = useCallback(
    (element: HTMLSpanElement | null) => {
      if (textRef.current === element) return

      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      textRef.current = element

      if (element) {
        measureText(element)
        observerRef.current = new ResizeObserver(() => measureText(element))
        observerRef.current.observe(element)
      }
    },
    [measureText],
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
            {isMobile ? (
              <TableHeader data={data} />
            ) : (
              <TableHeader data={data} textRef={setRef} />
            )}
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
