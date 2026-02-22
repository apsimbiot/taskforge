import { NextRequest } from "next/server"
import { auth } from "@/auth"

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const userId = session.user.id

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`event: connected\ndata: {"userId":"${userId}"}\n\n`))

      // For now, we'll simulate SSE with a keepalive
      // In production, you'd connect to a pub/sub system like Redis
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`))
        } catch {
          // Stream closed
          clearInterval(interval)
        }
      }, 30000)

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
