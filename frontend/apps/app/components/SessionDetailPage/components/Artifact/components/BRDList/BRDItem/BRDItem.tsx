import type { FC } from 'react'
import { ERD } from '../../ERD'
import type { BusinessRequirement } from '../types'
import styles from './BRDItem.module.css'

type Props = {
  item: BusinessRequirement
}

export const BRDItem: FC<Props> = ({ item }) => {
  return (
    <section className={styles.section}>
      <h1 className={styles.sectionTitle}>
        <span className={styles.sectionId}>{item.id}</span>
        {item.title}
      </h1>
      <div className={styles.sectionBody}>
        <ul className={styles.overviewList}>
          {item.overview.map((text, textIndex) => (
            <li
              key={`overview-${item.id}-${textIndex}`}
              className={styles.overviewItem}
            >
              {text}
            </li>
          ))}
        </ul>

        <div className={styles.subSection}>
          <h2 className={styles.subSectionTitle}>Related Tables</h2>
          <div className={styles.relatedSchemaWrapper}>
            <ERD schema={item.relatedSchema} />
          </div>
        </div>
      </div>
    </section>
  )
}
