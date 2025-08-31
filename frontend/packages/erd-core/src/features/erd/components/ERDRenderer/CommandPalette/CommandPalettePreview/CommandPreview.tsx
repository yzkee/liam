import type { FC } from 'react'
import showAllFields from './assets/show-all-fields.png'
import showKeyOnly from './assets/show-key-only.png'
import showTableName from './assets/show-table-name.png'
import styles from './CommandPalettePreview.module.css'

type Props = {
  commandName: string
}

const COMMAND_IMAGE_SOURCE: Record<string, string> = {
  'Show All Fields': showAllFields,
  'Show Key Only': showKeyOnly,
  'Show Table Name': showTableName,
}

export const CommandPreview: FC<Props> = ({ commandName }) => {
  return (
    <div className={styles.container}>
      {COMMAND_IMAGE_SOURCE[commandName] && (
        <img
          src={COMMAND_IMAGE_SOURCE[commandName]}
          className={styles.image}
          alt=""
        />
      )}
    </div>
  )
}
