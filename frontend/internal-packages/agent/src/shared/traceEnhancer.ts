import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { Result } from 'neverthrow'

/**
 * Environment information for enhanced tracing
 */
type TraceEnvironmentInfo = {
  // Runtime Context
  runtime: {
    name: string
    version: string
    platform: string
    arch: string
  }

  // Environment Context
  environment: {
    name: string
    region?: string | undefined
    nodeEnv?: string | undefined
  }

  // Developer Context
  developer: {
    username: string
    hostname: string
    timezone: string
  }

  // Application Context
  app: {
    memory_usage: NodeJS.MemoryUsage
    uptime: number
    pid: number
  }

  // Git Context
  git: {
    branch: string
    commit: string
    dirty: boolean
  }

  // Performance Context
  performance: {
    cpu_usage: NodeJS.CpuUsage
    memory_heap_used: number
    memory_heap_total: number
  }
}

/**
 * LangGraph specific trace metadata
 */
type LangGraphTraceMetadata = {
  langgraph: {
    version: string
    execution_id: string
    workflow_run_id?: string | undefined
    graph_name?: string | undefined
  }
}

/**
 * Get current Git branch safely using Result type
 */
const getCurrentBranch = (): Result<string, Error> => {
  return Result.fromThrowable(
    () => {
      return execSync('git branch --show-current', {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
    },
    (error) => new Error(`Failed to get git branch: ${String(error)}`),
  )()
}

/**
 * Get current Git commit hash safely using Result type
 */
const getCurrentCommit = (): Result<string, Error> => {
  return Result.fromThrowable(
    () => {
      return execSync('git rev-parse HEAD', {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .trim()
        .slice(0, 8)
    },
    (error) => new Error(`Failed to get git commit: ${String(error)}`),
  )()
}

/**
 * Check if Git working directory is dirty using Result type
 */
const isGitDirty = (): Result<boolean, Error> => {
  return Result.fromThrowable(
    () => {
      const status = execSync('git status --porcelain', {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
      return status.length > 0
    },
    (error) => new Error(`Failed to check git status: ${String(error)}`),
  )()
}

/**
 * Get LangGraph version from package.json using Result type
 */
const getLangGraphVersion = (): Result<string, Error> => {
  return Result.fromThrowable(
    () => {
      const packageJsonPath = path.resolve(__dirname, '../../package.json')
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8')
      const packageJson: { dependencies?: Record<string, string> } =
        JSON.parse(packageJsonContent)
      return packageJson.dependencies?.['@langchain/langgraph'] ?? 'unknown'
    },
    (error) => new Error(`Failed to get LangGraph version: ${String(error)}`),
  )()
}

/**
 * Collect all environment information
 */
const collectEnvironmentInfo = (): TraceEnvironmentInfo => {
  const memoryUsage = process.memoryUsage()
  const cpuUsage = process.cpuUsage()

  return {
    runtime: {
      name: 'node',
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    environment: {
      name: process.env['NODE_ENV'] || 'development',
      region: process.env['VERCEL_REGION'] || process.env['AWS_REGION'],
      nodeEnv: process.env['NODE_ENV'],
    },
    developer: {
      username: process.env['USER'] || process.env['USERNAME'] || 'unknown',
      hostname: os.hostname(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    app: {
      memory_usage: memoryUsage,
      uptime: process.uptime(),
      pid: process.pid,
    },
    git: {
      branch: getCurrentBranch().unwrapOr('unknown'),
      commit: getCurrentCommit().unwrapOr('unknown'),
      dirty: isGitDirty().unwrapOr(false),
    },
    performance: {
      cpu_usage: cpuUsage,
      memory_heap_used: memoryUsage.heapUsed,
      memory_heap_total: memoryUsage.heapTotal,
    },
  }
}

/**
 * Generate environment-based tags
 */
const generateEnvironmentTags = (): string[] => {
  const envInfo = collectEnvironmentInfo()

  return [
    `environment:${envInfo.environment.name}`,
    `runtime:${envInfo.runtime.name}_${envInfo.runtime.version}`,
    `platform:${envInfo.runtime.platform}`,
    `developer:${envInfo.developer.username}`,
    `git_branch:${envInfo.git.branch}`,
    'langgraph',
  ].filter((tag) => !tag.includes('unknown'))
}

/**
 * Create enhanced trace data with environment context
 */
export const createEnhancedTraceData = (
  workflowRunId?: string,
  graphName?: string,
  additionalTags: string[] = [],
  additionalMetadata: Record<string, unknown> = {},
): { tags: string[]; metadata: Record<string, unknown> } => {
  const environmentInfo = collectEnvironmentInfo()
  const environmentTags = generateEnvironmentTags()

  const langGraphMetadata: LangGraphTraceMetadata = {
    langgraph: {
      version: getLangGraphVersion().unwrapOr('unknown'),
      execution_id: randomUUID(),
      workflow_run_id: workflowRunId,
      graph_name: graphName,
    },
  }

  // Combine all tags
  const allTags = [
    ...environmentTags,
    ...additionalTags,
    ...(graphName ? [`graph:${graphName}`] : []),
  ]

  // Combine all metadata
  const allMetadata = {
    ...environmentInfo,
    ...langGraphMetadata,
    ...additionalMetadata,
  }

  return {
    tags: allTags,
    metadata: allMetadata,
  }
}
