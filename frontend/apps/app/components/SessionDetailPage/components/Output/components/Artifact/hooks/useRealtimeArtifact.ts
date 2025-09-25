'use client'

import { type Artifact, artifactSchema } from '@liam-hq/artifact'
import { useCallback, useEffect, useState } from 'react'
import * as v from 'valibot'
import { createClient } from '../../../../../../../libs/db/client'
import { useViewMode } from '../../../../../hooks/viewMode'

const artifactDataSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  design_session_id: v.pipe(v.string(), v.uuid()),
  artifact: artifactSchema,
  created_at: v.string(),
  updated_at: v.string(),
})

type Params = {
  designSessionId: string
  initialArtifact: Artifact | null
  onChangeArtifact?: (artifact: Artifact) => void
}

export function useRealtimeArtifact({
  designSessionId,
  initialArtifact,
  onChangeArtifact,
}: Params) {
  const { isPublic } = useViewMode()
  const [artifact, setArtifact] = useState<Artifact | null>(initialArtifact)
  const [error, setError] = useState<Error | null>(null)

  const handleError = useCallback((err: unknown) => {
    setError(
      err instanceof Error ? err : new Error('Artifact processing failed'),
    )
  }, [])

  // Set up realtime subscription
  useEffect(() => {
    // Skip realtime subscription for public view
    if (isPublic) return

    const supabase = createClient()

    const channel = supabase
      .channel(`artifacts:${designSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'artifacts',
          filter: `design_session_id=eq.${designSessionId}`,
        },
        (payload) => {
          try {
            if (payload.eventType === 'DELETE') {
              setArtifact(null)
              return
            }

            const validatedData = v.parse(artifactDataSchema, payload.new)
            setArtifact(validatedData.artifact)
            onChangeArtifact?.(validatedData.artifact)
          } catch (error) {
            handleError(error)
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          handleError(new Error('Artifact realtime subscription failed'))
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [designSessionId, handleError, isPublic, onChangeArtifact])

  return {
    artifact,
    error,
  }
}
