'use server'

import { createClient } from '@/libs/db/server'

type CreateOrganizationAutoResult =
  | { success: true; organizationId: string }
  | { success: false; error: string }

export async function createOrganizationAuto(): Promise<CreateOrganizationAutoResult> {
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    console.error('Error getting user:', userError)
    return { success: false, error: 'Failed to get user information' }
  }

  let username = ''
  if (userData.user.user_metadata?.full_name) {
    username = userData.user.user_metadata.full_name
  } else if (userData.user.user_metadata?.name) {
    username = userData.user.user_metadata.name
  } else if (userData.user.email) {
    username = userData.user.email.split('@')[0]
  } else {
    username = 'User'
  }

  const organizationName = `${username}'s Organization`

  let counter = 1
  let finalName = organizationName

  while (true) {
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', finalName)
      .limit(1)

    if (!existingOrg || existingOrg.length === 0) {
      break
    }

    counter++
    finalName = `${organizationName} ${counter}`
  }

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: finalName })
    .select('id')
    .single()

  if (orgError) {
    console.error('Error creating organization:', orgError)
    return { success: false, error: 'Failed to create organization' }
  }

  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      user_id: userData.user.id,
      organization_id: organization.id,
    })

  if (memberError) {
    console.error('Error adding user to organization:', memberError)
    return { success: false, error: 'Failed to add user to organization' }
  }

  return {
    success: true,
    organizationId: organization.id,
  }
}
