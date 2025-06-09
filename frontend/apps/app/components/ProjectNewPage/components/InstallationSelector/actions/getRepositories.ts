'use server'

import type { Repository } from '@liam-hq/github'
import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import * as v from 'valibot'

const createOctokit = async (installationId: number) => {
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      installationId,
    },
  })
  return octokit
}

type GetRepositoriesState = {
  repositories: Repository[]
  loading: boolean
  error?: string
}

const FormDataSchema = v.object({
  installationId: v.pipe(v.string(), v.transform(Number)),
})

export async function getRepositories(
  _prevState: GetRepositoriesState,
  formData: FormData,
): Promise<GetRepositoriesState> {
  const rawData = {
    installationId: formData.get('installationId'),
  }

  const parseResult = v.safeParse(FormDataSchema, rawData)
  if (!parseResult.success) {
    return {
      repositories: [],
      loading: false,
      error: 'Invalid installation ID',
    }
  }

  const { installationId } = parseResult.output

  if (!installationId) {
    return { repositories: [], loading: false }
  }

  try {
    const octokit = await createOctokit(installationId)
    const { data } = await octokit.request('GET /installation/repositories', {
      per_page: 100,
    })
    return { repositories: data.repositories, loading: false }
  } catch (error) {
    console.error('Error fetching repositories:', error)
    return {
      repositories: [],
      loading: false,
      error: 'Failed to fetch repositories',
    }
  }
}
