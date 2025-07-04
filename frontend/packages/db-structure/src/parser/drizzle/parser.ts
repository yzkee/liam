import type {
  Argument,
  CallExpression,
  Expression,
  Import,
  Module,
  ObjectExpression,
  Property,
  Super,
  VariableDeclarator,
} from '@swc/core'
import { parseSync } from '@swc/core'
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
  type: 'primaryKey'
  columns: string[]
}

/**
 * Type guard for CompositePrimaryKeyDefinition
 */
const isCompositePrimaryKey = (
  value: unknown,
): value is CompositePrimaryKeyDefinition => {
  return (
    isObject(value) &&
    getPropertyValue(value, 'type') === 'primaryKey' &&
    hasProperty(value, 'columns') &&
    Array.isArray(getPropertyValue(value, 'columns'))
  )
}

/**
 * Type guard for DrizzleIndexDefinition
 */
const isDrizzleIndex = (value: unknown): value is DrizzleIndexDefinition => {
  return (
    isObject(value) &&
    hasProperty(value, 'name') &&
    hasProperty(value, 'columns') &&
    hasProperty(value, 'unique')
  )
}

/**
 * Helper functions for AST traversal
 */

/**
 * Safe property checker without type casting
 */
const hasProperty = <K extends string>(
  obj: unknown,
  key: K,
): obj is Record<K, unknown> => {
  return typeof obj === 'object' && obj !== null && key in obj
}

/**
 * Safe property getter without type casting
 */
const getPropertyValue = (obj: unknown, key: string): unknown => {
  if (hasProperty(obj, key)) {
    return obj[key]
  }
  return undefined
}

/**
 * Check if a value is an object
 */
const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

/**
 * Safely get string value from unknown property value
 */
const getSafeStringValue = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

/**
 * Safely get array from unknown property value
 */
const getSafeArrayValue = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : []
}

/**
 * Safely get relation type from unknown value
 */
const getSafeRelationType = (value: unknown): 'one' | 'many' => {
  return value === 'one' || value === 'many' ? value : 'one'
}

/**
 * Type guard for SWC Argument wrapper
 */
const isArgumentWrapper = (arg: unknown): arg is { expression: Expression } => {
  return isObject(arg) && hasProperty(arg, 'expression')
}

/**
 * Extract expression from SWC Argument wrapper
 */
const getArgumentExpression = (arg: unknown): Expression | null => {
  if (isArgumentWrapper(arg)) {
    return arg.expression
  }
  return null
}

/**
 * Type guard for string literal expressions
 */
const isStringLiteral = (
  expr: unknown,
): expr is { type: 'StringLiteral'; value: string } => {
  return (
    isObject(expr) &&
    getPropertyValue(expr, 'type') === 'StringLiteral' &&
    hasProperty(expr, 'value') &&
    typeof getPropertyValue(expr, 'value') === 'string'
  )
}

/**
 * Type guard for object expressions
 */
const isObjectExpression = (expr: unknown): expr is ObjectExpression => {
  return isObject(expr) && getPropertyValue(expr, 'type') === 'ObjectExpression'
}

/**
 * Type guard for array expressions
 */
const isArrayExpression = (
  expr: unknown,
): expr is { type: 'ArrayExpression'; elements: unknown[] } => {
  return (
    isObject(expr) &&
    getPropertyValue(expr, 'type') === 'ArrayExpression' &&
    hasProperty(expr, 'elements') &&
    Array.isArray(getPropertyValue(expr, 'elements'))
  )
}

/**
 * Check if a node is an identifier with a specific name
 */
/**
 * Type guard for identifier nodes
 */
const isIdentifier = (
  node: unknown,
): node is { type: 'Identifier'; value: string } => {
  return (
    isObject(node) &&
    getPropertyValue(node, 'type') === 'Identifier' &&
    hasProperty(node, 'value') &&
    typeof getPropertyValue(node, 'value') === 'string'
  )
}

const isIdentifierWithName = (
  node: Expression | Super | Import,
  name: string,
): boolean => {
  return isIdentifier(node) && node.value === name
}

/**
 * Type guard for member expressions
 */
