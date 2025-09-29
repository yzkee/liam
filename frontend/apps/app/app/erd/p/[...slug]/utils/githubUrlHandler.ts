import {
  downloadFileContent,
  type GitHubContentItem,
  type GitHubRepoInfo,
  getFolderContents,
} from '@liam-hq/github'
import { fromThrowable } from '@liam-hq/neverthrow'
import { detectFormat } from '@liam-hq/schema/parser'
import { err, ok, type Result } from 'neverthrow'

const SECURITY_LIMITS = {
  MAX_RECURSION_DEPTH: 5,
  MAX_FILES_PER_FOLDER: 50,
  MAX_TOTAL_FILES: 100,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB per file
  MAX_DIRS_PER_FOLDER: 50,
}

const safeParseUrl = (url: string): Result<URL, Error> => {
  if (typeof url !== 'string' || url.trim() === '') {
    return err(new Error('Invalid URL: must be a non-empty string'))
  }

  const parseUrl = fromThrowable(
    () => new URL(url),
    (cause: unknown) =>
      cause instanceof Error ? cause : new Error('Invalid URL: parse failed'),
  )

  const urlResult = parseUrl()
  if (urlResult.isErr()) {
    return err(urlResult.error)
  }

  const parsedUrl = urlResult.value

  // Validate protocol
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return err(new Error('Invalid URL: must use http or https protocol'))
  }

  return ok(parsedUrl)
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

const checkSecurityLimits = (
  depth: number,
  totalFilesCollected: { count: number },
  filesInFolder: number,
  dirsInFolder: number,
): Result<void, Error> => {
  if (depth >= SECURITY_LIMITS.MAX_RECURSION_DEPTH) {
    return err(
      new Error(
        `Maximum recursion depth (${SECURITY_LIMITS.MAX_RECURSION_DEPTH}) exceeded`,
      ),
    )
  }

  if (totalFilesCollected.count >= SECURITY_LIMITS.MAX_TOTAL_FILES) {
    return err(
      new Error(
        `Maximum total files limit (${SECURITY_LIMITS.MAX_TOTAL_FILES}) exceeded`,
      ),
    )
  }

  if (filesInFolder > SECURITY_LIMITS.MAX_FILES_PER_FOLDER) {
    return err(
      new Error(
        `Too many files in folder (${filesInFolder}). Maximum allowed: ${SECURITY_LIMITS.MAX_FILES_PER_FOLDER}`,
      ),
    )
  }

  if (dirsInFolder > SECURITY_LIMITS.MAX_DIRS_PER_FOLDER) {
    return err(
      new Error(
        `Too many subdirectories in folder (${dirsInFolder}). Maximum allowed: ${SECURITY_LIMITS.MAX_DIRS_PER_FOLDER}`,
      ),
    )
  }

  return ok(undefined)
}

const processSchemaFile = (
  item: GitHubContentItem,
  totalFilesCollected: { count: number },
): Result<string | null, Error> => {
  if (item.type !== 'file' || !isSchemaFile(item.name) || !item.download_url) {
    return ok(null)
  }

  if (totalFilesCollected.count >= SECURITY_LIMITS.MAX_TOTAL_FILES) {
    return err(
      new Error(
        `Maximum total files limit (${SECURITY_LIMITS.MAX_TOTAL_FILES}) exceeded`,
      ),
    )
  }

  totalFilesCollected.count++
  return ok(item.download_url)
}

const processDirectoryItem = async (
  item: GitHubContentItem,
  repoInfo: GitHubRepoInfo,
  depth: number,
  totalFilesCollected: { count: number },
): Promise<Result<string[], Error>> => {
  const subfolderInfo: GitHubRepoInfo = {
    ...repoInfo,
    path: item.path,
  }
  return collectSchemaFilesFromFolder(
    subfolderInfo,
    depth + 1,
    totalFilesCollected,
  )
}

const processContentItems = async (
  contents: GitHubContentItem[],
  repoInfo: GitHubRepoInfo,
  depth: number,
  totalFilesCollected: { count: number },
): Promise<Result<string[], Error>> => {
  const schemaFileUrls: string[] = []

  for (const item of contents) {
    if (item.type === 'file') {
      const fileResult = processSchemaFile(item, totalFilesCollected)
      if (fileResult.isErr()) {
        return err(fileResult.error)
      }
      if (fileResult.value) {
        schemaFileUrls.push(fileResult.value)
      }
    } else if (item.type === 'dir') {
      const subfolderResult = await processDirectoryItem(
        item,
        repoInfo,
        depth,
        totalFilesCollected,
      )
      if (subfolderResult.isErr()) {
        return subfolderResult
      }
      schemaFileUrls.push(...subfolderResult.value)
    }
  }

  return ok(schemaFileUrls)
}

const collectSchemaFilesFromFolder = async (
  repoInfo: GitHubRepoInfo,
  depth = 0,
  totalFilesCollected = { count: 0 },
): Promise<Result<string[], Error>> => {
  const contentsResult = await fetchGitHubFolderContents(repoInfo)
  if (contentsResult.isErr()) {
    return err(contentsResult.error)
  }

  const contents = contentsResult.value
  const filesInFolder = contents.filter((item) => item.type === 'file').length
  const dirsInFolder = contents.filter((item) => item.type === 'dir').length

  const limitsResult = checkSecurityLimits(
    depth,
    totalFilesCollected,
    filesInFolder,
    dirsInFolder,
  )
  if (limitsResult.isErr()) {
    return err(limitsResult.error)
  }

  return processContentItems(contents, repoInfo, depth, totalFilesCollected)
}

const downloadFile = async (url: string): Promise<Result<string, Error>> => {
  const content = await downloadFileContent(
    url,
    10000,
    SECURITY_LIMITS.MAX_FILE_SIZE_BYTES,
  )
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
