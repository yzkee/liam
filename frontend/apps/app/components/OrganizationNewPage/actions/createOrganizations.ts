'use server'

import { createClient } from '../../../libs/db/server'

type CreateOrganizationResult =
  | { success: true; organizationId: string }
  | { success: false; error: string }

export async function createOrganization(
  name: string,
): Promise<CreateOrganizationResult> {
  const supabase = await createClient()

  // Debug: Log the current authentication state
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // biome-ignore lint/suspicious/noConsole: Temporary debug logging
  console.warn('[createOrganization] Auth state:', {
    hasSession: !!session,
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    sessionRole: session?.user?.role,
  })

  // NOTE: Since we are using the insert method of the Supabase client, we are not performing checks such as string length validation.
  // We should consider implementing constraints on the DB side using triggers, but this is not yet implemented as requirements are not finalized.
  // NOTE: We should consider using transactions for inserting both organization and organization_members.
  // However, if the organization insert fails, the organization_members insert will not be performed, so this is not a critical issue.

  // Create the organization
  // biome-ignore lint/suspicious/noConsole: Temporary debug logging
  console.warn('[createOrganization] Attempting to insert organization:', {
    name,
  })
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({ name })
    .select('id')
    .single()

  if (orgError) {
    // biome-ignore lint/suspicious/noConsole: Temporary debug logging
    console.error('[createOrganization] Error creating organization:', {
      error: orgError.message,
      code: orgError.code,
      details: orgError.details,
      hint: orgError.hint,
    })
    return { success: false, error: 'Failed to create organization' }
  }

  // biome-ignore lint/suspicious/noConsole: Temporary debug logging
  console.warn('[createOrganization] Organization created successfully:', {
    organizationId: organization.id,
  })

  // Get the current user
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    // biome-ignore lint/suspicious/noConsole: Temporary debug logging
    console.error('[createOrganization] Error getting user:', {
      error: userError.message,
      code: userError.code,
    })
    return { success: false, error: 'Failed to get user information' }
  }

  // Add the user to the organization
  // biome-ignore lint/suspicious/noConsole: Temporary debug logging
  console.warn('[createOrganization] Adding user to organization:', {
    userId: userData.user.id,
    organizationId: organization.id,
  })
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      user_id: userData.user.id,
      organization_id: organization.id,
    })

  if (memberError) {
    // biome-ignore lint/suspicious/noConsole: Temporary debug logging
    console.error('[createOrganization] Error adding user to organization:', {
      error: memberError.message,
      code: memberError.code,
      details: memberError.details,
    })
    return { success: false, error: 'Failed to add user to organization' }
  }

  // biome-ignore lint/suspicious/noConsole: Temporary debug logging
  console.warn('[createOrganization] User successfully added to organization')

  return {
    success: true,
    organizationId: organization.id,
  }
}
