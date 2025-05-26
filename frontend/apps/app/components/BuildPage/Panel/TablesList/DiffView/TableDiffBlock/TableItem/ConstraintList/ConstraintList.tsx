import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
} from '@/components'
import type { Constraints, SchemaDiffItem } from '@liam-hq/db-structure'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  KeyRound,
  Link,
} from 'lucide-react'
import type { FC } from 'react'
import {
  CheckConstraintItem,
  ForeignKeyConstraintItem,
  PrimaryConstraintItem,
  UniqueConstraintItem,
} from './ConstraintItem'
import styles from './ConstraintList.module.css'

type Props = {
  constraints: Constraints
  tableId: string
  type: 'before' | 'after'
  diffItems: SchemaDiffItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ConstraintList: FC<Props> = ({
  constraints: _constraints,
  tableId,
  type,
  diffItems,
  open,
  onOpenChange,
}) => {
  const constraints = Object.values(_constraints)

  const primaryKeyConstraints = constraints.filter(
    (constraint) => constraint.type === 'PRIMARY KEY',
  )
  const foreignKeyConstraints = constraints.filter(
    (constraint) => constraint.type === 'FOREIGN KEY',
  )
  const uniqueConstraints = constraints.filter(
    (constraint) => constraint.type === 'UNIQUE',
  )
  const checkConstraints = constraints.filter(
    (constraint) => constraint.type === 'CHECK',
  )

  return (
    <CollapsibleRoot open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className={styles.trigger}>
        <h2>Constraint</h2>
        {open ? (
          <ChevronUp className={styles.triggerIcon} />
        ) : (
          <ChevronDown className={styles.triggerIcon} />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {primaryKeyConstraints.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <KeyRound className={styles.sectionIcon} />
              Primary key
            </h3>
            {primaryKeyConstraints.map((constraint) => (
              <PrimaryConstraintItem
                key={constraint.name}
                constraint={constraint}
                tableId={tableId}
                diffItems={diffItems}
                type={type}
              />
            ))}
          </div>
        )}

        {foreignKeyConstraints.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Link className={styles.sectionIcon} />
              Foreign key
            </h3>
            {foreignKeyConstraints.map((constraint) => (
              <ForeignKeyConstraintItem
                key={constraint.name}
                constraint={constraint}
                tableId={tableId}
                diffItems={diffItems}
                type={type}
              />
            ))}
          </div>
        )}

        {uniqueConstraints.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Fingerprint className={styles.sectionIcon} />
              Unique
            </h3>
            {uniqueConstraints.map((constraint) => (
              <UniqueConstraintItem
                key={constraint.name}
                constraint={constraint}
                tableId={tableId}
                diffItems={diffItems}
                type={type}
              />
            ))}
          </div>
        )}

        {checkConstraints.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Check className={styles.sectionIcon} />
              Check
            </h3>
            {checkConstraints.map((constraint) => (
              <CheckConstraintItem
                key={constraint.name}
                constraint={constraint}
                tableId={tableId}
                diffItems={diffItems}
                type={type}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </CollapsibleRoot>
  )
}
