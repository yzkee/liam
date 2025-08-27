import { fromPromise } from 'neverthrow'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import {
  disablePublicShare,
  enablePublicShare,
} from '@/features/public-share/actions'

type UsePublicShareServerActionProps = {
  designSessionId: string
  initialIsPublic: boolean
}

export const usePublicShareServerAction = ({
  designSessionId,
  initialIsPublic = false,
}: UsePublicShareServerActionProps) => {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [isPending, startTransition] = useTransition()
  const isPublicRef = useRef(initialIsPublic)

  // Reset state when designSessionId or initialIsPublic changes
  useEffect(() => {
    setIsPublic(initialIsPublic)
    isPublicRef.current = initialIsPublic
  }, [designSessionId, initialIsPublic])

  // Keep ref in sync with state after commit
  useEffect(() => {
    isPublicRef.current = isPublic
  }, [isPublic])

  const togglePublicShare = useCallback(async (): Promise<
    { success: true; isPublic: boolean } | { success: false; error: string }
  > => {
    const currentIsPublic = isPublicRef.current

    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await fromPromise(
          currentIsPublic
            ? disablePublicShare(designSessionId)
            : enablePublicShare(designSessionId),
          (error) => ({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to update sharing settings',
          }),
        )

        const finalResult = result.match(
          (data) => {
            if (data.success) {
              setIsPublic(data.isPublic ?? !currentIsPublic)
              return {
                success: true as const,
                isPublic: data.isPublic ?? !currentIsPublic,
              }
            }
            return {
              success: false as const,
              error: data.error || 'Unknown error',
            }
          },
          (errorData) => ({
            success: false as const,
            error: errorData.error,
          }),
        )

        resolve(finalResult)
      })
    })
  }, [designSessionId])

  return {
    isPublic,
    loading: isPending,
    togglePublicShare,
  }
}
