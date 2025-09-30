import { fromAsyncThrowable } from '@liam-hq/neverthrow'
import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import type { ResultAsync } from 'neverthrow'
import type { GitHubContentItem } from './types'

const createOctokit = async (installationId: number) => {
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env['GITHUB_APP_ID'],
      privateKey: process.env['GITHUB_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
      installationId,
    },
  })

  return octokit
}

export const getPullRequestDetails = async (
  installationId: number,
  owner: string,
  repo: string,
  pullNumber: number,
) => {
  const octokit = await createOctokit(installationId)

  const { data: pullRequest } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  })

  return pullRequest
}

export async function getRepositoriesByInstallationId(installationId: number) {
  const octokit = await createOctokit(installationId)

  const { data } = await octokit.request('GET /installation/repositories', {
    per_page: 100,
  })

  return data
}
/**
 * Gets file content and SHA from GitHub repository
 * @returns Object containing content and SHA
 */
export const getFileContent = async (
  repositoryFullName: string,
  filePath: string,
  ref: string,
  installationId: number,
): Promise<{ content: string | null; sha: string | null }> => {
  const [owner, repo] = repositoryFullName.split('/')

  if (!owner || !repo) {
    console.error('Invalid repository format:', repositoryFullName)
    return { content: null, sha: null }
  }

  const octokit = await createOctokit(installationId)

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref,
    })

    if ('type' in data && data.type === 'file' && 'content' in data) {
      return {
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
        sha: data.sha,
      }
    }

    console.warn('Not a file:', filePath)
    return { content: null, sha: null }
  } catch (error) {
    // Handle 404 errors silently as they're expected when files don't exist
    const isNotFoundError =
      (error instanceof Error && 'status' in error && error.status === 404) ||
      (error instanceof Error && error.message.includes('Not Found')) ||
      (typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 404)

    if (isNotFoundError) {
      console.info(
        `File not found: ${filePath} in ${repositoryFullName}@${ref}`,
      )
    } else {
      // Log other errors as they might indicate actual problems
      console.error(`Error fetching file content for ${filePath}:`, error)
    }
    return { content: null, sha: null }
  }
}

export const getRepositoryBranches = async (
  installationId: number,
  owner: string,
  repo: string,
) => {
  const octokit = await createOctokit(installationId)

  const branches = await octokit.paginate(octokit.repos.listBranches, {
    owner,
    repo,
    per_page: 100,
  })

  return branches
}

/**
 * Gets the latest commit information for a repository
 * @returns Latest commit details or null
 */
export const getLastCommit = async (
  installationId: number,
  owner: string,
  repo: string,
  branch = 'main',
): Promise<{
  sha: string
  date: string
  message: string
  author: string
} | null> => {
  const octokit = await createOctokit(installationId)

  try {
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: 1, // Only need the latest commit
    })

    if (!commits || commits.length === 0) {
      return null
    }

    const latestCommit = commits[0]
    if (!latestCommit || !latestCommit.commit) {
      return null
    }

    return {
      sha: latestCommit.sha || '',
      date:
        latestCommit.commit.committer?.date ||
        latestCommit.commit.author?.date ||
        '',
      message: latestCommit.commit.message || '',
      author:
        latestCommit.commit.author?.name ||
        latestCommit.commit.committer?.name ||
        '',
    }
  } catch (error) {
    console.error(`Error fetching latest commit for ${owner}/${repo}:`, error)
    return null
  }
}

/**
 * Gets organization information for a repository
 * @returns Organization avatar URL or null
 */
export const getOrganizationInfo = async (
  installationId: number,
  owner: string,
  repo: string,
): Promise<{ avatar_url: string } | null> => {
  const octokit = await createOctokit(installationId)

  try {
    const { data } = await octokit.repos.get({
      owner,
      repo,
    })

    return {
      avatar_url: data.organization?.avatar_url || '',
    }
  } catch (error) {
    console.error(
      `Error fetching organization info for ${owner}/${repo}:`,
      error,
    )
    return null
  }
}
/**
 * Gets folder contents from a GitHub repository
 */
const getFolderContentsAsync = async (
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<GitHubContentItem[]> => {
  // For public repositories, we can use unauthenticated requests
  const octokit = new Octokit()

  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
  })

  return Array.isArray(data) ? data : [data]
}

export const getFolderContents = (
  owner: string,
  repo: string,
  path: string,
  ref: string,
): ResultAsync<GitHubContentItem[], Error> =>
  fromAsyncThrowable(getFolderContentsAsync)(owner, repo, path, ref)

/**
 * Downloads file content from a GitHub raw URL with timeout protection
 */
export const downloadFileContent = async (
  url: string,
  timeoutMs = 10000, // 10s default timeout
  maxBytes?: number, // optional per-file size cap
): Promise<string | null> => {
  const controller = new AbortController()
  let timeoutId: NodeJS.Timeout | undefined

  try {
    // Allowlist host to prevent SSRF
    const parsed = new URL(url)
    if (parsed.hostname !== 'raw.githubusercontent.com') {
      console.error(`Disallowed host for download: ${parsed.hostname}`)
      return null
    }

    // Set up timeout
    timeoutId = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    const response = await fetch(url, {
      signal: controller.signal,
    })

    // Clear timeout on successful response
    clearTimeout(timeoutId)
    timeoutId = undefined

    if (!response.ok) {
      console.error(`Failed to download file: ${response.statusText}`)
      return null
    }

    // Enforce size limit when possible
    if (typeof maxBytes === 'number') {
      const len = response.headers.get('content-length')
      if (len && Number(len) > maxBytes) {
        console.error(
          `File too large (${len} bytes). Limit: ${maxBytes} bytes for ${url}`,
        )
        return null
      }
    }

    return await response.text()
  } catch (error) {
    // Clear timeout in error case
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // Handle abort/timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Request timeout downloading file from ${url}`)
      return null
    }

    console.error(`Error downloading file from ${url}:`, error)
    return null
  }
}
