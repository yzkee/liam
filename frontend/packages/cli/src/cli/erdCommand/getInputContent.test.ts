import fs from 'node:fs'
import { glob } from 'glob'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getInputContent } from './getInputContent.js'

vi.mock('node:fs')
vi.mock('node:https')
vi.mock('glob')

describe('getInputContent', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should read local file content when given a valid file path', async () => {
    const mockFilePath = '/path/to/local/file.txt'
    const mockFileContent = 'Local file content'

    vi.mocked(glob).mockImplementation(async (pattern) => {
      if (pattern === mockFilePath) {
        return [mockFilePath]
      }
      return []
    })
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockFileContent)

    const content = await getInputContent(mockFilePath)

    expect(content).toBe(mockFileContent)
  })

  it('should throw an error if the local file path is invalid', async () => {
    const mockFilePath = '/invalid/path/to/file.txt'

    vi.mocked(glob).mockImplementation(async (pattern) => {
      if (pattern === mockFilePath) {
        return [mockFilePath]
      }
      return []
    })
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)

    await expect(getInputContent(mockFilePath)).rejects.toThrow(
      'File not found: /invalid/path/to/file.txt',
    )
  })

  it('should download raw content from GitHub when given a GitHub blob URL', async () => {
    const mockGitHubUrl = 'https://github.com/user/repo/blob/main/file.txt'
    const mockRawUrl =
      'https://raw.githubusercontent.com/user/repo/main/file.txt'
    const mockGitHubContent = 'GitHub raw file content'

    const mockFetch = vi
      .spyOn(global, 'fetch')
      .mockImplementation(
        async () => new Response(mockGitHubContent, { status: 200 }),
      )

    const content = await getInputContent(mockGitHubUrl)

    expect(content).toBe(mockGitHubContent)
    expect(mockFetch).toHaveBeenCalledWith(mockRawUrl)
  })

  it('should download content from a regular URL', async () => {
    const mockUrl = 'https://example.com/file.txt'
    const mockUrlContent = 'Regular URL file content'

    const mockFetch = vi
      .spyOn(global, 'fetch')
      .mockImplementation(
        async () => new Response(mockUrlContent, { status: 200 }),
      )

    const content = await getInputContent(mockUrl)

    expect(content).toBe(mockUrlContent)
    expect(mockFetch).toHaveBeenCalledWith(mockUrl)
  })

  it('should throw an error when file download fails', async () => {
    const mockUrl = 'https://example.com/file.txt'

    vi.spyOn(global, 'fetch').mockImplementation(
      async () => new Response('', { status: 404, statusText: 'Not Found' }),
    )

    await expect(getInputContent(mockUrl)).rejects.toThrow(
      'Failed to download file: Not Found',
    )
  })

  it('should read and combine multiple files when given a glob pattern', async () => {
    const mockFiles = ['/path/to/file1.sql', '/path/to/file2.sql']
    const mockContents = ['Content of file 1', 'Content of file 2']

    vi.mocked(glob).mockImplementation(async (pattern) => {
      if (pattern === '/path/to/*.sql') {
        return mockFiles
      }
      return []
    })
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync')
      .mockReturnValueOnce(mockContents[0])
      .mockReturnValueOnce(mockContents[1])

    const content = await getInputContent('/path/to/*.sql')

    expect(content).toBe(mockContents.join('\n'))
    expect(glob).toHaveBeenCalledWith('/path/to/*.sql')
  })

  it('should throw an error if any matched file does not exist', async () => {
    const mockFiles = ['/path/to/file1.sql', '/path/to/nonexistent.sql']
    vi.mocked(glob).mockImplementation(async (pattern) => {
      if (pattern === '*.sql') {
        return mockFiles
      }
      return []
    })
    vi.spyOn(fs, 'existsSync')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
    vi.spyOn(fs, 'readFileSync').mockReturnValueOnce('file1 content')

    await expect(getInputContent('*.sql')).rejects.toThrow(
      'File not found: /path/to/nonexistent.sql',
    )
  })

  it('should throw an error if no files match the glob pattern', async () => {
    vi.mocked(glob).mockImplementation(async () => [])

    await expect(getInputContent('*.nonexistent')).rejects.toThrow(
      'No files found matching the pattern. Please provide valid file(s).',
    )
  })
})
