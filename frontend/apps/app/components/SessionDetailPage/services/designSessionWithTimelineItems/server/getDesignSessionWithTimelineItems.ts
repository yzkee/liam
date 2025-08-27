'use server'

import { ResultAsync } from 'neverthrow'
import { createClient } from '@/libs/db/server'
import type { DesignSessionWithTimelineItems } from '../../../types'
import { fetchDesignSessionWithTimelineItems } from '../fetchDesignSessionWithTimelineItems'

export function getDesignSessionWithTimelineItems(
  designSessionId: string,
): ResultAsync<DesignSessionWithTimelineItems, Error> {
  return ResultAsync.fromSafePromise(createClient()).andThen((supabase) =>
    fetchDesignSessionWithTimelineItems(supabase, designSessionId),
  )
}
