import { DrawerContent, DrawerPortal, DrawerRoot } from '@liam-hq/ui'
import { type FC, type PropsWithChildren, useCallback } from 'react'
import { useSchema, useUserEditing } from '@/stores'
import { TableDetail } from '../../ERDContent/components/TableNode/TableDetail'
import styles from './TableDetailDrawer.module.css'

export const TableDetailDrawerRoot: FC<PropsWithChildren> = ({ children }) => {
  const userEditingResult = useUserEditing()
  const { activeTableName, setActiveTableName } = userEditingResult.match(
    (val) => val,
    (error) => {
      throw error
    },
  )
  const schemaResult = useSchema()
  const { current } = schemaResult.match(
    (val) => val,
    (error) => {
      throw error
    },
  )
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
  const schemaResult = useSchema()
  const { current } = schemaResult.match(
    (val) => val,
    (error) => {
      throw error
    },
  )
  const userEditingResult = useUserEditing()
  const { activeTableName } = userEditingResult.match(
    (val) => val,
    (error) => {
      throw error
    },
  )
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
