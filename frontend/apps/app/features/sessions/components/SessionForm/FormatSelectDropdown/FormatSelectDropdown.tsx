import { ChevronDown } from '@liam-hq/ui'
import { type FC, useEffect, useRef, useState } from 'react'
import {
  FormatIcon,
  type FormatType,
} from '../../../../../components/FormatIcon/FormatIcon'
import styles from './FormatSelectDropdown.module.css'
import { FormatSelectDropdownMenuItem } from './FormatSelectDropdownMenuItem'

interface FormatOption {
  format: FormatType
  label: string
}

interface FormatSelectDropdownProps {
  selectedFormat: FormatType
  onFormatChange: (format: FormatType) => void
}

const formatOptions: FormatOption[] = [
  { format: 'postgres', label: 'postgresql' },
  { format: 'prisma', label: 'prisma' },
  { format: 'schemarb', label: 'schemarb' },
  { format: 'tbls', label: 'tbls' },
  { format: 'json', label: 'json' },
  { format: 'yaml', label: 'yaml' },
]

export const FormatSelectDropdown: FC<FormatSelectDropdownProps> = ({
  selectedFormat,
  onFormatChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption =
    formatOptions.find((option) => option.format === selectedFormat) ||
    formatOptions[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectFormat = (format: FormatType) => {
    onFormatChange(format)
    setIsOpen(false)
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <FormatIcon format={selectedOption.format} size={16} />
        <span className={styles.label}>{selectedOption.label}</span>
        <ChevronDown
          size={12}
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownContent}>
            {formatOptions.map((option) => (
              <FormatSelectDropdownMenuItem
                key={option.format}
                format={option.format}
                label={option.label}
                isSelected={option.format === selectedFormat}
                onClick={() => handleSelectFormat(option.format)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
