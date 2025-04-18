/**
 * Utility functions: Mapping between category and kind
 */

// Category type used in the database
export type CategoryEnum =
  | 'MIGRATION_SAFETY'
  | 'DATA_INTEGRITY'
  | 'PERFORMANCE_IMPACT'
  | 'PROJECT_RULES_CONSISTENCY'
  | 'SECURITY_OR_SCALABILITY'

// Kind type used in the review schema
export type KindEnum =
  | 'Migration Safety'
  | 'Data Integrity'
  | 'Performance Impact'
  | 'Project Rules Consistency'
  | 'Security or Scalability'

/**
 * Converts database category format to review schema kind format
 */
export function categoryToKind(
  category: CategoryEnum | string | null | undefined,
): KindEnum {
  if (!category) return 'Migration Safety' // Default value

  const mapping: Record<string, KindEnum> = {
    MIGRATION_SAFETY: 'Migration Safety',
    DATA_INTEGRITY: 'Data Integrity',
    PERFORMANCE_IMPACT: 'Performance Impact',
    PROJECT_RULES_CONSISTENCY: 'Project Rules Consistency',
    SECURITY_OR_SCALABILITY: 'Security or Scalability',
  }

  return mapping[category] || 'Migration Safety'
}

/**
 * Converts review schema kind format to database category format
 */
export function kindToCategory(
  kind: KindEnum | string | null | undefined,
): CategoryEnum {
  if (!kind) return 'MIGRATION_SAFETY' // Default value

  const mapping: Record<string, CategoryEnum> = {
    'Migration Safety': 'MIGRATION_SAFETY',
    'Data Integrity': 'DATA_INTEGRITY',
    'Performance Impact': 'PERFORMANCE_IMPACT',
    'Project Rules Consistency': 'PROJECT_RULES_CONSISTENCY',
    'Security or Scalability': 'SECURITY_OR_SCALABILITY',
  }

  return mapping[kind] || 'MIGRATION_SAFETY'
}
