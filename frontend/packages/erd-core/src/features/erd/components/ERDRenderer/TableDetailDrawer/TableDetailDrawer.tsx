import { DrawerContent, DrawerPortal, DrawerRoot } from '@liam-hq/ui'
import { type FC, type PropsWithChildren, useCallback } from 'react'
import { useSchemaOrThrow, useUserEditingOrThrow } from '@/stores'
import { TableDetail } from '../../ERDContent/components/TableNode/TableDetail'
import styles from './TableDetailDrawer.module.css'

export const TableDetailDrawerRoot: FC<PropsWithChildren> = ({ children }) => {
  const userEditing = useUserEditingOrThrow()
  const { activeTableName, setActiveTableName } = userEditing

  const schema = useSchemaOrThrow()
  const { current } = schema
  const open =
    Object.keys(current.tables).length > 0 && activeTableName !== undefined

  const handleClose = useCallback(() => {
    setActiveTableName(null)
  }, [setActiveTableName])

  return (
    <DrawerRoot
      direction="right"
      // Set snapPoints to an empty array to disable the drawer snapping functionality.
      // This behavior is an undocumented, unofficial usage and might change in the future.
      // ref: https://github.com/emilkowalski/vaul/blob/main/src/use-snap-points.ts
      snapPoints={[]}
      open={open}
      onClose={handleClose}
      modal={false}
    >
      {children}
    </DrawerRoot>
  )
}

export const TableDetailDrawer: FC = () => {
  const schema = useSchemaOrThrow()
  const { current } = schema

  const userEditing = useUserEditingOrThrow()
  const { activeTableName } = userEditing

  const table = current.tables[activeTableName ?? '']
  const ariaDescribedBy =
    table?.comment == null
      ? {
          'aria-describedby': undefined,
        }
      : {}

  return (
    <DrawerPortal>
      {table !== undefined && (
        <DrawerContent className={styles.content} {...ariaDescribedBy}>
          <TableDetail table={table} />
        </DrawerContent>
      )}
    </DrawerPortal>
  )
}
