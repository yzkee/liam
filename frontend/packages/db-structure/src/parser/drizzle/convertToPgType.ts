/**
 * Convert Drizzle column types to PostgreSQL column types
 */
export function convertDrizzleTypeToPgType(
  drizzleType: string,
  options?: Record<string, unknown>,
): string {
  switch (drizzleType) {
    // Integer types
    case 'serial':
      return 'serial'
    case 'smallserial':
      return 'smallserial'
    case 'bigserial':
      return 'bigserial'
    case 'integer':
      return 'integer'
    case 'smallint':
      return 'smallint'
    case 'bigint':
      return 'bigint'

    // String types
    case 'varchar':
      if (options?.['length']) {
        return `varchar(${options['length']})`
      }
      return 'varchar'
    case 'char':
      if (options?.['length']) {
        return `char(${options['length']})`
      }
      return 'char'
    case 'text':
      return 'text'

    // Numeric types
    case 'decimal':
    case 'numeric':
      if (options?.['precision'] && options?.['scale']) {
        return `decimal(${options['precision']},${options['scale']})`
      }
      if (options?.['precision']) {
        return `decimal(${options['precision']})`
      }
      return 'decimal'
    case 'real':
      return 'real'
    case 'doublePrecision':
      return 'double precision'

    // Boolean type
    case 'boolean':
      return 'boolean'

    // Date/Time types
    case 'timestamp':
      if (options?.['withTimezone']) {
        return 'timestamp with time zone'
      }
      return 'timestamp'
    case 'timestamptz':
      return 'timestamp with time zone'
    case 'date':
      return 'date'
    case 'time':
      return 'time'
    case 'interval':
      return 'interval'

    // JSON types
    case 'json':
      return 'json'
    case 'jsonb':
      return 'jsonb'

    // UUID type
    case 'uuid':
      return 'uuid'

    // Handle default random for UUID
    case 'defaultRandom':
      return 'uuid'

    // Array types
    case 'array':
      return 'array'

    // Binary types
    case 'bytea':
      return 'bytea'

    // Network types
    case 'inet':
      return 'inet'
    case 'cidr':
      return 'cidr'
    case 'macaddr':
      return 'macaddr'

    // Geometric types
    case 'point':
      return 'point'
    case 'line':
      return 'line'
    case 'lseg':
      return 'lseg'
    case 'box':
      return 'box'
    case 'path':
      return 'path'
    case 'polygon':
      return 'polygon'
    case 'circle':
      return 'circle'

    // Range types
    case 'int4range':
      return 'int4range'
    case 'int8range':
      return 'int8range'
    case 'numrange':
      return 'numrange'
    case 'tsrange':
      return 'tsrange'
    case 'tstzrange':
      return 'tstzrange'
    case 'daterange':
      return 'daterange'

    // Default case for custom types (enums, etc.)
    default:
      return drizzleType
  }
}

/**
 * Convert default values from Drizzle to PostgreSQL format
 */
export function convertDefaultValue(
  value: unknown,
  _drizzleType: string,
): string | number | boolean | null {
  if (value === undefined || value === null) {
    return null
  }

  // Handle function calls like defaultNow(), autoincrement()
  if (typeof value === 'string') {
    if (value === 'defaultNow' || value === 'now()') {
      return 'now()'
    }
    if (value === 'autoincrement' || value === 'autoincrement()') {
      return 'autoincrement()'
    }
    if (value === 'defaultRandom') {
      return 'gen_random_uuid()'
    }
  }

  // Handle primitive values
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  return null
}

/**
 * Convert constraint reference options from Drizzle to PostgreSQL format
 */
export function convertReferenceOption(
  option: string,
): 'CASCADE' | 'RESTRICT' | 'SET_NULL' | 'SET_DEFAULT' | 'NO_ACTION' {
  switch (option.toLowerCase()) {
    case 'cascade':
      return 'CASCADE'
    case 'restrict':
      return 'RESTRICT'
    case 'setnull':
    case 'set null':
      return 'SET_NULL'
    case 'setdefault':
    case 'set default':
      return 'SET_DEFAULT'
    default:
      return 'NO_ACTION'
  }
}
