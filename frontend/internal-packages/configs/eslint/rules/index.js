/**
 * Export all custom ESLint rules as ESLint plugin
 */

import requireUseServer from './require-use-server.js'

export default {
  rules: {
    'require-use-server': requireUseServer,
  },
}
