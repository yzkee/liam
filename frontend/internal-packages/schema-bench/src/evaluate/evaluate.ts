/**
 * Database Schema Evaluation Script
 *
 * This script evaluates the accuracy of predicted database schemas against reference schemas.
 * It performs comprehensive matching and scoring across multiple dimensions:
 * - Table name mapping using word overlap and semantic similarity
 * - Column name matching within each table
 * - Primary key validation
 * - Constraint validation
 *
 * The evaluation produces metrics including F1 scores, precision/recall, and all-correct rates
 * to assess the quality of schema prediction models or tools.
 */
import type {
  ForeignKeyConstraint,
  PrimaryKeyConstraint,
  Schema,
} from '@liam-hq/db-structure'
import { nameSimilarity } from '../nameSimilarity'
import { wordOverlapMatch } from '../wordOverlapMatch'

// Small epsilon value for numerical comparisons
const EPSILON = 1e-5

// Threshold for determining if all components are correct (table + column + primary key)
// The value 2.9 represents the sum of perfect scores across three dimensions:
// - Table name matching (1.0)
// - Column name matching (1.0)
// - Primary key validation (0.9)
// This threshold ensures that all components must achieve near-perfect accuracy to be considered "all correct."
const ALL_CORRECT_THRESHOLD = 2.9

type Mapping = Record<string, string>

type EvaluateResult = {
  tableMapping: Mapping
  columnMappings: Record<string, Mapping>
  tableF1Score: number
  tableAllCorrectRate: number
  columnF1ScoreAverage: number
  columnAllCorrectRateAverage: number
  primaryKeyAccuracyAverage: number
  constraintAccuracy: number
  foreignKeyF1Score: number
  foreignKeyAllCorrectRate: number
  overallSchemaAccuracy: number
}

const createTableMapping = async (
  referenceTableNames: string[],
  predictTableNames: string[],
): Promise<Mapping> => {
  const tableMapping: Mapping = {}

  // NOTE: Implement synonym matching if needed
  // --- (0) synonym matching

  // --- (1) name similarity matching
  await nameSimilarity(referenceTableNames, predictTableNames, tableMapping)

  // --- (2) word overlap matching
  wordOverlapMatch(referenceTableNames, predictTableNames, tableMapping)

  return tableMapping
}

const calculateTableMetrics = (
  referenceTableNames: string[],
  predictTableNames: string[],
  tableMapping: Mapping,
) => {
  const tablePrecision =
    predictTableNames.length === 0
      ? 0
      : Object.keys(tableMapping).length / predictTableNames.length
  const tableRecall =
    referenceTableNames.length === 0
      ? 0
      : Object.keys(tableMapping).length / referenceTableNames.length
  const tableF1 =
    tablePrecision + tableRecall === 0
      ? 0
      : (2 * tablePrecision * tableRecall) / (tablePrecision + tableRecall)
  const tableAllcorrect = tableF1 === 1 ? 1 : 0

  return { tableF1, tableAllcorrect }
}

const createColumnMapping = async (
  referenceColumnNames: string[],
  predictColumnNames: string[],
): Promise<Mapping> => {
  const columnMapping: Mapping = {}

  // NOTE: Implement synonym matching if needed
  // --- (0) synonym matching

  // --- (1) name similarity matching
  await nameSimilarity(referenceColumnNames, predictColumnNames, columnMapping)

  // --- (2) word overlap matching
  wordOverlapMatch(referenceColumnNames, predictColumnNames, columnMapping)

  return columnMapping
}

const calculateColumnMetrics = (
  referenceColumnNames: string[],
  predictColumnNames: string[],
  columnMapping: Mapping,
) => {
  const columnPrecision =
    predictColumnNames.length === 0
      ? 0
      : Object.keys(columnMapping).length / predictColumnNames.length
  const columnRecall =
    referenceColumnNames.length === 0
      ? 0
      : Object.keys(columnMapping).length / referenceColumnNames.length
  const columnF1 =
    columnPrecision + columnRecall === 0
      ? 0
      : (2 * columnPrecision * columnRecall) / (columnPrecision + columnRecall)

  return {
    columnF1,
    columnAllcorrect: Math.abs(columnF1 - 1) < EPSILON ? 1 : 0,
  }
}

const validatePrimaryKeys = (
  referenceTable: Schema['tables'][string],
  predictTable: Schema['tables'][string],
  columnMapping: Mapping,
): boolean => {
  const referencePKs = Object.values(referenceTable.constraints)
    .filter((c): c is PrimaryKeyConstraint => c.type === 'PRIMARY KEY')
    .map((c) => c.columnName)
  const predictPKs = Object.values(predictTable.constraints)
    .filter((c): c is PrimaryKeyConstraint => c.type === 'PRIMARY KEY')
    .map((c) => c.columnName)

  if (referencePKs.length !== predictPKs.length) {
    return false
  }

  return referencePKs.every(
    (k: string) => columnMapping[k] && predictPKs.includes(columnMapping[k]),
  )
}

// TODO: Implement constraint validation logic. Now it only checks if the number of constraints matches.
const validateConstraints = (
  referenceTable: Schema['tables'][string],
  predictTable: Schema['tables'][string],
): boolean => {
  const referenceConstraintCount = Object.keys(
    referenceTable.constraints,
  ).length
  const predictConstraintCount = Object.keys(predictTable.constraints).length
  return referenceConstraintCount === predictConstraintCount
}

