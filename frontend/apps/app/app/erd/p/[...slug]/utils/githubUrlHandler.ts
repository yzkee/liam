// GitHub URL handling utilities for ERD viewer page
import { err, ok, type Result } from 'neverthrow'

type GitHubRepoInfo = {
  owner: string
  repo: string
  branch: string
  path: string
}

type GitHubContentItem = {
  type: 'file' | 'dir'
  name: string
  path: string
  download_url?: string
}

// Check if URL is a GitHub folder URL
export const isGitHubFolderUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname === 'github.com' && url.includes('/tree/')
  } catch {
    return false
  }
}

// Check if a file is a schema file based on extension and exclude common non-schema files
const isSchemaFile = (filename: string): boolean => {
  const lowerFilename = filename.toLowerCase()

  // Common non-schema file patterns to exclude
  const excludedFilenames = [
    'index.ts',
    'index.js',
    'config.ts',
    'config.js',
    'utils.ts',
    'utils.js',
    'types.ts',
    'types.js',
    'constants.ts',
    'constants.js',
    'helpers.ts',
    'helpers.js',
    'lib.ts',
    'lib.js',
    'common.ts',
    'common.js',
    'shared.ts',
    'shared.js',
    'test.ts',
    'test.js',
    'spec.ts',
    'spec.js',
    'mock.ts',
    'mock.js',
    'validation.ts', // Add validation files to exclusion list
    'validation.js',
  ]

  // Extensions that are actually supported schema formats
  const schemaExtensions = [
    '.sql', // postgres
    '.prisma', // prisma
    '.rb', // schemarb
    '.json', // tbls
    '.js', // drizzle
    '.ts', // drizzle
  ]

  // First check if it has a schema-compatible extension
  const hasValidExtension = schemaExtensions.some((ext) =>
    lowerFilename.endsWith(ext),
  )
  if (!hasValidExtension) {
    return false
  }

  // Then exclude common non-schema files
  if (excludedFilenames.includes(lowerFilename)) {
    return false
  }

  return true
}

// Parse GitHub folder URL to extract repo info
export const parseGitHubFolderUrl = (url: string): GitHubRepoInfo | null => {
  try {
    const parsedUrl = new URL(url)
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean)

    if (pathSegments.length < 4 || pathSegments[2] !== 'tree') {
      return null
    }

    const owner = pathSegments[0]
    const repo = pathSegments[1]
    const branch = pathSegments[3]

    if (!owner || !repo || !branch) {
      return null
    }

    const path = pathSegments.slice(4).join('/')

    return { owner, repo, branch, path }
  } catch {
    return null
  }
}

// Fetch GitHub folder contents using GitHub API
const fetchGitHubFolderContents = async (
  repoInfo: GitHubRepoInfo,
): Promise<Result<GitHubContentItem[], Error>> => {
  const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${repoInfo.path}?ref=${repoInfo.branch}`

  try {
    const response = await fetch(apiUrl, { cache: 'no-store' })
    if (!response.ok) {
      return err(
        new Error(
          `Failed to fetch GitHub folder contents: ${response.statusText}`,
        ),
      )
    }

    const data: unknown = await response.json()
    if (!Array.isArray(data)) {
      return err(new Error('Invalid response format from GitHub API'))
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return ok(data as GitHubContentItem[])
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error'))
  }
}

// Recursively collect schema files from GitHub folder
const collectSchemaFilesFromFolder = async (
  repoInfo: GitHubRepoInfo,
): Promise<Result<string[], Error>> => {
  const contentsResult = await fetchGitHubFolderContents(repoInfo)
  if (contentsResult.isErr()) {
    return err(contentsResult.error)
  }

  const contents = contentsResult.value
  const schemaFileUrls: string[] = []

  for (const item of contents) {
    if (item.type === 'file' && isSchemaFile(item.name) && item.download_url) {
      schemaFileUrls.push(item.download_url)
    } else if (item.type === 'file' && !isSchemaFile(item.name)) {
    } else if (item.type === 'dir') {
      // Recursively process subdirectories
      const subfolderInfo: GitHubRepoInfo = {
        ...repoInfo,
        path: item.path,
      }
      const subfolderResult = await collectSchemaFilesFromFolder(subfolderInfo)
      if (subfolderResult.isOk()) {
        schemaFileUrls.push(...subfolderResult.value)
      }
    }
  }

  return ok(schemaFileUrls)
}

// Download and combine multiple schema files
const downloadAndCombineFiles = async (
  urls: string[],
): Promise<Result<string, Error>> => {
  try {
    const downloadPromises = urls.map(async (url) => {
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) {
        console.warn(`Failed to download file from ${url}`)
        return null
      }
      return await response.text()
    })

    const contents = await Promise.all(downloadPromises)
    const validContents = contents.filter((c): c is string => c !== null)

    if (validContents.length === 0) {
      return err(new Error('Failed to download any schema files'))
    }

    // Better file combination for Drizzle schemas
    // Add proper spacing and comments for file boundaries
    const combinedContent = validContents
      .map((content, index) => {
        // Add file boundary comment and ensure proper spacing
        return `\n// --- File ${index + 1} ---\n${content}`
      })
      .join('\n\n')

    return ok(combinedContent)
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Unknown error'))
  }
}

// Helper to detect format from file extensions
const detectFormatFromFileNames = (fileNames: string[]): string | null => {
  const extensions = fileNames.map((name) => {
    const parts = name.toLowerCase().split('.')
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
  })

  // Priority order for format detection
  if (extensions.some((ext) => ext === '.prisma')) {
    return 'prisma'
  }
  if (extensions.some((ext) => ext === '.rb')) {
    return 'schemarb'
  }
  if (extensions.some((ext) => ['.ts', '.js'].includes(ext))) {
    return 'drizzle' // Assume TypeScript/JavaScript files are Drizzle
  }
  if (extensions.some((ext) => ext === '.sql')) {
    return 'postgres'
  }
  if (extensions.some((ext) => ext === '.json')) {
    return 'tbls'
  }
  return null
}

// Enhanced function that returns both content and detected format
export const fetchSchemaFromGitHubFolder = async (
  url: string,
): Promise<Result<{ content: string; detectedFormat?: string }, Error>> => {
  const repoInfo = parseGitHubFolderUrl(url)
  if (!repoInfo) {
    return err(new Error('Invalid GitHub folder URL format'))
  }

  const schemaFilesResult = await collectSchemaFilesFromFolder(repoInfo)
  if (schemaFilesResult.isErr()) {
    return err(schemaFilesResult.error)
  }

  const schemaFileUrls = schemaFilesResult.value

  if (schemaFileUrls.length === 0) {
    return err(new Error('No schema files found in the specified folder'))
  }

  // Extract file names for format detection
  const fileNames = schemaFileUrls
    .map((url) => {
      const parts = url.split('/')
      return parts[parts.length - 1] || ''
    })
    .filter((name) => name !== '')

  const detectedFormat = detectFormatFromFileNames(fileNames)

  const contentResult = await downloadAndCombineFiles(schemaFileUrls)
  if (contentResult.isErr()) {
    return err(contentResult.error)
  }

  return ok({
    content: contentResult.value,
    detectedFormat: detectedFormat || undefined,
  })
}