const isMemberExpression = (
  node: unknown,
): node is {
  type: 'MemberExpression'
  object: { type: string; value?: string }
  property: { type: string; value?: string }
} => {
  return (
    isObject(node) &&
    getPropertyValue(node, 'type') === 'MemberExpression' &&
    hasProperty(node, 'object') &&
    hasProperty(node, 'property') &&
    typeof getPropertyValue(node, 'object') === 'object' &&
    typeof getPropertyValue(node, 'property') === 'object'
  )
}

/**
 * Check if a call expression is a pgTable call
 */
const isPgTableCall = (callExpr: CallExpression): boolean => {
  return isIdentifierWithName(callExpr.callee, 'pgTable')
}

/**
 * Extract string value from a string literal
 */
const getStringValue = (node: Expression): string | null => {
  if (node.type === 'StringLiteral') {
    return node.value
  }
  return null
}

/**
 * Extract identifier name
 */
const getIdentifierName = (node: Expression): string | null => {
  if (isIdentifier(node)) {
    return node.value
  }
  return null
}

/**
 * Parse method call chain from a call expression
 */
const parseMethodChain = (
  expr: Expression,
): Array<{ name: string; args: Argument[] }> => {
  const methods: Array<{ name: string; args: Argument[] }> = []
  let current = expr

  while (current.type === 'CallExpression') {
    if (
      current.callee.type === 'MemberExpression' &&
      current.callee.property.type === 'Identifier'
    ) {
      methods.unshift({
        name: current.callee.property.value,
        args: current.arguments,
      })
      current = current.callee.object
    } else {
      break
    }
  }

  return methods
}

/**
 * Parse column definition from object property
 */
const parseColumnFromProperty = (
  prop: Property,
): DrizzleColumnDefinition | null => {
  if (prop.type !== 'KeyValueProperty') return null

  const columnName =
    prop.key.type === 'Identifier' ? getIdentifierName(prop.key) : null
  if (!columnName) return null

  if (prop.value.type !== 'CallExpression') return null

  // Parse the method chain to find the base type
  const methods = parseMethodChain(prop.value)

  // Find the base type from the root of the chain
  let baseType: string | null = null
  let current: Expression = prop.value

  // Traverse to the bottom of the method chain to find the base type call
  while (
    current.type === 'CallExpression' &&
    current.callee.type === 'MemberExpression'
  ) {
    current = current.callee.object
  }

  if (
    current.type === 'CallExpression' &&
    current.callee.type === 'Identifier'
  ) {
    baseType = current.callee.value
  }

  if (!baseType) return null

  // Extract the actual column name from the first argument of the base type call
  let actualColumnName = columnName // Default to JS property name
  if (current.type === 'CallExpression' && current.arguments.length > 0) {
    const firstArg = current.arguments[0]
    const firstArgExpr = getArgumentExpression(firstArg)
    if (firstArgExpr && isStringLiteral(firstArgExpr)) {
      actualColumnName = firstArgExpr.value
    }
  }

  const column: DrizzleColumnDefinition = {
    name: actualColumnName,
    type: baseType,
    notNull: false,
    primaryKey: false,
    unique: false,
  }

  // Parse type options from second argument (like { length: 255 })
  if (current.type === 'CallExpression' && current.arguments.length > 1) {
    const secondArg = current.arguments[1]
    const secondArgExpr = getArgumentExpression(secondArg)
    if (secondArgExpr && isObjectExpression(secondArgExpr)) {
      column.typeOptions = parseObjectExpression(secondArgExpr)
    }
  }

  // Parse method calls in the chain (already parsed above)

  for (const method of methods) {
    switch (method.name) {
      case 'primaryKey':
        column.primaryKey = true
        column.notNull = true
        break
      case 'notNull':
        column.notNull = true
        break
      case 'unique':
        column.unique = true
        column.notNull = true
        break
      case 'default':
        if (method.args.length > 0) {
          const argExpr = getArgumentExpression(method.args[0])
          if (argExpr) {
            column.default = parseDefaultValue(argExpr)
          }
        }
        break
      case 'defaultNow':
        column.default = 'now()'
        break
      case 'references':
        if (method.args.length > 0) {
          const refExpr = getArgumentExpression(method.args[0])
          if (refExpr && refExpr.type === 'ArrowFunctionExpression') {
            // Parse () => tableName.columnName
            const returnExpr = refExpr.body
            if (
              returnExpr.type === 'MemberExpression' &&
              returnExpr.object.type === 'Identifier' &&
              returnExpr.property.type === 'Identifier'
            ) {
              column.references = {
                table: returnExpr.object.value,
                column: returnExpr.property.value,
              }

              // Parse onDelete/onUpdate options from second argument
              if (method.args.length > 1) {
                const optionsExpr = getArgumentExpression(method.args[1])
                if (optionsExpr && isObjectExpression(optionsExpr)) {
                  const options = parseObjectExpression(optionsExpr)
                  if (typeof options['onDelete'] === 'string') {
                    column.references.onDelete = options['onDelete']
                  }
                  if (typeof options['onUpdate'] === 'string') {
                    column.references.onUpdate = options['onUpdate']
                  }
                }
              }
            }
          }
        }
        break
      case '$comment':
        if (method.args.length > 0) {
          const argExpr = getArgumentExpression(method.args[0])
          const commentValue = argExpr ? getStringValue(argExpr) : null
          if (commentValue) {
            column.comment = commentValue
          }
        }
        break
    }
  }

  // Handle serial types default
  if (baseType === 'serial' && column.primaryKey) {
    column.default = 'autoincrement'
  }

  return column
}

