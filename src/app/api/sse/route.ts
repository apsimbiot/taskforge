import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { addConnection, removeConnection, type SSEEvent } from "@/lib/sse"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const userId = session.user.id
  const workspaceId = request.nextUrl.searchParams.get("workspaceId")

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // Register connection if workspaceId is provided
      if (workspaceId) {
        addConnection(workspaceId, controller)
      }
      
      // Send initial connection message
      controller.enqueue(encoder.encode(`event: connected\ndata: {"userId":"${userId}","workspaceId":"${workspaceId || ""}"}\n\n`))

      // Keepalive every 30 seconds
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
        if (workspaceId) {
          removeConnection(workspaceId, controller)
        }
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
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  })
}
