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

const copyInputFilesWithNormalization = (
  inputSourceDir: string,
  inputTargetDir: string,
): void => {
  if (!fs.existsSync(inputSourceDir)) return
  const inputFiles = fs.readdirSync(inputSourceDir)
  for (const file of inputFiles) {
    const sourcePath = path.join(inputSourceDir, file)
    const targetPath = path.join(inputTargetDir, file)
    if (fs.existsSync(targetPath)) continue

    const content = fs.readFileSync(sourcePath, 'utf-8')
    try {
      const parsed = JSON.parse(content)
      if (typeof parsed === 'string') {
        const wrappedContent = JSON.stringify({ input: parsed }, null, 2)
        fs.writeFileSync(targetPath, wrappedContent)
      } else {
        fs.copyFileSync(sourcePath, targetPath)
      }
    } catch {
      fs.copyFileSync(sourcePath, targetPath)
    }
  }
}

const copyReferenceFiles = (
  referenceSourceDir: string,
  referenceTargetDir: string,
): void => {
  if (!fs.existsSync(referenceSourceDir)) return
  const referenceFiles = fs.readdirSync(referenceSourceDir)
  for (const file of referenceFiles) {
    const sourcePath = path.join(referenceSourceDir, file)
    const targetPath = path.join(referenceTargetDir, file)
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath)
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
  const inputTargetDir = path.join(workspacePath, 'execution', 'input')
  const referenceTargetDir = path.join(workspacePath, 'execution', 'reference')

  try {
    copyInputFilesWithNormalization(inputSourceDir, inputTargetDir)
    copyReferenceFiles(referenceSourceDir, referenceTargetDir)
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
