import { awaitAllCallbacks } from '@langchain/core/callbacks/promises'
import {
  type AgentWorkflowParams,
  createSupabaseRepositories,
  deepModelingStream,
  invokeDbAgentStream,
} from '@liam-hq/agent'
import { SSE_EVENTS } from '@liam-hq/agent/client'
import * as Sentry from '@sentry/nextjs'
import { after, NextResponse } from 'next/server'
import * as v from 'valibot'
// Temporarily removed for testing after() only approach
// import { withGracefulShutdown } from '../../../../features/stream/utils/withGracefulShutdown'
// import { withTimeoutAndAbort } from '../../../../features/stream/utils/withTimeoutAndAbort'
import { createClient } from '../../../../libs/db/server'

function line(event: string, data: unknown) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data)
  return `event:${event}\ndata:${payload}\n\n`
}

// https://vercel.com/docs/functions/configuring-functions/duration#maximum-duration-for-different-runtimes
export const maxDuration = 300
// Temporarily removed for testing after() only approach
// const TIMEOUT_MS = 300000 // 300 seconds (debug)
// const GRACE_PERIOD_MS = 200000 // 200 seconds (debug)

const chatRequestSchema = v.object({
  userInput: v.pipe(v.string(), v.minLength(1, 'Message is required')),
  designSessionId: v.pipe(v.string(), v.uuid('Invalid design session ID')),
  isDeepModelingEnabled: v.optional(v.boolean(), true),
})

export async function POST(request: Request) {
  console.log('[STREAM] Starting POST request processing')
  const requestBody = await request.json()
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

  const supabase = await createClient()

  // Get current user ID from server-side auth
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    )
  }

  const userId = userData.user.id
  const designSessionId = validationResult.output.designSessionId
  const { data: designSession, error: designSessionError } = await supabase
    .from('design_sessions')
    .select('organization_id')
    .eq('id', designSessionId)
    .limit(1)
    .single()
  if (designSessionError) {
    return NextResponse.json(
      { error: 'Design Session not found' },
      { status: 404 },
    )
  }

  const organizationId = designSession.organization_id

  const { data: buildingSchema, error: buildingSchemaError } = await supabase
    .from('building_schemas')
    .select('id')
    .eq('design_session_id', designSessionId)
    .single()
  if (buildingSchemaError) {
    return NextResponse.json(
      { error: 'Building schema not found for design session' },
      { status: 404 },
    )
  }

  const { data: latestVersion, error: latestVersionError } = await supabase
    .from('building_schema_versions')
    .select('number')
    .eq('building_schema_id', buildingSchema.id)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestVersionError) {
    return NextResponse.json(
      { error: 'Error fetching latest version' },
      { status: 500 },
    )
  }
  // If no version exists yet (initial state), use 0 as the version number
  const latestVersionNumber = latestVersion?.number ?? 0

  const repositories = createSupabaseRepositories(supabase, organizationId)
  const result = await repositories.schema.getSchema(designSessionId)

  if (result.isErr()) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  const config = {
    configurable: {
      repositories,
      thread_id: designSessionId,
    },
  }

  const enc = new TextEncoder()

  const processEvents = async (
    controller: ReadableStreamDefaultController<Uint8Array>,
    signal: AbortSignal,
  ) => {
    console.log('[PROCESS] Starting processEvents with signal', { aborted: signal.aborted })

    signal.addEventListener('abort', () => {
      console.log('[PROCESS] Abort signal received in processEvents')
    })

    const params: AgentWorkflowParams = {
      userInput: validationResult.output.userInput,
      schemaData: result.value.schema,
      organizationId,
      buildingSchemaId: buildingSchema.id,
      latestVersionNumber,
      designSessionId,
      userId,
      signal,
    }

    console.log('[PROCESS] Creating agent stream')
    const events = validationResult.output.isDeepModelingEnabled
      ? await deepModelingStream(params, config)
      : await invokeDbAgentStream(params, config)

    console.log('[PROCESS] Starting event iteration')
    for await (const ev of events) {
      // Check if request was aborted during iteration
      if (signal.aborted) {
        console.log('[PROCESS] Signal aborted during event iteration')
        controller.enqueue(
          enc.encode(
            line(SSE_EVENTS.ERROR, { message: 'Request was aborted' }),
          ),
        )
        break
      }
      controller.enqueue(enc.encode(line(ev.event, ev.data)))
    }
    console.log('[PROCESS] Event iteration completed, sending END event')
    controller.enqueue(enc.encode(line(SSE_EVENTS.END, null)))
  }

  console.log('[STREAM] Creating ReadableStream')
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      console.log('[STREAM] Stream started, processing events directly (no graceful shutdown wrapper)')

      try {
        await processEvents(controller, request.signal)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.log('[STREAM] Process events failed:', error.message)
        Sentry.captureException(error, {
          tags: { designSchemaId: designSessionId },
        })

        controller.enqueue(
          enc.encode(line(SSE_EVENTS.ERROR, { message: error.message })),
        )
      }

      console.log('[STREAM] Controller closed')
      controller.close()
    },
  })

  after(async () => {
    console.log('[STREAM] Awaiting all callbacks cleanup')
    await awaitAllCallbacks()
    console.log('[STREAM] All callbacks cleanup completed')
  })

  console.log('[STREAM] Returning response with stream')
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
