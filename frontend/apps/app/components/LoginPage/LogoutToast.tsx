'use client'

import { useToast } from '@liam-hq/ui'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export function LogoutToast() {
  const toast = useToast()
  const searchParams = useSearchParams()

  useEffect(() => {
    const logoutStatus = searchParams.get('logout')
    if (logoutStatus === 'success') {
      toast({
        title: 'Logged out successfully',
        description: 'You have been logged out.',
        status: 'success',
      })

      // Clean up the URL to remove the logout parameter
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams, toast])

  return null
}
