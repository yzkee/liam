import {
  Button,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  useToast,
} from '@liam-hq/ui'
import { type FC, useCallback } from 'react'
import { clickLogEvent } from '@/features/gtm/utils'
import { useVersionOrThrow } from '@/providers'

export const CopyLinkButton: FC = () => {
  const toast = useToast()
  const { version } = useVersionOrThrow()
  const handleCopyUrl = useCallback(() => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        toast({
          title: 'Link copied!',
          status: 'success',
        })
      })
      .catch((err) => {
        console.error(err)
        toast({
          title: 'URL copy failed',
          status: 'error',
        })
      })

    clickLogEvent({
      element: 'copyLinkButton',
      platform: version.displayedOn,
      ver: version.version,
      gitHash: version.gitHash,
      appEnv: version.envName,
    })
  }, [toast, version])

  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <Button
            data-testid="copy-link"
            variant="solid-primary"
            size="md"
            onClick={handleCopyUrl}
          >
            Copy Link
          </Button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent sideOffset={4}>Copy current URL</TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </TooltipProvider>
  )
}
