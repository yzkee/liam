import { fileURLToPath } from 'node:url'
import * as relativeImportPlugin from '@mkizka/eslint-plugin-relative-import'
import { createBaseConfig } from '../../internal-packages/configs/eslint/index.js'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default [
  ...createBaseConfig({
    tsconfigPath: './tsconfig.json',
    gitignorePath,
  }),
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@mkizka/relative-import': relativeImportPlugin,
    },
    rules: {
      '@mkizka/relative-import/no-path-alias': [
        'error',
        { alias: { '@/': '.' } },
      ],
    },
  },
]
