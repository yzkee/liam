/**
 * Main orchestrator for Drizzle ORM MySQL schema parsing
 */

import type { Module, VariableDeclarator } from '@swc/core'
import { parseSync } from '@swc/core'
import type { Processor, ProcessResult } from '../../types.js'
import { isMysqlTableCall, isSchemaTableCall } from './astUtils.js'
import { convertDrizzleTablesToInternal } from './converter.js'
import { parseMysqlEnumCall } from './enumParser.js'
import {
  parseMysqlTableCall,
  parseMysqlTableWithComment,
  parseSchemaTableCall,
} from './tableParser.js'
import type { DrizzleEnumDefinition, DrizzleTableDefinition } from './types.js'

/**
 * Parse Drizzle TypeScript schema to extract table definitions using SWC AST
 */
const parseDrizzleSchema = (
  sourceCode: string,
): {
  tables: Record<string, DrizzleTableDefinition>
  enums: Record<string, DrizzleEnumDefinition>
  variableToTableMapping: Record<string, string>
} => {
  // Parse TypeScript code into AST
  const ast = parseSync(sourceCode, {
    syntax: 'typescript',
    target: 'es2022',
  })

  const tables: Record<string, DrizzleTableDefinition> = {}
  const enums: Record<string, DrizzleEnumDefinition> = {}
  const variableToTableMapping: Record<string, string> = {}

  // Traverse the AST to find mysqlTable calls
  visitModule(ast, tables, enums, variableToTableMapping)

  return { tables, enums, variableToTableMapping }
}

/**
 * Visit and traverse the module AST
 */
const visitModule = (
  module: Module,
  tables: Record<string, DrizzleTableDefinition>,
  enums: Record<string, DrizzleEnumDefinition>,
  variableToTableMapping: Record<string, string>,
) => {
  for (const item of module.body) {
    if (item.type === 'VariableDeclaration') {
      for (const declarator of item.declarations) {
        visitVariableDeclarator(
          declarator,
          tables,
          enums,
          variableToTableMapping,
        )
      }
    } else if (
      item.type === 'ExportDeclaration' &&
      item.declaration?.type === 'VariableDeclaration'
    ) {
      for (const declarator of item.declaration.declarations) {
        visitVariableDeclarator(
          declarator,
          tables,
          enums,
          variableToTableMapping,
        )
      }
    }
  }
}

/**
 * Visit variable declarator to find mysqlTable, mysqlEnum, or relations calls
 */
const visitVariableDeclarator = (
  declarator: VariableDeclarator,
  tables: Record<string, DrizzleTableDefinition>,
  enums: Record<string, DrizzleEnumDefinition>,
  variableToTableMapping: Record<string, string>,
) => {
  if (!declarator.init || declarator.init.type !== 'CallExpression') return

  const callExpr = declarator.init

  if (isMysqlTableCall(callExpr)) {
    const table = parseMysqlTableCall(callExpr)
    if (table && declarator.id.type === 'Identifier') {
      tables[table.name] = table
      // Map variable name to table name
      variableToTableMapping[declarator.id.value] = table.name
    }
  } else if (isSchemaTableCall(callExpr)) {
    const table = parseSchemaTableCall(callExpr)
    if (table && declarator.id.type === 'Identifier') {
      tables[table.name] = table
      // Map variable name to table name
      variableToTableMapping[declarator.id.value] = table.name
    }
  } else if (
    declarator.init.type === 'CallExpression' &&
    declarator.init.callee.type === 'MemberExpression' &&
    declarator.init.callee.property.type === 'Identifier' &&
    declarator.init.callee.property.value === '$comment'
  ) {
    // Handle table comments: mysqlTable(...).comment(...)
    const table = parseMysqlTableWithComment(declarator.init)
    if (table && declarator.id.type === 'Identifier') {
      tables[table.name] = table
      // Map variable name to table name
      variableToTableMapping[declarator.id.value] = table.name
    }
  } else if (
    callExpr.callee.type === 'Identifier' &&
    callExpr.callee.value === 'mysqlEnum'
  ) {
    const enumDef = parseMysqlEnumCall(callExpr)
    if (enumDef && declarator.id.type === 'Identifier') {
      enums[declarator.id.value] = enumDef
    }
  }
}

/**
 * Main processor function for Drizzle MySQL schemas
 */
const parseDrizzleSchemaString = (
  schemaString: string,
): Promise<ProcessResult> => {
  try {
    const {
      tables: drizzleTables,
      enums,
      variableToTableMapping,
    } = parseDrizzleSchema(schemaString)
    const { tables, errors } = convertDrizzleTablesToInternal(
      drizzleTables,
      enums,
      variableToTableMapping,
    )

    return Promise.resolve({
      value: { tables },
      errors,
    })
  } catch (error) {
    return Promise.resolve({
      value: { tables: {} },
      errors: [
        new Error(
          `Error parsing Drizzle MySQL schema: ${error instanceof Error ? error.message : String(error)}`,
        ),
      ],
    })
  }
}

export const processor: Processor = parseDrizzleSchemaString
