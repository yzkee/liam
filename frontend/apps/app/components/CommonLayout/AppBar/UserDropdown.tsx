'use client'

import { Avatar, LogOut, useToast } from '@liam-hq/ui'
import { useRouter } from 'next/navigation'
import { type FC, useCallback } from 'react'
import {
  AvatarWithImage,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from '@/components'
import { createClient } from '@/libs/db/client'

type Props = {
  avatarUrl?: string | null
  userName?: string
  userEmail?: string
}

// Helper function to delete cookie
const deleteCookie = (name: string) => {
  const expires = 'Thu, 01 Jan 1970 00:00:00 UTC'
  const cookie = `${name}=; expires=${expires}; path=/;`
  // biome-ignore lint/suspicious/noDocumentCookie: Required for cookie deletion
  document.cookie = cookie
}

export const UserDropdown: FC<Props> = ({ avatarUrl, userName, userEmail }) => {
  const toast = useToast()
  const router = useRouter()

  const userInitial = userName
    ? userName
        .split(' ')
        .filter((name) => name.trim().length > 0)
        .map((name) => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'
    : userEmail
      ? userEmail.charAt(0).toUpperCase()
      : 'U'

  const handleLogout = useCallback(async () => {
    // Perform logout on client side
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (!error) {
      // Delete organizationId cookie
      deleteCookie('organizationId')

      // Redirect with success parameter
      router.push('/app/login?logout=success')
    } else {
      toast({
        title: 'Logout failed',
        description: error.message || 'An error occurred during logout.',
        status: 'error',
      })
    }
  }, [toast, router])

  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger asChild>
        {avatarUrl ? (
          <AvatarWithImage src={avatarUrl} alt="User profile" size="sm" />
        ) : (
          <Avatar initial={userInitial} size="sm" user="you" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" sideOffset={5}>
          <DropdownMenuItem leftIcon={<LogOut />} onClick={handleLogout}>
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  )
}
