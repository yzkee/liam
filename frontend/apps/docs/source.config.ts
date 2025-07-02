// import { remarkInstall } from 'fumadocs-docgen/dist/index.js' // Temporarily disabled due to export issues
import { defineConfig, defineDocs } from 'fumadocs-mdx/config'

export const { docs, meta } = defineDocs({
  dir: 'content/docs',
})

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: 'light-plus', // undetermined
        dark: 'github-dark-high-contrast',
      },
    },
    remarkPlugins: [],
  },
})
