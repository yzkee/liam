import type { FC } from 'react'
import styles from './MigrationsViewer.module.css'
import { useMigrationsViewer } from './useMigrationsViewer'

type Props = {
  doc: string
  prevDoc?: string
  showDiff?: boolean
}

export const MigrationsViewer: FC<Props> = ({ doc, prevDoc, showDiff }) => {
  const { ref } = useMigrationsViewer({
    doc,
    prevDoc,
    showDiff,
  })

  return <div ref={ref} className={styles.wrapper} />
}
