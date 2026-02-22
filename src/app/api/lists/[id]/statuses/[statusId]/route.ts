import { NextResponse } from "next/server"
import { db } from "@/db"
import { statuses, tasks } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; statusId: string }> }
) {
  try {
    const { id: listId, statusId } = await params
    const body = await request.json()
    const { name, color, order } = body

    // Check if status exists
    const existingStatus = await db
      .select()
      .from(statuses)
      .where(and(eq(statuses.id, statusId), eq(statuses.listId, listId)))
      .limit(1)

    if (existingStatus.length === 0) {
      return NextResponse.json(
        { error: "Status not found" },
        { status: 404 }
      )
    }

    // Check for unique name if name is being updated
    if (name && name !== existingStatus[0].name) {
      const duplicateStatus = await db
        .select()
        .from(statuses)
        .where(and(eq(statuses.listId, listId), eq(statuses.name, name)))
        .limit(1)

      if (duplicateStatus.length > 0) {
        return NextResponse.json(
          { error: "Status name must be unique within this list" },
          { status: 400 }
        )
      }
    }

    const [updatedStatus] = await db
      .update(statuses)
      .set({
        ...(name && { name }),
        ...(color && { color }),
        ...(order !== undefined && { order }),
      })
      .where(and(eq(statuses.id, statusId), eq(statuses.listId, listId)))
      .returning()

    return NextResponse.json({ status: updatedStatus })
  } catch (error) {
    console.error("Error updating status:", error)
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; statusId: string }> }
) {
  try {
    const { id: listId, statusId } = await params

    // Check if status exists
    const existingStatus = await db
      .select()
      .from(statuses)
      .where(and(eq(statuses.id, statusId), eq(statuses.listId, listId)))
      .limit(1)

    if (existingStatus.length === 0) {
      return NextResponse.json(
        { error: "Status not found" },
        { status: 404 }
      )
    }

    // Check if there are tasks with this status
    const tasksWithStatus = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.listId, listId))
      .limit(1)

    // If there are tasks, we need to find another status to move them to
    if (tasksWithStatus.length > 0) {
      // Get remaining statuses
      const remainingStatuses = await db
        .select()
        .from(statuses)
        .where(eq(statuses.listId, listId))
        .orderBy(statuses.order)

      // Filter out the status being deleted
      const otherStatuses = remainingStatuses.filter(s => s.id !== statusId)
      
      if (otherStatuses.length > 0) {
        // Move tasks to the first remaining status
        const firstStatus = otherStatuses[0]
        const normalizedStatus = firstStatus.name.toLowerCase().replace(/\s+/g, "_")
        
        await db
          .update(tasks)
          .set({ status: normalizedStatus })
          .where(and(eq(tasks.listId, listId), eq(tasks.status, existingStatus[0].name.toLowerCase().replace(/\s+/g, "_"))))
      }
    }

    // Delete the status
    await db
      .delete(statuses)
      .where(and(eq(statuses.id, statusId), eq(statuses.listId, listId)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting status:", error)
    return NextResponse.json(
      { error: "Failed to delete status" },
      { status: 500 }
    )
  }
}
