import type { Schema } from '@liam-hq/db-structure'
import { TabsList, TabsTrigger } from '@liam-hq/ui'
import clsx from 'clsx'
import type { ComponentProps, FC } from 'react'
import {
  ARTIFACT_TAB,
  ERD_SCHEMA_TABS_LIST,
  type OutputTabValue,
} from '../../constants'
import { ExportDropdown } from './ExportDropdown'
import styles from './Header.module.css'
import { VersionDropdown } from './VersionDropdown'

type Props = ComponentProps<typeof VersionDropdown> & {
  schema: Schema
  tabValue: OutputTabValue
  artifactDoc?: string
}

export const Header: FC<Props> = ({
  schema,
  tabValue,
  artifactDoc,
  ...propsForVersionDropdown
}) => {
  return (
    <div className={styles.wrapper}>
      <TabsList className={styles.tabsList}>
        <div
          className={clsx(styles.tab, styles.erdSchemaTabsGroup)}
          data-state={
            ERD_SCHEMA_TABS_LIST.some((tab) => tab.value === tabValue)
              ? 'active'
              : 'inactive'
          }
        >
          <div className={styles.erdSchemaTabs}>
            {ERD_SCHEMA_TABS_LIST.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={styles.erdSchemaTrigger}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </div>
          <div className={styles.divider} />
          <VersionDropdown {...propsForVersionDropdown} />
        </div>
        <TabsTrigger
          value={ARTIFACT_TAB.value}
          className={clsx(styles.tab, styles.artifactTrigger)}
        >
          {ARTIFACT_TAB.label}
        </TabsTrigger>
      </TabsList>
      <div className={styles.tail}>
        <ExportDropdown schema={schema} artifactDoc={artifactDoc} />
      </div>
    </div>
  )
}
