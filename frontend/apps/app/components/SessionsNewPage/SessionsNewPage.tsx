'use client'

import { SessionForm } from '@/features/sessions/components/SessionForm'
import type { FC } from 'react'
import type { Projects } from '../CommonLayout/AppBar/ProjectsDropdownMenu/services/getProjects'
import styles from './SessionsNewPage.module.css'

type Props = {
  projects: Projects | null
}

export const SessionsNewPage: FC<Props> = ({ projects }) => {
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <h1 className={styles.title}>What can I help you Database Design?</h1>
        <SessionForm projects={projects} variant="standalone" />
      </div>
    </div>
  )
}
