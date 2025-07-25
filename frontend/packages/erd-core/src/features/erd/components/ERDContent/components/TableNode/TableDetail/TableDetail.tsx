import type { Table } from '@liam-hq/db-structure'
import {
  DrawerClose,
  DrawerTitle,
  IconButton,
  Table2 as Table2Icon,
  XIcon,
} from '@liam-hq/ui'
import { type FC, useCallback } from 'react'
import { computeAutoLayout, convertSchemaToNodes } from '@/features/erd/utils'
import { clickLogEvent, openRelatedTablesLogEvent } from '@/features/gtm/utils'
import { useCustomReactflow } from '@/features/reactflow/hooks'
import { useVersionOrThrow } from '@/providers'
import { useSchemaOrThrow, useUserEditingOrThrow } from '@/stores'
import { updateNodesHiddenState } from '../../../utils'
import { Columns } from './Columns'
import { Comment } from './Comment'
import { Constraints } from './Constraints'
import { extractSchemaForTable } from './extractSchemaForTable'
import { Indexes } from './Indexes'
import { RelatedTables } from './RelatedTables'
import styles from './TableDetail.module.css'

type Props = {
  table: Table
}

export const TableDetail: FC<Props> = ({ table }) => {
  const { setActiveTableName, setHiddenNodeIds } = useUserEditingOrThrow()

  const { current } = useSchemaOrThrow()

  const extractedSchema = extractSchemaForTable(table, current)
  const { nodes, edges } = convertSchemaToNodes({
    schema: extractedSchema,
    showMode: 'TABLE_NAME',
  })

  const { getNodes, getEdges, setNodes, setEdges, fitView } =
    useCustomReactflow()
  const { version } = useVersionOrThrow()

  const handleDrawerClose = () => {
    clickLogEvent({
      element: 'closeTableDetailButton',
      platform: version.displayedOn,
      gitHash: version.gitHash,
      ver: version.version,
      appEnv: version.envName,
    })
  }

  const handleOpenMainPane = useCallback(async () => {
    const visibleNodeIds: string[] = nodes.map((node) => node.id)
    const mainPaneNodes = getNodes()
    const hiddenNodeIds = mainPaneNodes
      .filter((node) => !visibleNodeIds.includes(node.id))
      .map((node) => node.id)
    const updatedNodes = updateNodesHiddenState({
      nodes: mainPaneNodes,
      hiddenNodeIds,
      shouldHideGroupNodeId: true,
    })

    setHiddenNodeIds(hiddenNodeIds)
    setActiveTableName(null)

    const { nodes: layoutedNodes, edges: layoutedEdges } =
      await computeAutoLayout(updatedNodes, getEdges())
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
    fitView()

    openRelatedTablesLogEvent({
      tableId: table.name,
      platform: version.displayedOn,
      gitHash: version.gitHash,
      ver: version.version,
      appEnv: version.envName,
    })
  }, [
    nodes,
    table,
    version,
    setActiveTableName,
    setHiddenNodeIds,
    getNodes,
    getEdges,
    setNodes,
    setEdges,
    fitView,
  ])

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <DrawerTitle asChild>
          <div className={styles.iconTitleContainer}>
            <Table2Icon width={12} />
            <h1 className={styles.heading}>{table.name}</h1>
          </div>
        </DrawerTitle>
        <DrawerClose asChild>
          <IconButton
            icon={<XIcon />}
            tooltipContent="Close"
            onClick={handleDrawerClose}
          />
        </DrawerClose>
      </div>
      <div className={styles.body}>
        {table.comment && <Comment comment={table.comment} />}
        <Columns columns={table.columns} constraints={table.constraints} />
        <Indexes indexes={table.indexes} />
        <Constraints constraints={table.constraints} />
        <div className={styles.relatedTables}>
          <RelatedTables
            nodes={nodes}
            edges={edges}
            onOpenMainPane={handleOpenMainPane}
          />
        </div>
      </div>
    </section>
  )
}
