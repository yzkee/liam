import { createRepositories } from '@/utils/agentSupabaseHelper'
import { processChatMessage } from '@liam-hq/agent'
import { schemaSchema } from '@liam-hq/db-structure'
import { NextResponse } from 'next/server'
import * as v from 'valibot'

const chatRequestSchema = v.object({
  message: v.pipe(v.string(), v.minLength(1, 'Message is required')),
  schemaData: schemaSchema,
  history: v.array(v.tuple([v.string(), v.string()])),
  organizationId: v.string(),
  buildingSchemaId: v.string(),
  latestVersionNumber: v.number(),
  designSessionId: v.pipe(v.string(), v.uuid('Invalid design session ID')),
  userId: v.pipe(v.string(), v.uuid('Invalid user ID')),
})

export async function POST(request: Request) {
  const requestBody = await request.json()

  // Input validation using Valibot safeParse
  const validationResult = v.safeParse(chatRequestSchema, requestBody)

  if (!validationResult.success) {
    const errorMessage = validationResult.issues
      .map((issue) => issue.message)
      .join(', ')
    return NextResponse.json(
      { error: `Validation error: ${errorMessage}` },
      { status: 400 },
    )
  }

  const repositories = await createRepositories()

  const result = await processChatMessage({
    ...validationResult.output,
    repositories,
  })

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Processing failed' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
  })
}
