import { Check } from '@liam-hq/ui'
import type { FC } from 'react'
import { FormatIcon, type FormatType } from '../../../../../components/FormatIcon/FormatIcon'
import styles from './FormatSelectDropdownMenuItem.module.css'

interface FormatSelectDropdownMenuItemProps {
  format: FormatType
  label: string
  isSelected?: boolean
  onClick?: () => void
}

export const FormatSelectDropdownMenuItem: FC<FormatSelectDropdownMenuItemProps> = ({
  format,
  label,
  isSelected = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      className={`${styles.menuItem} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      <div className={styles.content}>
        <FormatIcon format={format} size={16} />
        <span className={styles.label}>{label}</span>
      </div>
      {isSelected && (
        <Check size={10} className={styles.checkIcon} />
      )}
    </button>
  )
}