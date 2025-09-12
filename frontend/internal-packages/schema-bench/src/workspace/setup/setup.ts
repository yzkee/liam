import * as fs from 'node:fs'
import * as path from 'node:path'
import { err, ok } from 'neverthrow'
import type { SetupResult, WorkspaceConfig } from '../types'

const createWorkspaceDirectories = (workspacePath: string): SetupResult => {
  const directories = [
    workspacePath,
    path.join(workspacePath, 'execution'),
    path.join(workspacePath, 'execution', 'input'),
    path.join(workspacePath, 'execution', 'reference'),
    path.join(workspacePath, 'execution', 'output'),
    path.join(workspacePath, 'evaluation'),
  ]

  try {
    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
    return ok(undefined)
  } catch (error) {
    return err({
      type: 'FILE_WRITE_ERROR',
      path: workspacePath,
      cause: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

const copyFilesFromDir = (sourceDir: string, targetDir: string): void => {
  if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir)
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file)
      const targetPath = path.join(targetDir, file)
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath)
      }
    }
  }
}

const copyDefaultData = (
  defaultDataPath: string,
  workspacePath: string,
): SetupResult => {
  const inputSourceDir = path.join(defaultDataPath, 'execution', 'input')
  const referenceSourceDir = path.join(
    defaultDataPath,
    'execution',
    'reference',
  )
  const readmeSourcePath = path.join(defaultDataPath, 'README.md')
  const inputTargetDir = path.join(workspacePath, 'execution', 'input')
  const referenceTargetDir = path.join(workspacePath, 'execution', 'reference')

  try {
    copyFilesFromDir(inputSourceDir, inputTargetDir)
    copyFilesFromDir(referenceSourceDir, referenceTargetDir)

    // Copy README.md if present at dataset root
    if (fs.existsSync(readmeSourcePath)) {
      const readmeTargetPath = path.join(workspacePath, 'README.md')
      if (!fs.existsSync(readmeTargetPath)) {
        fs.copyFileSync(readmeSourcePath, readmeTargetPath)
      }
    }

    return ok(undefined)
  } catch (error) {
    return err({
      type: 'FILE_READ_ERROR',
      path: defaultDataPath,
      cause: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

const validateWorkspace = (workspacePath: string): SetupResult => {
  const requiredDirectories = [
    path.join(workspacePath, 'execution', 'input'),
    path.join(workspacePath, 'execution', 'reference'),
    path.join(workspacePath, 'execution', 'output'),
    path.join(workspacePath, 'evaluation'),
  ]

  for (const dir of requiredDirectories) {
    if (!fs.existsSync(dir)) {
      return err({ type: 'DIRECTORY_NOT_FOUND', path: dir })
    }
  }

  return ok(undefined)
}

export const setupWorkspace = async (
  config: WorkspaceConfig,
): Promise<SetupResult> => {
  try {
    if (fs.existsSync(config.workspacePath)) {
      fs.rmSync(config.workspacePath, { recursive: true, force: true })
    }
  } catch (error) {
    return err({
      type: 'FILE_WRITE_ERROR',
      path: config.workspacePath,
      cause:
        error instanceof Error
          ? error.message
          : 'Failed to remove existing workspace',
    })
  }

  // Create directories
  const createResult = createWorkspaceDirectories(config.workspacePath)
  if (createResult.isErr()) {
    return createResult
  }

  // Copy default data
  const copyResult = copyDefaultData(
    config.defaultDataPath,
    config.workspacePath,
  )
  if (copyResult.isErr()) {
    return copyResult
  }

  // Validate workspace
  const validateResult = validateWorkspace(config.workspacePath)
  if (validateResult.isErr()) {
    return validateResult
  }

  return ok(undefined)
}
