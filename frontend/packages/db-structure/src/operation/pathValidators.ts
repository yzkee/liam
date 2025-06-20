import { PATH_PATTERNS } from './constants.js'

const createPathValidator = (pattern: RegExp) => {
  return (input: unknown): boolean => {
    if (typeof input !== 'string') return false
    return pattern.test(input)
  }
}

export const isTablePath = createPathValidator(PATH_PATTERNS.TABLE_BASE)
