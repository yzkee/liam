import { urlgen } from '@/libs/routes'
import clsx from 'clsx'
import Link from 'next/link'
import type { FC } from 'react'
import itemStyles from '../Item.module.css'
import type { RecentSession } from '../services/fetchRecentSessions'
import styles from './RecentsSection.module.css'

type RecentsSectionProps = {
  sessions: RecentSession[]
}

export const RecentsSection: FC<RecentsSectionProps> = ({ sessions }) => {
  return (
    <>
      <div className={clsx(itemStyles.item, styles.recentsCollapsed)}>
        <div className={itemStyles.labelArea}>
          <span className={itemStyles.label}>Recents</span>
        </div>
      </div>
      <div className={styles.recentsExpanded}>
        <div className={styles.recentsSection}>
          <div className={styles.recentsHeader}>
            <div className={itemStyles.labelArea}>
              <span className={clsx(itemStyles.label, styles.recentsTitle)}>
                Recents
              </span>
            </div>
          </div>

          {sessions.length > 0 ? (
            <div className={styles.sessionsList}>
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={urlgen('design_sessions/[id]', { id: session.id })}
                  className={styles.sessionItem}
                >
                  <span className={styles.sessionName}>{session.name}</span>
                  <span className={styles.sessionDate}>
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyText}>No recent sessions</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
