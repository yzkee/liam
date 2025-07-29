'use client'

import type { Artifact } from '@liam-hq/artifact'
import type { FC } from 'react'
import styles from './StructuredArtifact.module.css'
import { UseCaseSection } from './UseCaseSection'

type Props = {
  artifact: Artifact
}

export const StructuredArtifact: FC<Props> = ({ artifact }) => {
  const { requirement_analysis } = artifact
  const { business_requirement, requirements } = requirement_analysis

  const functionalRequirements = requirements.filter(
    (req) => req.type === 'functional',
  )
  const nonFunctionalRequirements = requirements.filter(
    (req) => req.type === 'non_functional',
  )

  return (
    <div className={styles.container}>
      <section className={styles.businessRequirement}>
        <h2 className={styles.sectionTitle}>Business Requirement</h2>
        <p className={styles.businessRequirementText}>{business_requirement}</p>
      </section>

      {requirements.length > 0 && (
        <section className={styles.requirements}>
          <h2 className={styles.sectionTitle}>Requirements</h2>

          {functionalRequirements.length > 0 && (
            <div className={styles.functionalRequirements}>
              <h3 className={styles.subsectionTitle}>
                Functional Requirements
              </h3>
              {functionalRequirements.map((req, index) => (
                <div
                  key={`functional-${req.name}-${index}`}
                  className={styles.requirement}
                >
                  <h4 className={styles.requirementTitle}>
                    {index + 1}. {req.name}
                  </h4>
                  <p className={styles.requirementDescription}>
                    {req.description}
                  </p>

                  {req.type === 'functional' && req.use_cases.length > 0 && (
                    <div className={styles.useCases}>
                      <h5 className={styles.useCasesTitle}>Use Cases:</h5>
                      {req.use_cases.map((useCase, ucIndex) => (
                        <UseCaseSection
                          key={`${req.name}-${useCase.title}-${ucIndex}`}
                          useCase={useCase}
                          index={ucIndex}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {nonFunctionalRequirements.length > 0 && (
            <div className={styles.nonFunctionalRequirements}>
              <h3 className={styles.subsectionTitle}>
                Non-Functional Requirements
              </h3>
              {nonFunctionalRequirements.map((req, index) => (
                <div
                  key={`non-functional-${req.name}-${index}`}
                  className={styles.requirement}
                >
                  <h4 className={styles.requirementTitle}>
                    {index + 1}. {req.name}
                  </h4>
                  <p className={styles.requirementDescription}>
                    {req.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