/**
 * Parse default value from expression
 */
const parseDefaultValue = (expr: Expression): unknown => {
  switch (expr.type) {
    case 'StringLiteral':
      return expr.value
    case 'NumericLiteral':
      return expr.value
    case 'BooleanLiteral':
      return expr.value
    case 'NullLiteral':
      return null
    case 'Identifier':
      // Handle special cases like defaultRandom, defaultNow
      switch (expr.value) {
        case 'defaultRandom':
          return 'defaultRandom'
        case 'defaultNow':
          return 'now()'
        default:
          return expr.value
      }
    case 'CallExpression':
      // Handle function calls like defaultNow()
      if (expr.callee.type === 'Identifier') {
        switch (expr.callee.value) {
          case 'defaultNow':
            return 'now()'
          case 'defaultRandom':
            return 'defaultRandom'
          default:
            return expr.callee.value
        }
      }
      return undefined
    default:
      return undefined
  }
}

/**
 * Parse object expression to plain object
 */
const parseObjectExpression = (
  obj: ObjectExpression,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}

  for (const prop of obj.properties) {
    if (prop.type === 'KeyValueProperty') {
      const key =
        prop.key.type === 'Identifier'
          ? getIdentifierName(prop.key)
          : prop.key.type === 'StringLiteral'
            ? getStringValue(prop.key)
            : null
      if (key) {
        result[key] = parsePropertyValue(prop.value)
      }
    }
  }

  return result
}

/**
 * Type guard for expression-like objects
 */
const isExpressionLike = (value: unknown): value is Expression => {
  return (
    isObject(value) &&
    hasProperty(value, 'type') &&
    typeof getPropertyValue(value, 'type') === 'string'
  )
}

/**
 * Safe parser for unknown values as expressions
 */
const parseUnknownValue = (value: unknown): unknown => {
  if (isExpressionLike(value)) {
    return parseDefaultValue(value)
  }
  return value
}

/**
 * Parse property value (including arrays)
 */
const parsePropertyValue = (expr: unknown): unknown => {
  if (isArrayExpression(expr)) {
    const result: unknown[] = []
    for (const element of expr.elements) {
      const elementExpr = getArgumentExpression(element)
      if (
        elementExpr &&
        elementExpr.type === 'MemberExpression' &&
        elementExpr.object.type === 'Identifier' &&
        elementExpr.property.type === 'Identifier'
      ) {
        // For table.columnName references, use the property name
        result.push(elementExpr.property.value)
      } else if (
        isMemberExpression(element) &&
        isIdentifier(element.object) &&
        isIdentifier(element.property)
      ) {
        // Direct MemberExpression (not wrapped in { expression })
        result.push(element.property.value)
      } else {
        const parsed = elementExpr
          ? parseDefaultValue(elementExpr)
          : parseUnknownValue(element)
        result.push(parsed)
      }
    }
    return result
  }
  return parseUnknownValue(expr)
}

/**
 * Parse Drizzle TypeScript schema to extract table definitions using SWC AST
 */
