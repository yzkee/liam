'use client'

import { useToast } from '@liam-hq/ui'
import { type FC, useCallback } from 'react'
import {
  AvatarWithImage,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from '@/components'
import { ArrowRight } from '@/icons'
import { createClient } from '@/libs/db/client'

type Props = {
  avatarUrl: string
}

export const UserDropdown: FC<Props> = ({ avatarUrl }) => {
  const toast = useToast()

  const handleLogout = useCallback(async () => {
    // Show loading toast immediately
    toast({
      title: 'Logging out...',
      description: 'Please wait while we log you out.',
      status: 'info',
    })

    // Perform logout on client side
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (!error) {
      // Redirect with success parameter
      window.location.href = '/app/login?logout=success'
    } else {
      toast({
        title: 'Logout failed',
        description: error.message || 'An error occurred during logout.',
        status: 'error',
      })
    }
  }, [toast])

  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger asChild>
        <AvatarWithImage src={avatarUrl} alt="User profile" size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" sideOffset={5}>
          <DropdownMenuItem leftIcon={<ArrowRight />} onClick={handleLogout}>
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  )
}
