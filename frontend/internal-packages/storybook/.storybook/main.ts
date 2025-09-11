// biome-ignore lint/style/noCommonJs: Storybook config requires CommonJS
const path = require('node:path')

const config = {
  stories: [
    {
      directory: '../../../apps/app',
      files: '**/*.stories.@(jsx|tsx|mdx)',
      titlePrefix: 'app',
    },
    {
      directory: '../../../packages/ui/src',
      files: '**/*.stories.@(jsx|tsx|mdx)',
      titlePrefix: 'ui',
    },
    {
      directory: '../../../packages/erd-core/src',
      files: '**/*.stories.@(jsx|tsx|mdx)',
      titlePrefix: 'erd-core',
    },
  ],

  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-docs'),
  ],

  framework: {
    name: getAbsolutePath('@storybook/nextjs'),
    options: {},
  },

  staticDirs: ['../public', './public', '../../../apps/app/public'],

  webpackFinal: async (config) => {
    // Add alias for @/ to resolve to apps/app directory
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../../../apps/app'),
      }
    }
    return config
  },
}

// biome-ignore lint/style/noCommonJs: Storybook config requires CommonJS
module.exports = config

function getAbsolutePath(value) {
  // Return the module name as-is for Storybook to resolve
  return value
}
