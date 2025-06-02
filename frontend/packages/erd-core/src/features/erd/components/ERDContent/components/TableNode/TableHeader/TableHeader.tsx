import type { TableNodeData } from '@/features/erd/types'
import { useCustomReactflow } from '@/features/reactflow/hooks'
import { useIsTouchDevice } from '@/hooks'
import { useUserEditingStore } from '@/stores'
import { Table2 } from '@liam-hq/ui'
import { Handle, Position } from '@xyflow/react'
import clsx from 'clsx'
import { type FC, useRef } from 'react'
import styles from './TableHeader.module.css'

type Props = {
  data: TableNodeData
}

export const TableHeader: FC<Props> = ({ data }) => {
  const name = data.table.name
  const { showMode: _showMode } = useUserEditingStore()
  const showMode = data.showMode ?? _showMode

  const isTarget = data.targetColumnCardinalities !== undefined
  const isSource = data.sourceColumnName !== undefined

  const { updateNode } = useCustomReactflow()
  const isTouchDevice = useIsTouchDevice()

  const textRef = useRef<HTMLSpanElement>(null)

  const handleHoverEvent = () => {
    if (isTouchDevice) return

    const element = textRef.current
    if (!element) return

    // Create a range to measure the text
    const range = document.createRange()
    range.selectNodeContents(element)

    // Get the text width using getBoundingClientRect
    const textWidth = range.getBoundingClientRect().width
    const containerWidth = element.getBoundingClientRect().width

    // Add a small threshold (0.016px) to account for subpixel rendering
    updateNode(name, {
      data: {
        ...data,
        isTooltipVisible: textWidth > containerWidth + 0.016,
      },
    })
  }

  return (
    <div
      className={clsx(
        styles.wrapper,
        showMode === 'TABLE_NAME' && styles.wrapperTableNameMode,
      )}
    >
      <Table2 width={16} className={styles.tableIcon} />

      <span
        className={styles.name}
        onMouseEnter={handleHoverEvent}
        ref={textRef}
      >
        {name}
      </span>

      {showMode === 'TABLE_NAME' && (
        <>
          {isTarget && (
            <Handle
              id={name}
              type="target"
              position={Position.Left}
              className={styles.handle}
            />
          )}
          {isSource && (
            <Handle
              id={name}
              type="source"
              position={Position.Right}
              className={styles.handle}
            />
          )}
        </>
      )}
    </div>
  )
}
