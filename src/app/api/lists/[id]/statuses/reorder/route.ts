import { NextResponse } from "next/server"
import { db } from "@/db"
import { statuses } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params
    const body = await request.json()
    const { statusIds } = body

    if (!statusIds || !Array.isArray(statusIds)) {
      return NextResponse.json(
        { error: "statusIds array is required" },
        { status: 400 }
      )
    }

    // Update order for each status
    for (let i = 0; i < statusIds.length; i++) {
      const statusId = statusIds[i]
      await db
        .update(statuses)
        .set({ order: i })
        .where(and(eq(statuses.id, statusId), eq(statuses.listId, listId)))
    }

    // Fetch and return updated statuses
    const updatedStatuses = await db
      .select()
      .from(statuses)
      .where(eq(statuses.listId, listId))
      .orderBy(statuses.order)

    return NextResponse.json({ statuses: updatedStatuses })
  } catch (error) {
    console.error("Error reordering statuses:", error)
    return NextResponse.json(
      { error: "Failed to reorder statuses" },
      { status: 500 }
    )
  }
}
