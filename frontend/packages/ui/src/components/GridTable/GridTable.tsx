import { clsx } from 'clsx'
import { forwardRef } from 'react'
import type { ComponentProps } from 'react'
import styles from './GridTable.module.css'

type GridTableRootProps = ComponentProps<'dl'>
export const GridTableRoot = forwardRef<HTMLDListElement, GridTableRootProps>(
  ({ className, ...props }, ref) => (
    <dl ref={ref} className={clsx(styles.root, className)} {...props} />
  ),
)

type GridTableHeaderProps = ComponentProps<'dt'>
export const GridTableHeader = forwardRef<HTMLElement, GridTableHeaderProps>(
  ({ className, ...props }, ref) => (
    <div className={styles.dlItem}>
      <dt ref={ref} className={clsx(styles.dtHeader, className)} {...props} />
    </div>
  ),
)

type GridTableItemProps = ComponentProps<'div'>
export const GridTableItem = forwardRef<HTMLDivElement, GridTableItemProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx(styles.dlItem, className)} {...props} />
  ),
)

type GridTableDtProps = ComponentProps<'dt'>
export const GridTableDt = forwardRef<HTMLElement, GridTableDtProps>(
  ({ className, ...props }, ref) => (
    <dt ref={ref} className={clsx(styles.dt, className)} {...props} />
  ),
)

type GridTableDdProps = ComponentProps<'dd'>
export const GridTableDd = forwardRef<HTMLElement, GridTableDdProps>(
  ({ className, ...props }, ref) => (
    <dd ref={ref} className={clsx(styles.dd, className)} {...props} />
  ),
)

type GridTableRowProps = ComponentProps<'dt'>
export const GridTableRow = forwardRef<HTMLElement, GridTableRowProps>(
  ({ className, ...props }, ref) => (
    <dt
      ref={ref}
      className={clsx(styles.dt, styles.row, className)}
      {...props}
    />
  ),
)
