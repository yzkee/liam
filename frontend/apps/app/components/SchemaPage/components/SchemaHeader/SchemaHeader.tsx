import type { FC } from 'react'
import { TabsList, TabsTrigger } from '@/components'
import { SchemaLink } from '@/components/SchemaLink'
import { SCHEMA_TABS } from '../../constants'
import styles from './SchemaHeader.module.css'

export const SchemaHeader: FC = () => {
  return (
    <div className={styles.wrapper}>
      <span className={styles.schemaNameLabel}>Schema:</span>
      <SchemaLink schemaName="schema1.in.rb" format="schemarb" />
      <TabsList className={styles.tabsList}>
        {SCHEMA_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={styles.tabsTrigger}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  )
}