const parseDrizzleSchema = (
  sourceCode: string,
): {
  tables: Record<string, DrizzleTableDefinition>
  enums: Record<string, DrizzleEnumDefinition>
  relations: DrizzleRelationDefinition[]
} => {
  // Parse TypeScript code into AST
  const ast = parseSync(sourceCode, {
    syntax: 'typescript',
    target: 'es2022',
  })

  const tables: Record<string, DrizzleTableDefinition> = {}
  const enums: Record<string, DrizzleEnumDefinition> = {}
  const relations: DrizzleRelationDefinition[] = []

  // Traverse the AST to find pgTable calls
  visitModule(ast, tables, enums, relations)

  return { tables, enums, relations }
}

/**
 * Visit and traverse the module AST
 */
const visitModule = (
  module: Module,
  tables: Record<string, DrizzleTableDefinition>,
  enums: Record<string, DrizzleEnumDefinition>,
  relations: DrizzleRelationDefinition[],
) => {
  for (const item of module.body) {
    if (item.type === 'VariableDeclaration') {
      for (const declarator of item.declarations) {
        visitVariableDeclarator(declarator, tables, enums, relations)
      }
    } else if (
      item.type === 'ExportDeclaration' &&
      item.declaration?.type === 'VariableDeclaration'
    ) {
      for (const declarator of item.declaration.declarations) {
        visitVariableDeclarator(declarator, tables, enums, relations)
      }
    }
  }
}

/**
 * Visit variable declarator to find pgTable, pgEnum, or relations calls
 */
const visitVariableDeclarator = (
  declarator: VariableDeclarator,
  tables: Record<string, DrizzleTableDefinition>,
  enums: Record<string, DrizzleEnumDefinition>,
  relations: DrizzleRelationDefinition[],
) => {
  if (!declarator.init || declarator.init.type !== 'CallExpression') return

  const callExpr = declarator.init

  if (isPgTableCall(callExpr)) {
    const table = parsePgTableCall(callExpr)
    if (table) {
      tables[table.name] = table
    }
  } else if (
    declarator.init.type === 'CallExpression' &&
    declarator.init.callee.type === 'MemberExpression' &&
    declarator.init.callee.property.type === 'Identifier' &&
    declarator.init.callee.property.value === '$comment'
  ) {
    // Handle table comments: pgTable(...).comment(...)
    const table = parsePgTableWithComment(declarator.init)
    if (table) {
      tables[table.name] = table
    }
  } else if (
    callExpr.callee.type === 'Identifier' &&
    callExpr.callee.value === 'pgEnum'
  ) {
    const enumDef = parsePgEnumCall(callExpr)
    if (enumDef && declarator.id.type === 'Identifier') {
      enums[declarator.id.value] = enumDef
    }
  } else if (
    callExpr.callee.type === 'Identifier' &&
    callExpr.callee.value === 'relations'
  ) {
    const relationDefs = parseRelationsCall(callExpr)
    relations.push(...relationDefs)
  }
}

/**
 * Parse pgTable call with comment method chain
 */
const parsePgTableWithComment = (
  commentCallExpr: CallExpression,
): DrizzleTableDefinition | null => {
  // Extract the comment from the call arguments
  let comment: string | null = null
  if (commentCallExpr.arguments.length > 0) {
    const commentArg = commentCallExpr.arguments[0]
    const commentExpr = getArgumentExpression(commentArg)
    if (commentExpr && isStringLiteral(commentExpr)) {
      comment = commentExpr.value
    }
  }

  // Get the pgTable call from the object of the member expression
  if (commentCallExpr.callee.type === 'MemberExpression') {
    const pgTableCall = commentCallExpr.callee.object
    if (pgTableCall.type === 'CallExpression' && isPgTableCall(pgTableCall)) {
      const table = parsePgTableCall(pgTableCall)
      if (table && comment) {
        table.comment = comment
      }
      return table
    }
  }

  return null
}

/**
 * Parse pgTable call expression
 */
