import * as ts from 'typescript'
import type {
  Column,
  Columns,
  Constraints,
  ForeignKeyConstraint,
  Index,
  Table,
} from '../../schema/index.js'
import type { Processor, ProcessResult } from '../types.js'
import {
  convertDefaultValue,
  convertDrizzleTypeToPgType,
  convertReferenceOption,
} from './convertToPgType.js'

interface DrizzleTableDefinition {
  name: string
  columns: Record<string, DrizzleColumnDefinition>
  indexes: Record<string, DrizzleIndexDefinition>
  compositePrimaryKey?: CompositePrimaryKeyDefinition
  comment?: string | undefined
}

interface DrizzleColumnDefinition {
  name: string
  type: string
  typeOptions?: Record<string, unknown>
  notNull: boolean
  primaryKey: boolean
  unique: boolean
  default?: unknown
  comment?: string | undefined
  references?:
    | {
        table: string
        column: string
        onDelete?: string | undefined
        onUpdate?: string | undefined
      }
    | undefined
}

interface DrizzleIndexDefinition {
  name: string
  columns: string[]
  unique: boolean
  type?: string
}

interface DrizzleEnumDefinition {
  name: string
  values: string[]
}

interface DrizzleRelationDefinition {
  fromTable: string
  toTable: string
  type: 'one' | 'many'
  fields?: string[]
  references?: string[]
}

interface CompositePrimaryKeyDefinition {
  columns: string[]
}

interface MethodCall {
  name: string
  args: ts.Expression[]
}

// TypeScript target constants
const TS_SCRIPT_TARGETS = {
  FALLBACK: ts.ScriptTarget.ES5,
  PREFERRED: ts.ScriptTarget.ES2020,
  LATEST: ts.ScriptTarget.Latest,
} as const

/**
 * Get the appropriate TypeScript script target
 */
function getScriptTarget(): ts.ScriptTarget {
  if (TS_SCRIPT_TARGETS.PREFERRED !== undefined) {
    return TS_SCRIPT_TARGETS.PREFERRED
  }
  if (TS_SCRIPT_TARGETS.LATEST !== undefined) {
    return TS_SCRIPT_TARGETS.LATEST
  }
  return TS_SCRIPT_TARGETS.FALLBACK
}

/**
 * Parse Drizzle TypeScript schema to extract table definitions
 */
