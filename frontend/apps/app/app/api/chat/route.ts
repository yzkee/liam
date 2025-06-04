import { processChatMessage } from '@/lib/chat/chatProcessor'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { message, schemaData, history, mode, organizationId } =
    await request.json()

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

  // Create a ReadableStream for streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        // Process the chat message with streaming
        for await (const chunk of processChatMessage({
          message,
          schemaData,
          history,
          mode,
          organizationId,
        })) {
          if (chunk.type === 'text') {
            // Encode and enqueue the text chunk
            controller.enqueue(encoder.encode(chunk.content))
          } else if (chunk.type === 'error') {
            // Handle error by closing the stream
            controller.error(new Error(chunk.content))
            return
          }
        }

        // Close the stream when done
        controller.close()
      } catch (error) {
        // Handle any unexpected errors
        controller.error(error)
      }
    },
  })

  // Return streaming response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
