'use client'

import { PGlite } from '@electric-sql/pglite'
import { useEffect, useState } from 'react'
import { DDLInputSection } from './DDLInputSection'
import { DMLInputSection } from './DMLInputSection'
import styles from './PGlitePlayground.module.css'
import { applyDDL, applyDML } from './utils'
import type { DDLState, DMLSection } from './utils/types'

export function PGlitePlayground() {
  // Global DB (for DDL)
  const [globalDb, setGlobalDb] = useState<PGlite | null>(null)

  // DDL section state
  const [ddlState, setDdlState] = useState<DDLState>({
    ddlInput: '',
    results: [],
  })

  // DML sections state (multiple)
  const [dmlSections, setDmlSections] = useState<DMLSection[]>([])

  // Initialization
  useEffect(() => {
    const initializeDb = async () => {
      const db = new PGlite()
      setGlobalDb(db)

      // Add one initial DML section
      addDMLSection(db)
    }

    initializeDb()
  }, [])

  // Update DDL input
  const updateDdlInput = (value: string) => {
    setDdlState((prev) => ({
      ...prev,
      ddlInput: value,
    }))
  }

  // Update DML input
  const updateDmlInput = (sectionId: string, value: string) => {
    setDmlSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, dmlInput: value } : section,
      ),
    )
  }

  // Execute DDL
  const executeDDL = async () => {
    if (!globalDb || !ddlState.ddlInput.trim()) return

    // Execute DDL and save results
    const results = await applyDDL(ddlState.ddlInput, globalDb)
    setDdlState((prev) => ({
      ...prev,
      results: [...prev.results, ...results],
    }))

    // After DDL execution, update all DML section DBs
    updateAllDmlSections()
  }

  // Update all DML section DBs (after DDL changes)
  const updateAllDmlSections = async () => {
    if (!globalDb) return

    // Create new DB instances for each DML section and apply DDL
    const updatedSections = await Promise.all(
      dmlSections.map(async (section) => {
        const newDb = new PGlite()

        // Apply current DDL to the new DB instance
        if (ddlState.ddlInput) {
          await applyDDL(ddlState.ddlInput, newDb)
        }

        return {
          ...section,
          db: newDb,
        }
      }),
    )

    setDmlSections(updatedSections)
  }

  // Add DML section
  const addDMLSection = async (initialDb?: PGlite) => {
    const newDb = initialDb || new PGlite()

    // Apply current DDL to the new DB instance
    if (ddlState.ddlInput) {
      await applyDDL(ddlState.ddlInput, newDb)
    }

    setDmlSections((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        dmlInput: '',
        results: [],
        db: newDb,
      },
    ])
  }

  // Execute DML (for a specific section)
  const executeDML = async (sectionId: string) => {
    const sectionIndex = dmlSections.findIndex((s) => s.id === sectionId)
    if (sectionIndex === -1) return

    const section = dmlSections[sectionIndex]
    if (!section.db || !section.dmlInput.trim()) return

    // Execute DML and save results
    const results = await applyDML(section.dmlInput, section.db)

    setDmlSections((prev) => {
      const newSections = [...prev]
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        results: [...newSections[sectionIndex].results, ...results],
        dmlInput: '', // Clear input
      }
      return newSections
    })
  }

  // Remove DML section
  const removeDMLSection = (sectionId: string) => {
    setDmlSections((prev) => prev.filter((section) => section.id !== sectionId))
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>PGlite Playground</h1>

      <div
        className={`${styles.status} ${globalDb ? styles.success : styles.loading}`}
      >
        {globalDb
          ? 'PGlite Database Connected'
          : 'PGlite Database Connecting...'}
      </div>

      {/* DDL Input Section (Global) - Componentized */}
      <DDLInputSection
        ddlState={ddlState}
        updateDdlInput={updateDdlInput}
        executeDDL={executeDDL}
      />

      <div className={styles.divider} />

      {/* DML Sections (Multiple) */}
      <div className={styles.playgroundSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>DML Use Case Section</h2>
        </div>
        <p className={styles.description}>
          Each DML form runs in an isolated environment. Results are not
          affected by other forms' executions.
        </p>

        {dmlSections.map((section) => {
          // Use DMLInputSection component
          return (
            <DMLInputSection
              key={section.id}
              section={section}
              updateDmlInput={updateDmlInput}
              executeDML={executeDML}
              removeDMLSection={removeDMLSection}
            />
          )
        })}

        {/* Add DML Form Button */}
        <button
          type="button"
          onClick={() => addDMLSection()}
          className={`${styles.actionButton} ${styles.secondaryButton}`}
        >
          ＋ Add DML Form
        </button>
      </div>
    </div>
  )
}
