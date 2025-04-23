import { createClient } from '@/libs/db/server'

export async function getProject(projectId: string) {
  try {
    const supabase = await createClient()
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        created_at,
        organization_id,
        updated_at,
        migrations(
          id,
          title,
          migration_pull_request_mappings(
            pull_request_id,
            github_pull_requests(
              id,
              pull_number
            )
          )
        ),
        project_repository_mappings(
          github_repositories(*)
        )
      `)
      .eq('id', projectId)
      .single()

    if (error || !project) {
      console.error('Error fetching project:', error)
      return null
    }

    // Extract migrations from the new schema structure
    const migrations = project.migrations.map((migration) => {
      // Get the first pull request mapping if available
      const mapping = migration.migration_pull_request_mappings?.[0]
      const pullRequest = mapping?.github_pull_requests

      return {
        id: migration.id,
        title: migration.title,
        pullNumber: pullRequest?.pull_number || null,
      }
    })

    return {
      id: project.id,
      name: project.name,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      organizationId: project.organization_id,
      migrations,
    }
  } catch (error) {
    console.error('Error in getProject:', error)
    return null
  }
}
