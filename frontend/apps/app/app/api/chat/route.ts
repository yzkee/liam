import { processChatMessage } from '@liam-hq/agent'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const {
    message,
    schemaData,
    history,
    organizationId,
    buildingSchemaId,
    latestVersionNumber = 0,
  } = await request.json()

  // Input validation
  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  if (!schemaData || typeof schemaData !== 'object') {
    return NextResponse.json(
      { error: 'Valid schema data is required' },
      { status: 400 },
    )
  }

  try {
    // Process the chat message
    const result = await processChatMessage({
      message,
      schemaData,
      history,
      organizationId,
      buildingSchemaId,
      latestVersionNumber,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Processing failed' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      text: result.text,
      success: true,
    })
  } catch (error) {
    console.error('Chat processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
