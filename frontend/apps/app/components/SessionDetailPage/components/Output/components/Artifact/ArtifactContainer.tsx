'use client'

import type { FC } from 'react'
import { StructuredArtifact } from './components'
import { useRealtimeArtifact } from './hooks/useRealtimeArtifact'

type Props = {
  designSessionId: string
}

export const ArtifactContainer: FC<Props> = ({ designSessionId }) => {
  const { artifact, loading, error } = useRealtimeArtifact(designSessionId)

  if (loading) {
    return <div>Loading artifact...</div>
  }

  if (error) {
    return <div>Error loading artifact: {error.message}</div>
  }

  if (!artifact) {
    return <div>No artifact available yet</div>
  }

  return <StructuredArtifact artifact={artifact} />
}
