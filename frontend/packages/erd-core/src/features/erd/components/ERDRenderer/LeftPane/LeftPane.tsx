import { isTableNode } from '@/features/erd/utils'
import { useCustomReactflow } from '@/features/reactflow/hooks'
import { useVersion } from '@/providers'
import {
  replaceHiddenNodeIds,
  resetSelectedNodeIds,
  useUserEditingStore,
} from '@/stores'
import {
  BookText,
  Eye,
  EyeClosed,
  GithubLogo,
  IconButton,
  LiamLogoMark,
  Megaphone,
  MessagesSquare,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from '@liam-hq/ui'
import { useNodes } from '@xyflow/react'
import { useCallback, useMemo } from 'react'
import { updateNodesHiddenState } from '../../ERDContent/utils'
import { CopyLinkButton } from './CopyLinkButton'
import styles from './LeftPane.module.css'
import { MenuItemLink, type Props as MenuItemLinkProps } from './MenuItemLink'
import { TableCounter } from './TableCounter'
import { TableNameMenuButton } from './TableNameMenuButton'

export const LeftPane = () => {
  const { version } = useVersion()
  const { selectedNodeIds } = useUserEditingStore()
  const { setNodes } = useCustomReactflow()

  const menuItemLinks = useMemo(
    (): MenuItemLinkProps[] => [
      {
        label: 'Release Notes',
        href: 'https://github.com/liam-hq/liam/releases',
        noreferrer: true,
        target: '_blank',
        icon: <Megaphone className={styles.icon} />,
      },
      {
        label: 'Documentation',
        href: 'https://liambx.com/docs',
        noreferrer: version.displayedOn === 'cli',
        target: '_blank',
        icon: <BookText className={styles.icon} />,
      },
      {
        label: 'Community Forum',
        href: 'https://github.com/liam-hq/liam/discussions',
        noreferrer: true,
        target: '_blank',
        icon: <MessagesSquare className={styles.icon} />,
      },
      {
        label: 'Go to Homepage',
        href: 'https://liambx.com/',
        noreferrer: version.displayedOn === 'cli',
        target: '_blank',
        icon: <LiamLogoMark className={styles.icon} />,
      },
      {
        label: 'Go to GitHub',
        href: 'https://github.com/liam-hq/liam',
        noreferrer: true,
        target: '_blank',
        icon: <GithubLogo className={styles.icon} />,
      },
    ],
    [version.displayedOn],
  )

  const nodes = useNodes()
  const tableNodes = useMemo(() => {
    return nodes.filter(isTableNode).sort((a, b) => {
      const nameA = a.data.table.name
      const nameB = b.data.table.name
      if (nameA < nameB) {
        return -1
      }
      if (nameA > nameB) {
        return 1
      }
      return 0
    })
  }, [nodes])

  const allCount = tableNodes.length
  const visibleCount = tableNodes.filter((node) => !node.hidden).length

  const showOrHideAllNodes = useCallback(() => {
    resetSelectedNodeIds()
    const shouldHide = visibleCount === allCount
    const updatedNodes = updateNodesHiddenState({
      nodes,
      hiddenNodeIds: shouldHide ? nodes.map((node) => node.id) : [],
      shouldHideGroupNodeId: true,
    })
    setNodes(updatedNodes)
  }, [nodes, visibleCount, allCount, setNodes])

  const showSelectedTables = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      const hiddenNodeIds = nodes
        .filter((node) => !selectedNodeIds.has(node.id))
        .map((node) => node.id)
      const updatedNodes = updateNodesHiddenState({
        nodes,
        hiddenNodeIds: hiddenNodeIds,
        shouldHideGroupNodeId: true,
      })
      setNodes(updatedNodes)
      replaceHiddenNodeIds(hiddenNodeIds)
    }
  }, [nodes, selectedNodeIds, setNodes])

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={styles.groupLabel} asChild>
            <span>Tables</span>
            <span className={styles.tableCount}>
              {visibleCount}
              <span className={styles.tableCountDivider}>/</span>
              {allCount}
            </span>
            <IconButton
              icon={visibleCount === allCount ? <EyeClosed /> : <Eye />}
              tooltipContent={
                visibleCount === allCount
                  ? 'Hide All Tables'
                  : 'Show All Tables'
              }
              onClick={showOrHideAllNodes}
              onKeyDown={showOrHideAllNodes}
              className={styles.textCursor}
            />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tableNodes.map((node) => (
                <TableNameMenuButton
                  key={node.id}
                  node={node}
                  nodes={tableNodes}
                  showSelectedTables={showSelectedTables}
                />
              ))}
            </SidebarMenu>

            <SidebarMenu className={styles.contentControls}>
              <CopyLinkButton />
            </SidebarMenu>

            <SidebarMenu className={styles.contentLinks}>
              {menuItemLinks.map((item) => (
                <MenuItemLink {...item} key={item.label} />
              ))}
              <SidebarMenuItem className={styles.versionWrapper}>
                <div className={styles.version}>
                  <span className={styles.versionText}>{`${
                    version.version
                  } + ${version.gitHash.slice(0, 7)} (${version.date})`}</span>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={styles.footer}>
        <div className={styles.tableCounterWrapper}>
          <TableCounter allCount={allCount} visibleCount={visibleCount} />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
