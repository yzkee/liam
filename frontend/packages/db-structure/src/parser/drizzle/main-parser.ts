/**
 * Main orchestrator for Drizzle ORM schema parsing
 */

import type { Module, VariableDeclarator } from '@swc/core'
import { parseSync } from '@swc/core'
import type { Processor, ProcessResult } from '../types.js'
import { isPgTableCall } from './ast-utils.js'
import { convertDrizzleTablesToInternal } from './converter.js'
import { parsePgEnumCall } from './enum-parser.js'
import { parseRelationsCall } from './relation-parser.js'
import { parsePgTableCall, parsePgTableWithComment } from './table-parser.js'
import type {
  DrizzleEnumDefinition,
  DrizzleRelationDefinition,
  DrizzleTableDefinition,
} from './types.js'

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
 * Main processor function for Drizzle schemas
 */
const parseDrizzleSchemaString = async (
  schemaString: string,
): Promise<ProcessResult> => {
  try {
    const { tables: drizzleTables, enums } = parseDrizzleSchema(schemaString)
    const { tables, errors } = convertDrizzleTablesToInternal(
      drizzleTables,
      enums,
    )

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
