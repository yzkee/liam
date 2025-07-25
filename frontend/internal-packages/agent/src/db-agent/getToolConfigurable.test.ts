import type { RunnableConfig } from '@langchain/core/runnables'
import { describe, expect, it, vi } from 'vitest'
import type { Repositories } from '../repositories'
import { getToolConfigurable } from './getToolConfigurable'

describe('getToolConfigurable', () => {
  const mockRepositories: Repositories = {
    schema: {
      getSchema: vi.fn(),
      getDesignSession: vi.fn(),
      createVersion: vi.fn(),
      createTimelineItem: vi.fn(),
      updateTimelineItem: vi.fn(),
      createArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      getArtifact: vi.fn(),
      createValidationQuery: vi.fn(),
      createValidationResults: vi.fn(),
      createWorkflowRun: vi.fn(),
      updateWorkflowRunStatus: vi.fn(),
    },
  }

  const mockLogger = {
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }

  it('should successfully extract tool configuration', () => {
    const config: RunnableConfig = {
      configurable: {
        buildingSchemaId: 'test-version-id',
        latestVersionNumber: 1,
        repositories: mockRepositories,
        logger: mockLogger,
      },
    }

    const result = getToolConfigurable(config)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.buildingSchemaId).toBe('test-version-id')
      expect(result.value.repositories).toBe(mockRepositories)
    }
  })

  it('should return error when configurable object is missing', () => {
    const config: RunnableConfig = {}

    const result = getToolConfigurable(config)

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'Missing configurable object in RunnableConfig',
      )
    }
  })

  it('should return error when repositories is missing', () => {
    const config: RunnableConfig = {
      configurable: {
        buildingSchemaId: 'test-version-id',
        latestVersionNumber: 1,
        logger: mockLogger,
        // Missing repositories
      },
    }

    const result = getToolConfigurable(config)

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'Missing repositories in configurable object',
      )
    }
  })

  it('should return error when logger is missing', () => {
    const config: RunnableConfig = {
      configurable: {
        buildingSchemaId: 'test-version-id',
        latestVersionNumber: 1,
        repositories: mockRepositories,
        // Missing logger
      },
    }

    const result = getToolConfigurable(config)

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.message).toBe('Missing logger in configurable object')
    }
  })

  it('should return error when buildingSchemaId is missing', () => {
    const config: RunnableConfig = {
      configurable: {
        repositories: mockRepositories,
        logger: mockLogger,
        latestVersionNumber: 1,
        // Missing buildingSchemaId
      },
    }

    const result = getToolConfigurable(config)

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.message).toContain(
        'Invalid configurable object in RunnableConfig',
      )
    }
  })

  it('should return error when buildingSchemaId is not a string', () => {
    const config: RunnableConfig = {
      configurable: {
        buildingSchemaId: 123, // Should be string
        repositories: mockRepositories,
        logger: mockLogger,
      },
    }

    const result = getToolConfigurable(config)

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.message).toContain(
        'Invalid configurable object in RunnableConfig',
      )
    }
  })

  it('should accept empty string for buildingSchemaId', () => {
    const config: RunnableConfig = {
      configurable: {
        buildingSchemaId: '', // Empty string is valid for v.string()
        latestVersionNumber: 1,
        repositories: mockRepositories,
        logger: mockLogger,
      },
    }

    const result = getToolConfigurable(config)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.buildingSchemaId).toBe('')
    }
  })

  it('should handle additional properties in configurable object', () => {
    const config: RunnableConfig = {
      configurable: {
        buildingSchemaId: 'test-version-id',
        latestVersionNumber: 1,
        repositories: mockRepositories,
        logger: mockLogger,
        additionalProperty: 'should-be-ignored',
      },
    }

    const result = getToolConfigurable(config)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.buildingSchemaId).toBe('test-version-id')
      expect(result.value.repositories).toBe(mockRepositories)
      // Additional properties should not be included in the result
      expect('additionalProperty' in result.value).toBe(false)
    }
  })

  it('should accept string as repositories (truthy check)', () => {
    const config: RunnableConfig = {
      configurable: {
        buildingSchemaId: 'test-version-id',
        latestVersionNumber: 1,
        repositories: 'not-an-object', // Truthy value passes basic check
        logger: mockLogger,
      },
    }

    const result = getToolConfigurable(config)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.repositories).toBe('not-an-object')
    }
  })

  it('should accept string as logger (truthy check)', () => {
    const config: RunnableConfig = {
      configurable: {
        buildingSchemaId: 'test-version-id',
        latestVersionNumber: 1,
        repositories: mockRepositories,
        logger: 'not-an-object', // Truthy value passes basic check
      },
    }

    const result = getToolConfigurable(config)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.repositories).toBe(mockRepositories)
    }
  })

  it('should return error when repositories is null', () => {
    const config: RunnableConfig = {
      configurable: {
        buildingSchemaId: 'test-version-id',
        latestVersionNumber: 1,
        repositories: null, // Falsy value
        logger: mockLogger,
      },
    }

    const result = getToolConfigurable(config)

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'Missing repositories in configurable object',
      )
    }
  })

  it('should return error when logger is null', () => {
    const config: RunnableConfig = {
      configurable: {
        buildingSchemaId: 'test-version-id',
        latestVersionNumber: 1,
        repositories: mockRepositories,
        logger: null, // Falsy value
      },
    }

    const result = getToolConfigurable(config)

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.message).toBe('Missing logger in configurable object')
    }
  })
})