const parsePgTableCall = (
  callExpr: CallExpression,
): DrizzleTableDefinition | null => {
  if (callExpr.arguments.length < 2) return null

  const tableNameArg = callExpr.arguments[0]
  const columnsArg = callExpr.arguments[1]

  if (!tableNameArg || !columnsArg) return null

  // Extract expression from SWC argument structure
  const tableNameExpr = getArgumentExpression(tableNameArg)
  const columnsExpr = getArgumentExpression(columnsArg)

  const tableName = tableNameExpr ? getStringValue(tableNameExpr) : null
  if (!tableName || !columnsExpr || !isObjectExpression(columnsExpr))
    return null

  const table: DrizzleTableDefinition = {
    name: tableName,
    columns: {},
    indexes: {},
  }

  // Parse columns from the object expression
  for (const prop of columnsExpr.properties) {
    if (prop.type === 'KeyValueProperty') {
      const column = parseColumnFromProperty(prop)
      if (column) {
        // Use the JS property name as the key
        const jsPropertyName =
          prop.key.type === 'Identifier' ? getIdentifierName(prop.key) : null
        if (jsPropertyName) {
          table.columns[jsPropertyName] = column
        }
      }
    }
  }

  // Parse indexes and composite primary key from third argument if present
  if (callExpr.arguments.length > 2) {
    const thirdArg = callExpr.arguments[2]
    const thirdArgExpr = getArgumentExpression(thirdArg)
    if (thirdArgExpr && thirdArgExpr.type === 'ArrowFunctionExpression') {
      // Parse arrow function like (table) => ({ nameIdx: index(...), pk: primaryKey(...) })
      let returnExpr = thirdArgExpr.body

      // Handle parenthesized expressions like (table) => ({ ... })
      if (returnExpr.type === 'ParenthesisExpression') {
        returnExpr = returnExpr.expression
      }

      if (returnExpr.type === 'ObjectExpression') {
        for (const prop of returnExpr.properties) {
          if (prop.type === 'KeyValueProperty') {
            const indexName =
              prop.key.type === 'Identifier'
                ? getIdentifierName(prop.key)
                : null
            if (indexName && prop.value.type === 'CallExpression') {
              const indexDef = parseIndexDefinition(prop.value, indexName)
              if (indexDef) {
                if (isCompositePrimaryKey(indexDef)) {
                  table.compositePrimaryKey = indexDef
                } else if (isDrizzleIndex(indexDef)) {
                  table.indexes[indexName] = indexDef
                }
              }
            }
          }
        }
      }
    }
  }

  return table
}

/**
 * Parse index or primary key definition
 */
const parseIndexDefinition = (
  callExpr: CallExpression,
  name: string,
): DrizzleIndexDefinition | CompositePrimaryKeyDefinition | null => {
  // Handle primaryKey({ columns: [...] })
  if (
    callExpr.callee.type === 'Identifier' &&
    callExpr.callee.value === 'primaryKey'
  ) {
    if (callExpr.arguments.length > 0) {
      const configArg = callExpr.arguments[0]
      const configExpr = getArgumentExpression(configArg)
      if (configExpr && isObjectExpression(configExpr)) {
        const config = parseObjectExpression(configExpr)
        if (config['columns'] && Array.isArray(config['columns'])) {
          const columns = config['columns'].filter(
            (col): col is string => typeof col === 'string',
          )
          return {
            type: 'primaryKey',
            columns,
          }
        }
      }
    }
    return null
  }

  // Handle index('name').on(...) or uniqueIndex('name').on(...)
  let isUnique = false
  let indexName = name
  let onCallExpr = callExpr

  // Check if this is a chained call like index('name').on(...)
  if (
    callExpr.callee.type === 'MemberExpression' &&
    callExpr.callee.property.type === 'Identifier' &&
    callExpr.callee.property.value === 'on'
  ) {
    onCallExpr = callExpr
    const indexCall = callExpr.callee.object
    if (
      indexCall.type === 'CallExpression' &&
      indexCall.callee.type === 'Identifier'
    ) {
      const indexType = indexCall.callee.value
      if (indexType === 'index' || indexType === 'uniqueIndex') {
        isUnique = indexType === 'uniqueIndex'
        // Get the index name from the first argument
        if (indexCall.arguments.length > 0) {
          const nameArg = indexCall.arguments[0]
          const nameExpr = getArgumentExpression(nameArg)
          if (nameExpr && isStringLiteral(nameExpr)) {
            indexName = nameExpr.value
          }
        }
      }
    }
  }

  // Parse column references from .on(...) arguments
  const columns: string[] = []
  for (const arg of onCallExpr.arguments) {
    const argExpr = getArgumentExpression(arg)
    if (
      argExpr &&
      argExpr.type === 'MemberExpression' &&
      argExpr.object.type === 'Identifier' &&
      argExpr.property.type === 'Identifier'
    ) {
      // This is table.columnName - we want the property name (JS property name)
      columns.push(argExpr.property.value)
    }
  }

  if (columns.length > 0) {
    return {
      name: indexName,
      columns,
      unique: isUnique,
      type: '',
    }
  }

  return null
}