function parseDrizzleSchema(sourceCode: string): {
  tables: Record<string, DrizzleTableDefinition>
  enums: Record<string, DrizzleEnumDefinition>
  relations: DrizzleRelationDefinition[]
} {
  try {
    // Check if TypeScript is available
    if (!ts || typeof ts.createSourceFile !== 'function') {
      throw new Error(
        'TypeScript is not available. Please ensure TypeScript is installed.',
      )
    }

    // Use appropriate TypeScript target
    const scriptTarget = getScriptTarget()
    const sourceFile = ts.createSourceFile(
      'schema.ts',
      sourceCode,
      scriptTarget,
      true,
    )

    const tables: Record<string, DrizzleTableDefinition> = {}
    const enums: Record<string, DrizzleEnumDefinition> = {}
    const relations: DrizzleRelationDefinition[] = []

    function visit(node: ts.Node) {
      // Parse pgTable definitions
      if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0]
        if (declaration?.initializer) {
          // Find the pgTable call in the expression chain
          const pgTableCall = findPgTableCall(declaration.initializer)
          if (pgTableCall) {
            const tableDefinition = parsePgTableCall(declaration, pgTableCall)
            if (tableDefinition) {
              tables[tableDefinition.name] = tableDefinition
            }
          }

          // Check for other call expressions
          if (ts.isCallExpression(declaration.initializer)) {
            const callExpr = declaration.initializer

            // Check if it's a pgEnum call
            if (
              ts.isIdentifier(callExpr.expression) &&
              callExpr.expression.text === 'pgEnum'
            ) {
              const enumDefinition = parsePgEnumCall(declaration, callExpr)
              if (
                enumDefinition &&
                declaration.name &&
                ts.isIdentifier(declaration.name)
              ) {
                // Use the variable name as the key for mapping
                const enumVarName = declaration.name.text
                enums[enumVarName] = enumDefinition
              }
            }

            // Check if it's a relations call
            if (
              ts.isIdentifier(callExpr.expression) &&
              callExpr.expression.text === 'relations'
            ) {
              const relationDefinitions = parseRelationsCall(callExpr)
              relations.push(...relationDefinitions)
            }
          }
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
    return { tables, enums, relations }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const detailedError = new Error(
      `Failed to parse Drizzle schema: ${errorMessage}`,
    )
    console.error('Error in parseDrizzleSchema:', detailedError)
    throw detailedError
  }
}

/**
 * Find pgTable call in an expression chain (handles method chaining)
 */
function findPgTableCall(expr: ts.Expression): ts.CallExpression | null {
  if (ts.isCallExpression(expr)) {
    // Check if this is a direct pgTable call
    if (
      ts.isIdentifier(expr.expression) &&
      expr.expression.text === 'pgTable'
    ) {
      return expr
    }

    // Check if this is a method call on a pgTable call
    if (ts.isPropertyAccessExpression(expr.expression)) {
      // Recursively search for pgTable in the chain
      return findPgTableCall(expr.expression.expression)
    }
  }

  return null
}

/**
 * Parse pgTable call expression
 */
function parsePgTableCall(
  declaration: ts.VariableDeclaration,
  callExpr: ts.CallExpression,
): DrizzleTableDefinition | null {
  try {
    if (callExpr.arguments.length < 2) return null

    const tableNameArg = callExpr.arguments[0]
    const columnsArg = callExpr.arguments[1]
    const indexesArg = callExpr.arguments[2]

    if (
      !tableNameArg ||
      !columnsArg ||
      !ts.isStringLiteral(tableNameArg) ||
      !ts.isObjectLiteralExpression(columnsArg)
    ) {
      return null
    }

    const tableName = tableNameArg.text
    const columns: Record<string, DrizzleColumnDefinition> = {}
    const indexes: Record<string, DrizzleIndexDefinition> = {}
    let compositePrimaryKey: CompositePrimaryKeyDefinition | undefined

    // Parse columns
    for (const property of columnsArg.properties) {
      if (
        ts.isPropertyAssignment(property) &&
        property.name &&
        ts.isIdentifier(property.name) &&
        property.initializer
      ) {
        const jsColumnName = property.name.text
        const columnDef = parseColumnDefinition(property.initializer)
        if (columnDef) {
          // Extract actual column name from the first argument of the type call
          const actualColumnName =
            extractColumnNameFromTypeCall(property.initializer) || jsColumnName
          columns[jsColumnName] = { ...columnDef, name: actualColumnName }
        }
      }
    }

    // Parse indexes if provided
    if (indexesArg && ts.isArrowFunction(indexesArg)) {
      const returnExpr = indexesArg.body

      // Handle both direct object literal and parenthesized expression
      let objectExpr: ts.ObjectLiteralExpression | null = null
      if (returnExpr && ts.isObjectLiteralExpression(returnExpr)) {
        objectExpr = returnExpr
      } else if (
        returnExpr &&
        ts.isParenthesizedExpression(returnExpr) &&
        returnExpr.expression &&
        ts.isObjectLiteralExpression(returnExpr.expression)
      ) {
        objectExpr = returnExpr.expression
      }

      if (objectExpr) {
        for (const property of objectExpr.properties) {
          if (
            ts.isPropertyAssignment(property) &&
            property.name &&
            ts.isIdentifier(property.name) &&
            property.initializer
          ) {
            const propertyName = property.name.text

            // Parse composite primary key definitions
            if (
              propertyName === 'pk' &&
              ts.isCallExpression(property.initializer)
            ) {
              const pkDef = parseCompositePrimaryKey(property.initializer)
              if (pkDef) {
                compositePrimaryKey = pkDef
              }
              continue
            }

            const indexDef = parseIndexDefinition(property.initializer)
            if (indexDef) {
              // Use the actual index name from the definition, not the property name
              const actualIndexName = indexDef.name || property.name.text
              indexes[actualIndexName] = { ...indexDef, name: actualIndexName }
            }
          }
        }
      }
    }

    // Check for table comment - look at the original declaration's initializer
    let comment: string | undefined
    if (
      declaration.initializer &&
      ts.isCallExpression(declaration.initializer)
    ) {
      let currentExpr: ts.Expression = declaration.initializer

      // Look for method chaining like .$comment('...')
      while (ts.isCallExpression(currentExpr)) {
        if (
          ts.isPropertyAccessExpression(currentExpr.expression) &&
          currentExpr.expression.name &&
          ts.isIdentifier(currentExpr.expression.name) &&
          currentExpr.expression.name.text === '$comment'
        ) {
          const commentArg = currentExpr.arguments[0]
          if (commentArg && ts.isStringLiteral(commentArg)) {
            comment = commentArg.text
          }
          break
        }
        if (
          ts.isPropertyAccessExpression(currentExpr.expression) &&
          currentExpr.expression.expression
        ) {
          currentExpr = currentExpr.expression.expression
        } else {
          break
        }
      }
    }

    const result: DrizzleTableDefinition = {
      name: tableName,
      columns,
      indexes,
      comment,
    }

    if (compositePrimaryKey) {
      result.compositePrimaryKey = compositePrimaryKey
    }

    return result
  } catch (error) {
    const tableName =
      callExpr.arguments[0] && ts.isStringLiteral(callExpr.arguments[0])
        ? callExpr.arguments[0].text
        : 'unknown'
    throw new Error(
      `Error parsing table '${tableName}': ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Extract column name from type call (first argument)
 */
function extractColumnNameFromTypeCall(expr: ts.Expression): string | null {
  // For method chains like integer('user_id').notNull().unique().references(...)
  // we need to find the base type call (integer) and get its first argument

  function findBaseTypeCall(expr: ts.Expression): ts.CallExpression | null {
    if (ts.isCallExpression(expr)) {
      if (ts.isIdentifier(expr.expression)) {
        // This is a direct function call like integer('user_id')
        // Verify it's a known Drizzle type function
        const typeName = expr.expression.text
        if (isDrizzleTypeFunction(typeName)) {
          return expr
        }
      }
      if (ts.isPropertyAccessExpression(expr.expression)) {
        // This is a method call like .notNull(), so look at the base expression
        return findBaseTypeCall(expr.expression.expression)
      }
    }
    return null
  }

  const baseCall = findBaseTypeCall(expr)
  if (
    baseCall &&
    baseCall.arguments.length > 0 &&
    baseCall.arguments[0] &&
    ts.isStringLiteral(baseCall.arguments[0])
  ) {
    return baseCall.arguments[0].text
  }

  return null
}

/**
 * Check if a function name is a known Drizzle type function
 */
function isDrizzleTypeFunction(name: string): boolean {
  const drizzleTypes = [
    'serial',
    'bigserial',
    'smallserial',
    'integer',
    'bigint',
    'smallint',
    'text',
    'varchar',
    'char',
    'boolean',
    'timestamp',
    'date',
    'time',
    'numeric',
    'decimal',
    'real',
    'doublePrecision',
    'json',
    'jsonb',
    'uuid',
    'bytea',
    'interval',
    'point',
    'line',
    'lseg',
    'box',
    'path',
    'polygon',
    'circle',
    'cidr',
    'inet',
    'macaddr',
    'macaddr8',
    'bit',
    'varbit',
    'tsvector',
    'tsquery',
    'xml',
    'money',
  ]
  return drizzleTypes.includes(name)
}

/**
 * Parse method chain from expression - optimized version
 */
function parseMethodChain(expr: ts.Expression): {
  methods: MethodCall[]
  baseType: string
  typeOptions: Record<string, unknown>
} {
  const methods: MethodCall[] = []
  let currentExpr = expr
  let baseType = ''
  let typeOptions: Record<string, unknown> = {}

  // Single pass through the method chain
  while (ts.isCallExpression(currentExpr)) {
    if (
      ts.isPropertyAccessExpression(currentExpr.expression) &&
      ts.isIdentifier(currentExpr.expression.name)
    ) {
      methods.unshift({
        name: currentExpr.expression.name.text,
        args: Array.from(currentExpr.arguments),
      })
      currentExpr = currentExpr.expression.expression
    } else if (ts.isIdentifier(currentExpr.expression)) {
      const typeName = currentExpr.expression.text

      // Handle enum function calls and regular types
      if (
        currentExpr.arguments.length > 0 &&
        currentExpr.arguments[0] &&
        ts.isStringLiteral(currentExpr.arguments[0])
      ) {
        baseType = typeName.endsWith('Enum') ? typeName : typeName
      } else {
        baseType = typeName
      }

      // Parse type options from second argument
      if (
        currentExpr.arguments.length > 1 &&
        currentExpr.arguments[1] &&
        ts.isObjectLiteralExpression(currentExpr.arguments[1])
      ) {
        typeOptions = parseObjectLiteral(currentExpr.arguments[1])
      }
      break
    } else {
      break
    }
  }

  return { methods, baseType, typeOptions }
}

/**
 * Parse column definition from method chaining - optimized version
 */
function parseColumnDefinition(
  expr: ts.Expression,
): DrizzleColumnDefinition | null {
  try {
    const { methods, baseType, typeOptions } = parseMethodChain(expr)

    if (!baseType) return null

    let notNull = false
    let primaryKey = false
    let unique = false
    let defaultValue: unknown
    let comment: string | undefined
    let references: DrizzleColumnDefinition['references']

    // Process methods in a single pass
    for (const method of methods) {
      switch (method.name) {
        case 'notNull':
          notNull = true
          break
        case 'primaryKey':
          primaryKey = true
          notNull = true
          break
        case 'unique':
          unique = true
          break
        case 'default':
          if (method.args[0]) {
            defaultValue = extractLiteralValue(method.args[0])
          }
          break
        case 'defaultNow':
          defaultValue = 'defaultNow'
          break
        case 'defaultRandom':
          defaultValue = 'defaultRandom'
          break
        case '$comment':
          if (method.args[0] && ts.isStringLiteral(method.args[0])) {
            comment = method.args[0].text
          }
          break
        case 'references':
          if (method.args.length > 0) {
            references = parseReferencesFromArgs(method.args)
          }
          break
      }
    }

    // Set default value for serial types
    if (
      ['serial', 'bigserial', 'smallserial'].includes(baseType) &&
      defaultValue === undefined
    ) {
      defaultValue = 'autoincrement'
    }

    return {
      name: '',
      type: baseType,
      typeOptions,
      notNull: notNull || unique,
      primaryKey,
      unique,
      default: defaultValue,
      comment,
      references,
    }
  } catch (error) {
    throw new Error(
      `Error parsing column definition: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Parse references from method arguments
 */
function parseReferencesFromArgs(
  args: ts.Expression[],
): DrizzleColumnDefinition['references'] | undefined {
  if (args.length === 0) return undefined

  // First argument should be an arrow function returning the referenced column
  const firstArg = args[0]
  if (!firstArg || !ts.isArrowFunction(firstArg)) {
    return undefined
  }

  // Parse the referenced table and column from the arrow function
  let table = ''
  let column = ''

  const body = firstArg.body

  if (body && ts.isPropertyAccessExpression(body)) {
    // Get table name - could be simple identifier (users) or property access (schema.users)
    if (body.expression && ts.isIdentifier(body.expression)) {
      table = body.expression.escapedText as string
    } else if (
      body.expression &&
      ts.isPropertyAccessExpression(body.expression) &&
      body.expression.name &&
      ts.isIdentifier(body.expression.name)
    ) {
      table = body.expression.name.text
    }

    // Get column name
    if (body.name && ts.isIdentifier(body.name)) {
      column = body.name.escapedText as string
    }
  }

  // Parse options (onDelete, onUpdate) from second argument
  let onDelete: string | undefined
  let onUpdate: string | undefined

  if (args.length > 1 && args[1] && ts.isObjectLiteralExpression(args[1])) {
    const options = parseObjectLiteral(args[1])
    onDelete =
      typeof options['onDelete'] === 'string' ? options['onDelete'] : undefined
    onUpdate =
      typeof options['onUpdate'] === 'string' ? options['onUpdate'] : undefined
  }

  if (table && column) {
    const result: {
      table: string
      column: string
      onDelete?: string
      onUpdate?: string
    } = { table, column }
    if (onDelete !== undefined) result.onDelete = onDelete
    if (onUpdate !== undefined) result.onUpdate = onUpdate
    return result
  }
  return undefined
}

/**
 * Parse index definition
 */
function parseIndexDefinition(
  expr: ts.Expression,
): DrizzleIndexDefinition | null {
  if (!ts.isCallExpression(expr)) return null

  let unique = false
  const columns: string[] = []
  let indexName = ''

  // Find the initial index call (index() or uniqueIndex())
  let currentExpr: ts.Expression = expr

  // Navigate to the base index call
  while (ts.isCallExpression(currentExpr)) {
    if (ts.isIdentifier(currentExpr.expression)) {
      const typeName = currentExpr.expression.text
      if (typeName === 'index' || typeName === 'uniqueIndex') {
        unique = typeName === 'uniqueIndex'

        // Get index name from first argument
        if (
          currentExpr.arguments.length > 0 &&
          currentExpr.arguments[0] &&
          ts.isStringLiteral(currentExpr.arguments[0])
        ) {
          indexName = currentExpr.arguments[0].text
        }
        break
      }
    }
    if (ts.isPropertyAccessExpression(currentExpr.expression)) {
      currentExpr = currentExpr.expression.expression
    } else {
      break
    }
  }

  // Look for .on() method call in the full expression
  currentExpr = expr
  while (ts.isCallExpression(currentExpr)) {
    if (
      ts.isPropertyAccessExpression(currentExpr.expression) &&
      ts.isIdentifier(currentExpr.expression.name) &&
      currentExpr.expression.name.text === 'on'
    ) {
      // Extract column names from arguments
      for (const arg of currentExpr.arguments) {
        if (
          arg &&
          ts.isPropertyAccessExpression(arg) &&
          arg.name &&
          ts.isIdentifier(arg.name)
        ) {
          // Extract actual column name from the property access
          const columnName = extractColumnNameFromPropertyAccess(arg)
          if (columnName) {
            columns.push(columnName)
          }
        }
      }
      break
    }
    if (ts.isPropertyAccessExpression(currentExpr.expression)) {
      currentExpr = currentExpr.expression.expression
    } else {
      break
    }
  }

  return columns.length > 0
    ? { name: indexName, columns, unique, type: '' }
    : null
}

/**
 * Extract column name from property access (e.g., table.firstName -> first_name)
 * This needs to map JS property names to actual column names
 */
function extractColumnNameFromPropertyAccess(
  expr: ts.PropertyAccessExpression,
): string | null {
  if (expr.name && ts.isIdentifier(expr.name)) {
    const jsPropertyName = expr.name.text
    // Return the JS property name - the actual column name mapping will be handled later
    return jsPropertyName
  }
  return null
}

/**
 * Parse composite primary key definition
 */
function parseCompositePrimaryKey(
  callExpr: ts.CallExpression,
): CompositePrimaryKeyDefinition | null {
  if (
    !callExpr.arguments[0] ||
    !ts.isObjectLiteralExpression(callExpr.arguments[0])
  ) {
    return null
  }

  const options = callExpr.arguments[0]
  for (const property of options.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      property.name &&
      ts.isIdentifier(property.name) &&
      property.name.text === 'columns' &&
      property.initializer &&
      ts.isArrayLiteralExpression(property.initializer)
    ) {
      const columns: string[] = []
      for (const element of property.initializer.elements) {
        if (element && ts.isPropertyAccessExpression(element)) {
          const columnName = extractColumnNameFromPropertyAccess(element)
          if (columnName) {
            columns.push(columnName)
          }
        }
      }

      return { columns }
    }
  }

  return null
}

/**
 * Parse pgEnum call
 */
function parsePgEnumCall(
  _declaration: ts.VariableDeclaration,
  callExpr: ts.CallExpression,
): DrizzleEnumDefinition | null {
  if (callExpr.arguments.length < 2) return null

  const enumNameArg = callExpr.arguments[0]
  const valuesArg = callExpr.arguments[1]

  if (
    !enumNameArg ||
    !valuesArg ||
    !ts.isStringLiteral(enumNameArg) ||
    !ts.isArrayLiteralExpression(valuesArg)
  ) {
    return null
  }

  const enumName = enumNameArg.text
  const values: string[] = []

  for (const element of valuesArg.elements) {
    if (element && ts.isStringLiteral(element)) {
      values.push(element.text)
    }
  }

  return { name: enumName, values }
}

/**
 * Parse relations call
 */
function parseRelationsCall(
  callExpr: ts.CallExpression,
): DrizzleRelationDefinition[] {
  const relations: DrizzleRelationDefinition[] = []

  if (callExpr.arguments.length < 2) return relations

  const tableArg = callExpr.arguments[0]
  const relationsArg = callExpr.arguments[1]

  if (
    !tableArg ||
    !ts.isIdentifier(tableArg) ||
    !relationsArg ||
    !ts.isArrowFunction(relationsArg)
  ) {
    return relations
  }

  const fromTable = tableArg.text
  const body = relationsArg.body

  if (body && ts.isObjectLiteralExpression(body)) {
    for (const property of body.properties) {
      if (
        ts.isPropertyAssignment(property) &&
        property.name &&
        ts.isIdentifier(property.name) &&
        property.initializer &&
        ts.isCallExpression(property.initializer)
      ) {
        const relationCall = property.initializer
        if (ts.isIdentifier(relationCall.expression)) {
          const relationType =
            relationCall.expression.text === 'one' ? 'one' : 'many'

          // Get target table from first argument
          let toTable = ''
          if (relationCall.arguments[0]) {
            if (ts.isIdentifier(relationCall.arguments[0])) {
              toTable = relationCall.arguments[0].text
            } else if (
              ts.isPropertyAccessExpression(relationCall.arguments[0]) &&
              ts.isIdentifier(relationCall.arguments[0].name)
            ) {
              // Handle schema.tableName format
              toTable = relationCall.arguments[0].name.text
            }
          }

          if (toTable) {
            // Get fields/references from second argument (optional)
            let fields: string[] | undefined
            let references: string[] | undefined

            // Second argument is optional - when omitted, relation is still valid
            if (
              relationCall.arguments.length > 1 &&
              relationCall.arguments[1] &&
              ts.isObjectLiteralExpression(relationCall.arguments[1])
            ) {
              const options = parseObjectLiteral(relationCall.arguments[1])
              if (Array.isArray(options['fields'])) {
                fields = options['fields'] as string[]
              }
              if (Array.isArray(options['references'])) {
                references = options['references'] as string[]
              }
            }

            const relation: DrizzleRelationDefinition = {
              fromTable,
              toTable,
              type: relationType,
            }

            if (fields) {
              relation.fields = fields
            }
            if (references) {
              relation.references = references
            }

            relations.push(relation)
          }
        }
      }
    }
  }

  return relations
}

/**
 * Extract literal value from TypeScript expression
 */
function extractLiteralValue(expr: ts.Expression): unknown {
  if (ts.isStringLiteral(expr)) {
    return expr.text
  }
  if (ts.isNumericLiteral(expr)) {
    return Number(expr.text)
  }
  if (expr.kind === ts.SyntaxKind.TrueKeyword) {
    return true
  }
  if (expr.kind === ts.SyntaxKind.FalseKeyword) {
    return false
  }
  if (expr.kind === ts.SyntaxKind.NullKeyword) {
    return null
  }
  return undefined
}

/**
 * Parse object literal expression to a plain object
 */
function parseObjectLiteral(
  expr: ts.ObjectLiteralExpression,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const property of expr.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      property.name &&
      ts.isIdentifier(property.name) &&
      property.initializer
    ) {
      const key = property.name.text
      const value = extractLiteralValue(property.initializer)
      if (value !== undefined) {
        result[key] = value
      }
    }
  }

  return result
}

/**
 * Convert Drizzle table definition to internal Table format
 */
function convertToTable(
  tableDef: DrizzleTableDefinition,
  enums: Record<string, DrizzleEnumDefinition> = {},
): Table {
  const columns: Columns = {}
  const constraints: Constraints = {}
  const indexes: Record<string, Index> = {}

  // Convert columns
  for (const [columnName, columnDef] of Object.entries(tableDef.columns)) {
    // Check if this is an enum type and get the actual enum name
    let columnType = columnDef.type

    // Check if this is an enum variable name (like userRoleEnum -> user_role)
    for (const [enumVarName, enumDef] of Object.entries(enums)) {
      if (columnDef.type === enumVarName) {
        columnType = enumDef.name
        break
      }
    }

    // If not found, it might be a call to an enum function (like roleEnum('role'))
    // In this case, the type is already the enum name from the first argument
    if (columnType === columnDef.type) {
      // Check if any enum definition matches this type name
      for (const enumDef of Object.values(enums)) {
        if (enumDef.name === columnDef.type) {
          columnType = enumDef.name
          break
        }
      }
    }

    const column: Column = {
      name: columnDef.name,
      type: convertDrizzleTypeToPgType(columnType, columnDef.typeOptions),
      default: convertDefaultValue(columnDef.default, columnType),
      notNull: columnDef.notNull,
      comment: columnDef.comment || null,
      check: null,
    }
    columns[columnName] = column

    // Add primary key constraint
    if (columnDef.primaryKey) {
      const constraintName = `PRIMARY_${columnDef.name}`
      constraints[constraintName] = {
        type: 'PRIMARY KEY',
        name: constraintName,
        columnName: columnDef.name,
      }

      // Add primary key index
      const indexName = `${tableDef.name}_pkey`
      indexes[indexName] = {
        name: indexName,
        columns: [columnDef.name],
        unique: true,
        type: '',
      }
    }

    // Add unique constraint
    if (columnDef.unique && !columnDef.primaryKey) {
      const constraintName = `UNIQUE_${columnDef.name}`
      constraints[constraintName] = {
        type: 'UNIQUE',
        name: constraintName,
        columnName: columnDef.name,
      }

      // Add unique index
      const indexName = `${tableDef.name}_${columnDef.name}_unique`
      indexes[indexName] = {
        name: indexName,
        columns: [columnDef.name],
        unique: true,
        type: '',
      }
    }

    // Add foreign key constraint
    if (columnDef.references) {
      const constraintName = `${tableDef.name}_${columnDef.name}_${columnDef.references.table}_${columnDef.references.column}_fk`
      const constraint: ForeignKeyConstraint = {
        type: 'FOREIGN KEY',
        name: constraintName,
        columnName: columnDef.name, // Use actual column name, not JS property name
        targetTableName: columnDef.references.table,
        targetColumnName: columnDef.references.column,
        updateConstraint: columnDef.references.onUpdate
          ? convertReferenceOption(columnDef.references.onUpdate)
          : 'NO_ACTION',
        deleteConstraint: columnDef.references.onDelete
          ? convertReferenceOption(columnDef.references.onDelete)
          : 'NO_ACTION',
      }
      constraints[constraintName] = constraint
    }
  }

  // Handle composite primary key
  if (tableDef.compositePrimaryKey) {
    // Map JS property names to actual column names
    const actualColumnNames = tableDef.compositePrimaryKey.columns.map(
      (jsPropertyName) => {
        const columnDef = tableDef.columns[jsPropertyName]
        return columnDef ? columnDef.name : jsPropertyName
      },
    )

    // Create composite primary key constraint
    const constraintName = `${tableDef.name}_pkey`
    constraints[constraintName] = {
      type: 'PRIMARY KEY',
      name: constraintName,
      columnName: actualColumnNames.join(','), // Multiple columns for composite key
    }

    // Add composite primary key index
    indexes[constraintName] = {
      name: constraintName,
      columns: actualColumnNames,
      unique: true,
      type: '',
    }
  }

  // Convert indexes
  for (const [_, indexDef] of Object.entries(tableDef.indexes)) {
    // Map JS property names to actual column names
    const actualColumnNames = indexDef.columns.map((jsPropertyName) => {
      const columnDef = tableDef.columns[jsPropertyName]
      return columnDef ? columnDef.name : jsPropertyName
    })

    // Use the actual index name from the definition
    const actualIndexName = indexDef.name
    indexes[actualIndexName] = {
      name: actualIndexName,
      columns: actualColumnNames,
      unique: indexDef.unique,
      type: indexDef.type || '',
    }
  }

  return {
    name: tableDef.name,
    columns,
    constraints,
    indexes,
    comment: tableDef.comment || null,
  }
}

/**
 * Main processor function for Drizzle schemas
 */
async function parseDrizzleSchemaString(
  schemaString: string,
): Promise<ProcessResult> {
  try {
    const { tables: drizzleTables, enums } = parseDrizzleSchema(schemaString)
    const tables: Record<string, Table> = {}
    const errors: Error[] = []

    // Convert Drizzle tables to internal format
    for (const [tableName, tableDef] of Object.entries(drizzleTables)) {
      try {
        tables[tableName] = convertToTable(tableDef, enums)
      } catch (error) {
        errors.push(
          new Error(
            `Error parsing table ${tableName}: ${error instanceof Error ? error.message : String(error)}`,
          ),
        )
      }
    }

    return {
      value: { tables },
      errors,
    }
  } catch (error) {
    return {
      value: { tables: {} },
      errors: [
        new Error(
          `Error parsing Drizzle schema: ${error instanceof Error ? error.message : String(error)}`,
        ),
      ],
    }
  }
}

export const processor: Processor = (str) => parseDrizzleSchemaString(str)