const createForeignKeyMapping = (
  referenceRelationships: Schema['relationships'],
  predictRelationships: Schema['relationships'],
): Mapping => {
  const foreignKeyMapping: Mapping = {}

  for (const [refName, refRel] of Object.entries(referenceRelationships)) {
    for (const [predName, predRel] of Object.entries(predictRelationships)) {
      if (
        refRel.primaryTableName === predRel.primaryTableName &&
        refRel.primaryColumnName === predRel.primaryColumnName &&
        refRel.foreignTableName === predRel.foreignTableName &&
        refRel.foreignColumnName === predRel.foreignColumnName
      ) {
        foreignKeyMapping[refName] = predName
        break
      }
    }
  }

  return foreignKeyMapping
}

const calculateForeignKeyMetrics = (
  referenceRelationships: Schema['relationships'],
  predictRelationships: Schema['relationships'],
  foreignKeyMapping: Mapping,
) => {
  const referenceCount = Object.keys(referenceRelationships).length
  const predictCount = Object.keys(predictRelationships).length
  const matchedCount = Object.keys(foreignKeyMapping).length

  const foreignKeyPrecision =
    predictCount === 0 ? 0 : matchedCount / predictCount
  const foreignKeyRecall =
    referenceCount === 0 ? 0 : matchedCount / referenceCount
  const foreignKeyF1 =
    foreignKeyPrecision + foreignKeyRecall === 0
      ? 0
      : (2 * foreignKeyPrecision * foreignKeyRecall) /
        (foreignKeyPrecision + foreignKeyRecall)
  const foreignKeyAllCorrect = Math.abs(foreignKeyF1 - 1) < EPSILON ? 1 : 0

  return { foreignKeyF1, foreignKeyAllCorrect }
}

export const evaluate = async (
  reference: Schema,
  predict: Schema,
): Promise<EvaluateResult> => {
  const referenceTableNames = Object.keys(reference.tables)
  const predictTableNames = Object.keys(predict.tables)

  // 1. Table name mapping
  const tableMapping = await createTableMapping(
    referenceTableNames,
    predictTableNames,
  )

  // 2. Table-level Precision/Recall/F1/Allcorrect
  const { tableF1, tableAllcorrect } = calculateTableMetrics(
    referenceTableNames,
    predictTableNames,
    tableMapping,
  )

  // 3. Column-level evaluation for each matched table
  let totalColumnF1Score = 0
  let totalColumnAllCorrectCount = 0
  let totalPrimaryKeyCorrectCount = 0
  let totalConstraintCorrectCount = 0
  const allColumnMappings: Record<string, Mapping> = {}

  for (const tableName of Object.keys(tableMapping)) {
    const referenceTable = reference.tables[tableName]
    const predictTableName = tableMapping[tableName]
    if (!predictTableName || !referenceTable) continue
    const predictTable = predict.tables[predictTableName]
    if (!predictTable) continue

    const referenceColumnNames = Object.keys(referenceTable.columns)
    const predictColumnNames = Object.keys(predictTable.columns)

    const columnMapping = await createColumnMapping(
      referenceColumnNames,
      predictColumnNames,
    )
    allColumnMappings[tableName] = columnMapping

    const { columnF1, columnAllcorrect } = calculateColumnMetrics(
      referenceColumnNames,
      predictColumnNames,
      columnMapping,
    )

    totalColumnF1Score += columnF1
    totalColumnAllCorrectCount += columnAllcorrect

    // Primary key validation
    const isPrimaryKeyCorrect = validatePrimaryKeys(
      referenceTable,
      predictTable,
      columnMapping,
    )
    totalPrimaryKeyCorrectCount += isPrimaryKeyCorrect ? 1 : 0

    // Constraint validation
    const isConstraintCorrect = validateConstraints(
      referenceTable,
      predictTable,
    )
    totalConstraintCorrectCount += isConstraintCorrect ? 1 : 0
  }

  const foreignKeyMapping = createForeignKeyMapping(
    reference.relationships,
    predict.relationships,
  )

  const { foreignKeyF1, foreignKeyAllCorrect } = calculateForeignKeyMetrics(
    reference.relationships,
    predict.relationships,
    foreignKeyMapping,
  )

  // Calculate averages
  const totalTableCount = referenceTableNames.length
  const columnF1ScoreAverage = totalTableCount
    ? totalColumnF1Score / totalTableCount
    : 0
  const columnAllCorrectRateAverage = totalTableCount
    ? totalColumnAllCorrectCount / totalTableCount
    : 0
  const primaryKeyAccuracyAverage = totalTableCount
    ? totalPrimaryKeyCorrectCount / totalTableCount
    : 0
  const constraintAccuracy = totalTableCount
    ? totalConstraintCorrectCount / totalTableCount
    : 0

  const overallSchemaAccuracy =
    primaryKeyAccuracyAverage + columnAllCorrectRateAverage + tableAllcorrect >
    ALL_CORRECT_THRESHOLD
      ? 1
      : 0

  return {
    tableMapping,
    columnMappings: allColumnMappings,
    tableF1Score: tableF1,
    tableAllCorrectRate: tableAllcorrect,
    columnF1ScoreAverage,
    columnAllCorrectRateAverage,
    primaryKeyAccuracyAverage,
    constraintAccuracy,
    foreignKeyF1Score: foreignKeyF1,
    foreignKeyAllCorrectRate: foreignKeyAllCorrect,
    overallSchemaAccuracy,
  }
}
