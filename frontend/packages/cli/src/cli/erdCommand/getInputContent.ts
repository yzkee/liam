import fs from 'node:fs'
import { URL } from 'node:url'
import { glob } from 'glob'

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function isGitHubFileUrl(url: string): boolean {
  const parsedUrl = new URL(url)
  return parsedUrl.hostname === 'github.com' && url.includes('/blob/')
}

function normalizePathForGlob(inputPath: string): string {
  // Only convert backslashes on Windows to preserve Linux/macOS filenames with backslashes
  if (process.platform === 'win32') {
    return inputPath.replace(/\\/g, '/')
  }
  return inputPath

  // TODO: Consider using path.sep for a more elegant solution:
  // return inputPath.split(path.sep).join(path.posix.sep)
  // This approach is currently not adopted because our test suite doesn't run on Windows,
  // making it difficult to mock path.sep behavior accurately in tests.
  // Once we add Windows CI environment, we should revisit this implementation.
}

async function readLocalFiles(pattern: string): Promise<string> {
  const normalizedPattern = normalizePathForGlob(pattern)
  const files = await glob(normalizedPattern)
  if (files.length === 0) {
    throw new Error(
      'No files found matching the pattern. Please provide valid file(s).',
    )
  }

  const contents = await Promise.all(
    files.map(async (filePath) => {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }
      return fs.readFileSync(filePath, 'utf8')
    }),
  )

  return contents.join('\n')
}

async function downloadGitHubRawContent(githubUrl: string): Promise<string> {
  const rawFileUrl = githubUrl
    .replace('github.com', 'raw.githubusercontent.com')
    .replace('/blob', '')
  return await downloadFile(rawFileUrl)
}

async function downloadFile(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`)
  }
  const data = await response.text()
  return data
}

export async function getInputContent(inputPath: string): Promise<string> {
  if (!isValidUrl(inputPath)) {
    return await readLocalFiles(inputPath)
  }

  return isGitHubFileUrl(inputPath)
    ? await downloadGitHubRawContent(inputPath)
    : await downloadFile(inputPath)
}
