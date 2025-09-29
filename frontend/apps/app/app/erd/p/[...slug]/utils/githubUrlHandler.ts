import {
  downloadFileContent,
  type GitHubContentItem,
  type GitHubRepoInfo,
  getFolderContents,
} from '@liam-hq/github'
import { detectFormat } from '@liam-hq/schema/parser'
import { err, ok, type Result } from 'neverthrow'

const safeParseUrl = (url: string): Result<URL, Error> => {
  // Basic URL validation without throwing
  if (!url || typeof url !== 'string') {
    return err(new Error('Invalid URL: must be a non-empty string'))
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return err(new Error('Invalid URL: must start with http:// or https://'))
  }

  // Check for basic URL structure
  const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i
  if (!urlPattern.test(url)) {
    return err(new Error('Invalid URL format'))
  }

  // If basic validation passes, construct URL manually
  const match = url.match(/^(https?):\/\/([^\/]+)(.*)$/)
  if (!match) {
    return err(new Error('Failed to parse URL components'))
  }

  const [, protocol, host, pathname = ''] = match

  if (!host) {
    return err(new Error('Invalid URL: missing host'))
  }

  const urlObj: URL = {
    protocol: `${protocol}:`,
    hostname: host.split(':')[0] || host,
    host,
    pathname: pathname || '/',
    href: url,
    origin: `${protocol}://${host.split('/')[0]}`,
    search: '',
    hash: '',
    port: '',
    username: '',
    password: '',
    searchParams: new URLSearchParams(),
    toString: () => url,
    toJSON: () => url,
  }

  return ok(urlObj)
}

export const isGitHubFolderUrl = (url: string): boolean => {
  const urlResult = safeParseUrl(url)
  if (urlResult.isErr()) {
    return false
  }
  return urlResult.value.hostname === 'github.com' && url.includes('/tree/')
}

const isSchemaFile = (filename: string): boolean => {
  const lowerFilename = filename.toLowerCase()

  const excludedFilenames = [
    // JS/TS utilities
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
    'validation.ts',
    'validation.js',
    // Tests
    'test.ts',
    'test.js',
    'spec.ts',
    'spec.js',
    'mock.ts',
    'mock.js',
    // Prisma non-schema files
    'client.prisma',
    'migrations.prisma',
    'seed.prisma',
    // SQL non-schema files
    'seed.sql',
    'functions.sql',
    'triggers.sql',
    'views.sql',
    'indexes.sql',
    'permissions.sql',
    // SchemaRB non-schema files
    'seeds.rb',
    'application_record.rb',
    // Drizzle non-schema files
    'migrate.ts',
    // Documentation
    'readme.md',
    'readme.sql',
    'readme.prisma',
  ]

  const schemaExtensions = ['.sql', '.prisma', '.rb', '.json', '.js', '.ts']

  const hasValidExtension = schemaExtensions.some((ext) =>
    lowerFilename.endsWith(ext),
  )
  if (!hasValidExtension) {
    return false
  }

  if (excludedFilenames.includes(lowerFilename)) {
    return false
  }

  return true
}

export const parseGitHubFolderUrl = (url: string): GitHubRepoInfo | null => {
  const urlResult = safeParseUrl(url)
  if (urlResult.isErr()) {
    return null
  }

  const pathSegments = urlResult.value.pathname.split('/').filter(Boolean)

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
}

const fetchGitHubFolderContents = async (
  repoInfo: GitHubRepoInfo,
): Promise<Result<GitHubContentItem[], Error>> => {
  const contents = await getFolderContents(
    repoInfo.owner,
    repoInfo.repo,
    repoInfo.path,
    repoInfo.branch,
  )
  return ok(contents)
}

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

const downloadFile = async (url: string): Promise<Result<string, Error>> => {
  const content = await downloadFileContent(url)
  if (content === null) {
    return err(new Error(`Failed to download file from ${url}`))
  }
  return ok(content)
}

const downloadAndCombineFiles = async (
  urls: string[],
): Promise<Result<string, Error>> => {
  const downloadResults = await Promise.all(
    urls.map(async (url) => {
      const result = await downloadFile(url)
      if (result.isErr()) {
        console.warn(
          `Failed to download file from ${url}: ${result.error.message}`,
        )
        return null
      }
      return result.value
    }),
  )

  const validContents = downloadResults.filter((c): c is string => c !== null)

  if (validContents.length === 0) {
    return err(new Error('Failed to download any schema files'))
  }

  const combinedContent = validContents
    .map((content, index) => {
      return `\n// --- File ${index + 1} ---\n${content}`
    })
    .join('\n\n')

  return ok(combinedContent)
}

const detectFormatFromFileNames = (fileNames: string[]): string | null => {
  // Use existing detectFormat function - return the first detected format
  for (const fileName of fileNames) {
    const format = detectFormat(fileName)
    if (format) {
      return format
    }
  }

  return null
}

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
