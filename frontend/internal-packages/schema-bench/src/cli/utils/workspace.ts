import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/**
 * Get the workspace base path
 * Uses INIT_CWD environment variable or current working directory
 */
const getWorkspaceBasePath = (): string => {
  return process.env['INIT_CWD'] || process.cwd()
}

/**
 * Get the benchmark workspace path
 * Searches for project root by looking for pnpm-workspace.yaml
 */
export const getWorkspacePath = (): string => {
  // Try to find project root by looking for pnpm-workspace.yaml
  let currentPath = process.cwd()

  while (currentPath !== '/') {
    if (existsSync(join(currentPath, 'pnpm-workspace.yaml'))) {
      // Found project root, return benchmark-workspace at project root
      return resolve(currentPath, 'benchmark-workspace')
    }
    currentPath = dirname(currentPath)
  }

  // Fallback to original behavior if project root not found
  return resolve(getWorkspaceBasePath(), 'benchmark-workspace')
}

/**
 * Get a path relative to the workspace
 */
export const getWorkspaceSubPath = (...paths: string[]): string => {
  return join(getWorkspacePath(), ...paths)
}