/**
 * Parse pgEnum call expression
 */
const parsePgEnumCall = (
  callExpr: CallExpression,
): DrizzleEnumDefinition | null => {
  if (callExpr.arguments.length < 2) return null

  const enumNameArg = callExpr.arguments[0]
  const valuesArg = callExpr.arguments[1]

  if (!enumNameArg || !valuesArg) return null

  // Extract expression from SWC argument structure
  const enumNameExpr = getArgumentExpression(enumNameArg)
  const valuesExpr = getArgumentExpression(valuesArg)

  const enumName = enumNameExpr ? getStringValue(enumNameExpr) : null
  if (!enumName || !valuesExpr || !isArrayExpression(valuesExpr)) return null

  const values: string[] = []
  for (const element of valuesExpr.elements) {
    if (isStringLiteral(element)) {
      values.push(element.value)
    }
  }

  return { name: enumName, values }
}

/**
 * Parse relations call expression
 */
const parseRelationsCall = (
  callExpr: CallExpression,
): DrizzleRelationDefinition[] => {
  const relations: DrizzleRelationDefinition[] = []

  if (callExpr.arguments.length < 2) {
    return relations
  }

  // First argument should be the table reference
  const tableArg = callExpr.arguments[0]
  let fromTableName = ''

  // Handle ExpressionOrSpread structure
  const tableExpr = hasProperty(tableArg, 'expression')
    ? getPropertyValue(tableArg, 'expression')
    : tableArg

  if (
    hasProperty(tableExpr, 'type') &&
    getPropertyValue(tableExpr, 'type') === 'Identifier'
  ) {
    fromTableName = getSafeStringValue(getPropertyValue(tableExpr, 'value'))
  }

  // Second argument should be the arrow function with relations definition
  const relationsFnArg = callExpr.arguments[1]
  const relationsFn = hasProperty(relationsFnArg, 'expression')
    ? getPropertyValue(relationsFnArg, 'expression')
    : relationsFnArg
  if (
    !hasProperty(relationsFn, 'type') ||
    getPropertyValue(relationsFn, 'type') !== 'ArrowFunctionExpression'
  ) {
    return relations
  }

  let body = getPropertyValue(relationsFn, 'body')

  // Handle ParenthesisExpression: ({ ... }) -> { ... }
  if (
    hasProperty(body, 'type') &&
    getPropertyValue(body, 'type') === 'ParenthesisExpression'
  ) {
    body = getPropertyValue(body, 'expression')
  }

  if (
    !hasProperty(body, 'type') ||
    getPropertyValue(body, 'type') !== 'ObjectExpression'
  ) {
    return relations
  }

  const properties = getSafeArrayValue(getPropertyValue(body, 'properties'))
  if (properties.length === 0) {
    return relations
  }

  // Parse each relation property
  for (const prop of properties) {
    const propType = getPropertyValue(prop, 'type')
    if (
      !hasProperty(prop, 'type') ||
      (propType !== 'Property' && propType !== 'KeyValueProperty')
    ) {
      continue
    }

    const value = getPropertyValue(prop, 'value')
    if (
      !hasProperty(value, 'type') ||
      getPropertyValue(value, 'type') !== 'CallExpression'
    ) {
      continue
    }

    const callee = getPropertyValue(value, 'callee')
    if (
      !hasProperty(callee, 'type') ||
      getPropertyValue(callee, 'type') !== 'Identifier'
    ) {
      continue
    }

    const relationType = getSafeStringValue(getPropertyValue(callee, 'value'))
    if (relationType !== 'one' && relationType !== 'many') {
      continue
    }

    const args = getSafeArrayValue(getPropertyValue(value, 'arguments'))
    if (args.length < 1) {
      continue
    }

    // First argument is the target table
    const targetTableArg = args[0]
    const targetTableExpr = hasProperty(targetTableArg, 'expression')
      ? getPropertyValue(targetTableArg, 'expression')
      : targetTableArg
    let toTableName = ''

    if (
      hasProperty(targetTableExpr, 'type') &&
      getPropertyValue(targetTableExpr, 'type') === 'Identifier'
    ) {
      toTableName = getSafeStringValue(
        getPropertyValue(targetTableExpr, 'value'),
      )
    }

    // Second argument (if exists) is the configuration object
    let fields: string[] = []
    let references: string[] = []

    if (args.length > 1) {
      const configArg = args[1]
      const configExpr = hasProperty(configArg, 'expression')
        ? getPropertyValue(configArg, 'expression')
        : configArg
      if (
        hasProperty(configExpr, 'type') &&
        getPropertyValue(configExpr, 'type') === 'ObjectExpression'
      ) {
        const configProps = getSafeArrayValue(
          getPropertyValue(configExpr, 'properties'),
        )
        if (configProps.length > 0) {
          for (const configProp of configProps) {
            const configPropType = getPropertyValue(configProp, 'type')
            if (
              !hasProperty(configProp, 'type') ||
              (configPropType !== 'Property' &&
                configPropType !== 'KeyValueProperty')
            ) {
              continue
            }

            const key = getPropertyValue(configProp, 'key')
            const keyName = getSafeStringValue(getPropertyValue(key, 'value'))

            const propValue = getPropertyValue(configProp, 'value')

            if (keyName === 'fields' || keyName === 'references') {
              if (
                hasProperty(propValue, 'type') &&
                getPropertyValue(propValue, 'type') === 'ArrayExpression'
              ) {
                const elements = getSafeArrayValue(
                  getPropertyValue(propValue, 'elements'),
                )
                if (elements.length > 0) {
                  const fieldNames: string[] = []
                  for (const element of elements) {
                    // Handle ExpressionOrSpread structure
                    const elementExpr = hasProperty(element, 'expression')
                      ? getPropertyValue(element, 'expression')
                      : element

                    if (
                      hasProperty(elementExpr, 'type') &&
                      getPropertyValue(elementExpr, 'type') ===
                        'MemberExpression'
                    ) {
                      const property = getPropertyValue(elementExpr, 'property')
                      if (hasProperty(property, 'value')) {
                        const fieldName = getSafeStringValue(
                          getPropertyValue(property, 'value'),
                        )
                        if (fieldName) {
                          fieldNames.push(fieldName)
                        }
                      }
                    }
                  }

                  if (keyName === 'fields') {
                    fields = fieldNames
                  } else {
                    references = fieldNames
                  }
                }
              }
            }
          }
        }
      }
    }

    if (fromTableName && toTableName) {
      const relation: DrizzleRelationDefinition = {
        fromTable: fromTableName,
        toTable: toTableName,
        type: getSafeRelationType(relationType),
      }

      if (fields.length > 0) {
        relation.fields = fields
      }

      if (references.length > 0) {
        relation.references = references
      }

      relations.push(relation)
    }
  }

  return relations
}

/**
 * Convert Drizzle table definition to internal Table format
 */
const convertToTable = (
  tableDef: DrizzleTableDefinition,
  enums: Record<string, DrizzleEnumDefinition> = {},
): Table => {
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
      default: convertDefaultValue(
        columnDef.default ||
          (columnType === 'serial' ? 'autoincrement' : undefined),
        columnType,
      ),
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
    const actualColumnNames = tableDef.compositePrimaryKey.columns
      .map((jsPropertyName) => {
        const columnDef = tableDef.columns[jsPropertyName]
        return columnDef ? columnDef.name : jsPropertyName
      })
      .filter((name) => name && name.length > 0)

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

    // Fix foreign key constraint targetColumnName from JS property names to actual DB column names
    for (const table of Object.values(tables)) {
      for (const constraint of Object.values(table.constraints)) {
        if (constraint.type === 'FOREIGN KEY') {
          const drizzleTargetTable = drizzleTables[constraint.targetTableName]
          if (drizzleTargetTable) {
            // Find column definition by JS property name and get actual DB column name
            const targetColumnDef =
              drizzleTargetTable.columns[constraint.targetColumnName]
            if (targetColumnDef) {
              constraint.targetColumnName = targetColumnDef.name
            }
          }
        }
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
