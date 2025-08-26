'use server'

import type { Result } from 'neverthrow'
import { createClient } from '@/libs/db/server'
import type { DesignSessionWithTimelineItems } from '../../../types'
import { fetchDesignSessionWithTimelineItems } from '../fetchDesignSessionWithTimelineItems'

export async function getDesignSessionWithTimelineItems(
  designSessionId: string,
): Promise<Result<DesignSessionWithTimelineItems | null, string>> {
  const supabase = await createClient()

  return await fetchDesignSessionWithTimelineItems(supabase, designSessionId)
}
