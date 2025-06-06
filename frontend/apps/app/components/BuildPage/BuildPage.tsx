import { getOrganizationId } from '@/features/organizations/services/getOrganizationId'
import { createClient } from '@/libs/db/server'
import type { Schema } from '@liam-hq/db-structure'
import { parse } from '@liam-hq/db-structure/parser'
import type { TablesInsert } from '@liam-hq/db/supabase/database.types'
import { getFileContent } from '@liam-hq/github'
import { Panel } from './Panel'

type Props = {
  projectId: string
  branchOrCommit: string
}

async function getGithubSchemaFilePath(projectId: string) {
  const supabase = await createClient()
  const { data: gitHubSchemaFilePath, error } = await supabase
    .from('schema_file_paths')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error || !gitHubSchemaFilePath) {
    throw new Error('Schema file path not found')
  }

  return gitHubSchemaFilePath
}

async function getGithubRepositoryInfo(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      project_repository_mappings(
        github_repositories(*)
      )
    `)
    .eq('id', projectId)
    .single()

  if (error || !data) {
    throw new Error('Project not found')
  }

  const repository = data.project_repository_mappings[0]?.github_repositories
  if (!repository) {
    throw new Error('Repository not found')
  }

  return repository
}

async function createOrGetDesignSession(
  projectId: string,
  branchOrCommit: string,
) {
  const supabase = await createClient()

  // Get current user
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error('Authentication required')
  }

  // Get organization ID
  const organizationId = await getOrganizationId()
  if (!organizationId) {
    throw new Error('Organization not found')
  }

  // Create a unique name based on project, branch, and date (without time for deduplication)
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  const name = `Build Session - ${projectId} - ${branchOrCommit} - ${today}`

  // First, try to find existing session with the same name for today
  const { data: existingSession, error: findError } = await supabase
    .from('design_sessions')
    .select('*')
    .eq('project_id', projectId)
    .eq('organization_id', organizationId)
    .eq('created_by_user_id', userData.user.id)
    .eq('name', name)
    .maybeSingle()

  if (findError) {
    throw new Error('Failed to check existing design session')
  }

  // If session exists, return it
  if (existingSession) {
    return existingSession
  }

  // Create new design_session if it doesn't exist
  const designSessionData: TablesInsert<'design_sessions'> = {
    name,
    project_id: projectId,
    organization_id: organizationId,
    created_by_user_id: userData.user.id,
    parent_design_session_id: null,
  }

  const { data: designSession, error: insertError } = await supabase
    .from('design_sessions')
    .insert(designSessionData)
    .select()
    .single()

  if (insertError) {
    throw new Error('Failed to create design session')
  }

  return designSession
}

async function createOrGetBuildingSchema(
  designSessionId: string,
  schema: Schema,
  organizationId: string,
  schemaFilePath: string | null,
  gitSha: string | null,
) {
  const supabase = await createClient()

  // First, check if building_schema already exists for this design_session
  const { data: existingBuildingSchema, error: findError } = await supabase
    .from('building_schemas')
    .select('id')
    .eq('design_session_id', designSessionId)
    .maybeSingle()

  if (findError) {
    throw new Error('Failed to check existing building schema')
  }

  // If building_schema exists, return its ID
  if (existingBuildingSchema) {
    return existingBuildingSchema.id
  }

  // Create new building_schema if it doesn't exist
  const buildingSchemaData: TablesInsert<'building_schemas'> = {
    design_session_id: designSessionId,
    organization_id: organizationId,
    schema: JSON.parse(JSON.stringify(schema)),
    initial_schema_snapshot: JSON.parse(JSON.stringify(schema)),
    schema_file_path: schemaFilePath,
    git_sha: gitSha,
  }

  const { data: buildingSchema, error } = await supabase
    .from('building_schemas')
    .insert(buildingSchemaData)
    .select()
    .single()

  if (error) {
    throw new Error('Failed to create building schema')
  }

  return buildingSchema.id
}

export async function BuildPage({ projectId, branchOrCommit }: Props) {
  const [githubSchemaFilePath, repository] = await Promise.all([
    getGithubSchemaFilePath(projectId),
    getGithubRepositoryInfo(projectId),
  ])

  // Create or get existing design session
  const designSession = await createOrGetDesignSession(
    projectId,
    branchOrCommit,
  )

  const repositoryFullName = `${repository.owner}/${repository.name}`

  const { content } = await getFileContent(
    repositoryFullName,
    githubSchemaFilePath.path,
    branchOrCommit,
    Number(repository.github_installation_identifier),
  )

  const { value: schema, errors } =
    content !== null && githubSchemaFilePath.format !== undefined
      ? await parse(content, githubSchemaFilePath.format)
      : { value: undefined, errors: [] }

  if (!schema) {
    throw new Error('Schema could not be parsed')
  }

  // Get organization ID
  const organizationId = await getOrganizationId()
  if (!organizationId) {
    throw new Error('Organization not found')
  }

  // Create or get building schema
  const buildingSchemaId = await createOrGetBuildingSchema(
    designSession.id,
    schema,
    organizationId,
    githubSchemaFilePath.path,
    null, // gitSha can be added later if needed
  )

  return (
    <Panel
      schema={schema}
      errors={errors || []}
      tableGroups={{}}
      buildingSchemaId={buildingSchemaId}
      designSessionId={designSession.id}
      organizationId={organizationId}
      latestVersionNumber={0}
    />
  )
}
