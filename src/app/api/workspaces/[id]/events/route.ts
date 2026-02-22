import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { addConnection, removeConnection } from "@/lib/sse";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id: workspaceId } = await params;

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return new Response("Access denied", { status: 403 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Register this connection
        addConnection(workspaceId, controller);

        // Send initial connection event
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "connected", workspaceId })}\n\n`)
        );

        // Heartbeat every 30 seconds to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch {
            clearInterval(heartbeat);
          }
        }, 30000);

        // Clean up when client disconnects
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          removeConnection(workspaceId, controller);
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("SSE error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
