import type { components } from '@octokit/openapi-types'

export type Installation = components['schemas']['installation']
export type Repository = components['schemas']['repository']

export type GitHubWebhookPayload = {
  action?: string
  installation: {
    id: number
  }
  repository: {
    name: string
    owner: {
      login: string
    }
  }
  pull_request?: {
    number: number
    title: string
    head: {
      ref: string
    }
  }
}
export type GitHubRepoInfo = {
  owner: string
  repo: string
  branch: string
  path: string
}

export type GitHubContentItem = {
  type: 'file' | 'dir'
  name: string
  path: string
  download_url?: string
}
