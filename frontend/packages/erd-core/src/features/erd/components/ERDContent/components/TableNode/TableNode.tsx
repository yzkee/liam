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
import type { FC, MutableRefObject } from 'react'
import { useCallback, useRef, useState } from 'react'
import { TableColumnList } from './TableColumnList'
import { TableHeader } from './TableHeader'
import styles from './TableNode.module.css'

type Props = NodeProps<TableNodeType>

type Refs = {
  text: MutableRefObject<HTMLSpanElement | null>
  observer: MutableRefObject<ResizeObserver | null>
}

export const TableNode: FC<Props> = ({ data }) => {
  const isMobile = useIsTouchDevice()
  const { showMode: _showMode } = useUserEditingStore()
  const showMode = data.showMode ?? _showMode
  const name = data?.table?.name

  // Skip text truncation detection on mobile Safari
  const shouldSkipTruncation =
    isMobile && /iPhone|iPad|iPod/.test(navigator.userAgent)

  // Only create state and refs if we're not skipping truncation
  const [isTruncated, setIsTruncated] = useState<boolean>(false)

  // Don't create refs for mobile Safari
  const refs: Refs | null = !shouldSkipTruncation
    ? {
        text: useRef<HTMLSpanElement | null>(null),
        observer: useRef<ResizeObserver | null>(null),
      }
    : null

  const measureText = !shouldSkipTruncation
    ? useCallback((element: HTMLSpanElement) => {
        // Create a range to measure the text
        const range = document.createRange()
        range.selectNodeContents(element)

        // Get the text width using getBoundingClientRect
        const textWidth = range.getBoundingClientRect().width
        const containerWidth = element.getBoundingClientRect().width

        // Add a small threshold (0.016px) to account for subpixel rendering
        setIsTruncated(textWidth > containerWidth + 0.016)
      }, [])
    : null

  const setRef = !shouldSkipTruncation
    ? useCallback(
        (element: HTMLSpanElement | null) => {
          if (!refs) return // Type guard for refs
          const { text, observer } = refs

          if (text.current === element) return

          if (observer.current) {
            observer.current.disconnect()
          }

          text.current = element

          if (element && measureText) {
            measureText(element)
            observer.current = new ResizeObserver(() => measureText(element))
            observer.current.observe(element)
          }
        },
        [measureText, refs],
      )
    : null

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
            <TableHeader data={data} textRef={setRef} />
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
