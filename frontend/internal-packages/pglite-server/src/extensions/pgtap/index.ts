import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Extension } from '@electric-sql/pglite'

export const pgtap: Extension = {
  name: 'pgtap',
  setup: async () => {
    // In Next.js server environment, check for webpack-generated file
    if (process?.cwd) {
      // Next.js puts webpack assets in .next/server/static/extensions/
      const nextServerPath = join(
        process.cwd(),
        '.next',
        'server',
        'static',
        'extensions',
        'pgtap.tar.gz',
      )
      if (existsSync(nextServerPath)) {
        return {
          bundlePath: pathToFileURL(nextServerPath),
        }
      }
    }

    // Fallback to original relative path for non-Next.js environments (tests, etc.)
    return {
      bundlePath: new URL('./pgtap.tar.gz', import.meta.url),
    }
  },
}
