'use server'

import { generateOrganizationNameFromUser } from '../../../features/organizations/services/generateOrganizationNameFromUser'
import { setOrganizationIdCookie } from '../../../features/organizations/services/setOrganizationIdCookie'
import { createClient } from '../../../libs/db/server'
// TODO: move to /features/organizations/services directory
import { createOrganization } from '../../OrganizationNewPage/actions/createOrganizations'

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Temporary debug logging increases complexity
export async function ensureUserHasOrganization() {
  const supabase = await createClient()

  // Check if user has an organization and create one if they don't
  const { data: userData, error: getUserError } = await supabase.auth.getUser()
  // biome-ignore lint/suspicious/noConsole: Temporary debug logging
  console.warn('[ensureUserHasOrganization] User check:', {
    hasUser: !!userData?.user,
    userId: userData?.user?.id,
    userEmail: userData?.user?.email,
    error: getUserError?.message,
  })

  if (userData?.user) {
    const { data: organizationMembers, error: orgMembersError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userData.user.id)
      .limit(1)

    // biome-ignore lint/suspicious/noConsole: Temporary debug logging
    console.warn('[ensureUserHasOrganization] Organization membership check:', {
      hasMembers: !!organizationMembers && organizationMembers.length > 0,
      membersCount: organizationMembers?.length,
      error: orgMembersError?.message,
    })

    // Auto-create organization if user doesn't have one
    if (!organizationMembers || organizationMembers.length === 0) {
      const organizationName = await generateOrganizationNameFromUser()
      // biome-ignore lint/suspicious/noConsole: Temporary debug logging
      console.warn(
        '[ensureUserHasOrganization] Generated organization name:',
        organizationName,
      )

      if (organizationName) {
        // biome-ignore lint/suspicious/noConsole: Temporary debug logging
        console.warn('[ensureUserHasOrganization] Creating organization...')
        const result = await createOrganization(organizationName)
        // biome-ignore lint/suspicious/noConsole: Temporary debug logging
        console.warn(
          '[ensureUserHasOrganization] Organization creation result:',
          {
            success: result.success,
            organizationId: result.success ? result.organizationId : undefined,
            error: !result.success ? result.error : undefined,
          },
        )

        if (result.success) {
          await setOrganizationIdCookie(result.organizationId)
          // biome-ignore lint/suspicious/noConsole: Temporary debug logging
          console.warn('[ensureUserHasOrganization] Organization ID cookie set')
        }
      }
    } else {
      // biome-ignore lint/suspicious/noConsole: Temporary debug logging
      console.warn('[ensureUserHasOrganization] User already has organization')
    }
  } else {
    // biome-ignore lint/suspicious/noConsole: Temporary debug logging
    console.warn(
      '[ensureUserHasOrganization] No user found, skipping organization creation',
    )
  }
}
