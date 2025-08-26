import { err, ok, type Result } from 'neverthrow'
import { createClient } from '@/libs/db/server'
import { getOrganizationIdFromCookie } from './getOrganizationIdFromCookie'

export async function getOrganizationId(): Promise<
  Result<string | null, string>
> {
  const storedOrganizationId = await getOrganizationIdFromCookie()

  if (storedOrganizationId !== null && storedOrganizationId !== '') {
    return ok(storedOrganizationId)
  }

  const supabase = await createClient()
  const authUser = await supabase.auth.getUser()

  if (authUser.error) {
    return err(`Authentication failed: ${authUser.error.message}`)
  }

  const { data: organizationMember, error: organizationMemberError } =
    await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', authUser.data.user.id)
      .limit(1)
      .maybeSingle()

  if (organizationMemberError) {
    return err(
      `Failed to fetch organization member data: ${organizationMemberError.message}`,
    )
  }

  return ok(organizationMember?.organization_id ?? null)
}
