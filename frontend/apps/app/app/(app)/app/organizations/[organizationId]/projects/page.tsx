import type { PageProps } from '@/app/types'
import { ProjectsPage } from '@/features/projects/pages'
import { migrationFlag } from '@/libs'
import { createClient } from '@/libs/db/server'
import { notFound } from 'next/navigation'
import React from 'react'
import * as v from 'valibot'

const paramsSchema = v.object({
  organizationId: v.string(),
})

export default async function Page({ params }: PageProps) {
  const parsedParams = v.safeParse(paramsSchema, await params)
  if (!parsedParams.success) return notFound()
  const { organizationId } = parsedParams.output

  const migrationEnabled = await migrationFlag()

  if (!migrationEnabled) {
    notFound()
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()

  if (data.session === null) {
    return notFound()
  }

  const { data: organizationMembers, error: orgError } = await supabase
    .from('OrganizationMember')
    .select('id')
    .eq('userId', data.session.user.id)
    .eq('organizationId', Number.parseInt(organizationId, 10))
    .eq('status', 'ACTIVE')
    .limit(1)

  if (orgError) {
    console.error('Error fetching organization members:', orgError)
  }

  if (!organizationMembers || organizationMembers.length === 0) {
    return notFound()
  }

  return <ProjectsPage organizationId={Number.parseInt(organizationId, 10)} />
}
