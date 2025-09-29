import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  fetchSchemaFromGitHubFolder,
  isGitHubFolderUrl,
  parseGitHubFolderUrl,
} from './githubUrlHandler'

// Setup MSW server
const server = setupServer()

describe('githubUrlHandler', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('isGitHubFolderUrl', () => {
    it('should return true for GitHub folder URLs', () => {
      const validUrls = [
        'https://github.com/user/repo/tree/main/schemas',
        'https://github.com/user/repo/tree/develop/db',
        'https://github.com/user/repo/tree/feature/migrations',
      ]

      for (const url of validUrls) {
        expect(isGitHubFolderUrl(url)).toBe(true)
      }
    })

    it('should return false for non-GitHub folder URLs', () => {
      const invalidUrls = [
        'https://github.com/user/repo/blob/main/schema.sql',
        'https://example.com/folder',
        'not-a-url',
        'https://github.com/user/repo',
      ]

      for (const url of invalidUrls) {
        expect(isGitHubFolderUrl(url)).toBe(false)
      }
    })
  })

  describe('parseGitHubFolderUrl', () => {
    it('should parse valid GitHub folder URLs', () => {
      const url = 'https://github.com/user/repo/tree/main/schemas/db'
      const result = parseGitHubFolderUrl(url)

      expect(result).toEqual({
        owner: 'user',
        repo: 'repo',
        branch: 'main',
        path: 'schemas/db',
      })
    })

    it('should return null for invalid URLs', () => {
      const invalidUrls = [
        'https://github.com/user/repo/blob/main/file.sql',
        'https://github.com/user/repo/tree/', // Missing branch
        'invalid-url',
      ]

      for (const url of invalidUrls) {
        expect(parseGitHubFolderUrl(url)).toBeNull()
      }
    })
  })

  describe('fetchSchemaFromGitHubFolder', () => {
    it('should fetch and combine schema files from GitHub folder', async () => {
      const url = 'https://github.com/user/repo/tree/main/schemas'

      // Mock GitHub API response
      const mockApiResponse = [
        {
          type: 'file',
          name: 'users.sql',
          path: 'schemas/users.sql',
          download_url:
            'https://raw.githubusercontent.com/user/repo/main/schemas/users.sql',
        },
        {
          type: 'file',
          name: 'posts.sql',
          path: 'schemas/posts.sql',
          download_url:
            'https://raw.githubusercontent.com/user/repo/main/schemas/posts.sql',
        },
        {
          type: 'file',
          name: 'README.md',
          path: 'schemas/README.md',
          download_url:
            'https://raw.githubusercontent.com/user/repo/main/schemas/README.md',
        },
      ]

      const mockUsersSql = 'CREATE TABLE users (id INT PRIMARY KEY);'
      const mockPostsSql = 'CREATE TABLE posts (id INT PRIMARY KEY);'

      // Setup MSW handlers for this test
      server.use(
        http.get(
          'https://api.github.com/repos/user/repo/contents/schemas',
          () => {
            return HttpResponse.json(mockApiResponse)
          },
        ),
        http.get(
          'https://raw.githubusercontent.com/user/repo/main/schemas/users.sql',
          () => {
            return HttpResponse.text(mockUsersSql)
          },
        ),
        http.get(
          'https://raw.githubusercontent.com/user/repo/main/schemas/posts.sql',
          () => {
            return HttpResponse.text(mockPostsSql)
          },
        ),
      )

      const result = await fetchSchemaFromGitHubFolder(url)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.content).toBe(
          `\n// --- File 1 ---\n${mockUsersSql}\n\n\n// --- File 2 ---\n${mockPostsSql}`,
        )
        expect(result.value.detectedFormat).toBe('postgres')
      }
    })

    it('should return error for invalid URL', async () => {
      const result = await fetchSchemaFromGitHubFolder('invalid-url')

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error?.message).toBe('Invalid GitHub folder URL format')
      }
    })

    it('should handle GitHub API errors', async () => {
      const url = 'https://github.com/user/repo/tree/main/nonexistent'

      server.use(
        http.get(
          'https://api.github.com/repos/user/repo/contents/nonexistent',
          () => {
            return HttpResponse.text('Not Found', { status: 404 })
          },
        ),
      )

      const result = await fetchSchemaFromGitHubFolder(url)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toContain('No schema files found')
      }
    })

    it('should return error when no schema files found', async () => {
      const url = 'https://github.com/user/repo/tree/main/docs'

      const mockApiResponse = [
        {
          type: 'file',
          name: 'README.md',
          path: 'docs/README.md',
          download_url:
            'https://raw.githubusercontent.com/user/repo/main/docs/README.md',
        },
      ]

      server.use(
        http.get('https://api.github.com/repos/user/repo/contents/docs', () => {
          return HttpResponse.json(mockApiResponse)
        }),
      )

      const result = await fetchSchemaFromGitHubFolder(url)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'No schema files found in the specified folder',
        )
      }
    })

    it('should skip excluded files like index.ts', async () => {
      const url = 'https://github.com/user/repo/tree/main/schemas'

      const mockApiResponse = [
        {
          type: 'file',
          name: 'index.ts',
          path: 'schemas/index.ts',
          download_url:
            'https://raw.githubusercontent.com/user/repo/main/schemas/index.ts',
        },
        {
          type: 'file',
          name: 'schema.sql',
          path: 'schemas/schema.sql',
          download_url:
            'https://raw.githubusercontent.com/user/repo/main/schemas/schema.sql',
        },
      ]

      const mockSchemaSql = 'CREATE TABLE test (id INT);'

      server.use(
        http.get(
          'https://api.github.com/repos/user/repo/contents/schemas',
          () => {
            return HttpResponse.json(mockApiResponse)
          },
        ),
        http.get(
          'https://raw.githubusercontent.com/user/repo/main/schemas/schema.sql',
          () => {
            return HttpResponse.text(mockSchemaSql)
          },
        ),
      )

      const result = await fetchSchemaFromGitHubFolder(url)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.content).not.toContain('export')
        expect(result.value.content).toContain('CREATE TABLE test')
      }
    })

    it('should detect format from multiple file types', async () => {
      const url = 'https://github.com/user/repo/tree/main/schemas'

      const mockApiResponse = [
        {
          type: 'file',
          name: 'user.prisma',
          path: 'schemas/user.prisma',
          download_url:
            'https://raw.githubusercontent.com/user/repo/main/schemas/user.prisma',
        },
        {
          type: 'file',
          name: 'post.sql',
          path: 'schemas/post.sql',
          download_url:
            'https://raw.githubusercontent.com/user/repo/main/schemas/post.sql',
        },
      ]

      server.use(
        http.get(
          'https://api.github.com/repos/user/repo/contents/schemas',
          () => {
            return HttpResponse.json(mockApiResponse)
          },
        ),
        http.get(
          'https://raw.githubusercontent.com/user/repo/main/schemas/user.prisma',
          () => {
            return HttpResponse.text('model User {}')
          },
        ),
        http.get(
          'https://raw.githubusercontent.com/user/repo/main/schemas/post.sql',
          () => {
            return HttpResponse.text('CREATE TABLE posts')
          },
        ),
      )

      const result = await fetchSchemaFromGitHubFolder(url)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.detectedFormat).toBe('prisma') // Prisma has higher priority
      }
    })

    it('should recursively process subdirectories', async () => {
      const url = 'https://github.com/user/repo/tree/main/db'

      // Mock parent folder response
      const mockParentResponse = [
        {
          type: 'file',
          name: 'schema.sql',
          path: 'db/schema.sql',
          download_url:
            'https://raw.githubusercontent.com/user/repo/main/db/schema.sql',
        },
        { type: 'dir', name: 'migrations', path: 'db/migrations' },
      ]

      // Mock subdirectory response
      const mockSubdirResponse = [
        {
          type: 'file',
          name: '001_init.sql',
          path: 'db/migrations/001_init.sql',
          download_url:
            'https://raw.githubusercontent.com/user/repo/main/db/migrations/001_init.sql',
        },
      ]

      server.use(
        // First handler for parent directory
        http.get(
          'https://api.github.com/repos/user/repo/contents/db',
          ({ request }) => {
            const url = new URL(request.url)
            // Check if this is the parent directory request (no subdirectory in path)
            if (!url.pathname.includes('migrations')) {
              return HttpResponse.json(mockParentResponse)
            }
            return HttpResponse.json([])
          },
        ),
        // Second handler for subdirectory with URL-encoded path
        http.get(
          'https://api.github.com/repos/user/repo/contents/db%2Fmigrations',
          () => {
            return HttpResponse.json(mockSubdirResponse)
          },
        ),
        http.get(
          'https://raw.githubusercontent.com/user/repo/main/db/schema.sql',
          () => {
            return HttpResponse.text('CREATE TABLE users')
          },
        ),
        http.get(
          'https://raw.githubusercontent.com/user/repo/main/db/migrations/001_init.sql',
          () => {
            return HttpResponse.text('CREATE TABLE migrations')
          },
        ),
      )

      const result = await fetchSchemaFromGitHubFolder(url)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.content).toContain('CREATE TABLE users')
        expect(result.value.content).toContain('CREATE TABLE migrations')
      }
    })
  })
})
