import type { PageProps } from '@/app/types'
import { SessionDetailPage } from '@/components/SessionDetailPage'
import * as v from 'valibot'
import { fetchDesignSessionData } from './services/fetchDesignSessionData'

const paramsSchema = v.object({
  id: v.string(),
})

export default async function Page({ params }: PageProps) {
  const parsedParams = v.safeParse(paramsSchema, await params)
  if (!parsedParams.success) throw new Error('Invalid parameters')

  const designSessionId = parsedParams.output.id

  // Fetch design session data and schema data in parallel
  const designSessionData = await fetchDesignSessionData(designSessionId)

  if (!designSessionData) {
    throw new Error('Design session not found')
  }

  return (
    <SessionDetailPage
      designSession={{
        id: designSessionId,
        organizationId: designSessionData.organization_id,
      }}
    />
  )
}
