import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sprintTasks, sprints } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

const moveTaskSchema = z.object({
  fromSprintId: z.string().uuid(),
  toSprintId: z.string().uuid(),
  taskId: z.string().uuid(),
})

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { fromSprintId, toSprintId, taskId } = moveTaskSchema.parse(body)

    // Remove from old sprint first
    await db
      .delete(sprintTasks)
      .where(
        and(
          eq(sprintTasks.sprintId, fromSprintId),
          eq(sprintTasks.taskId, taskId)
        )
      )

    // Add to new sprint (if not already there)
    await db
      .insert(sprintTasks)
      .values({
        sprintId: toSprintId,
        taskId,
      })
      .onConflictDoNothing()

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error moving task between sprints:", error)
    return NextResponse.json(
      { error: "Failed to move task" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sprintId, taskId } = body

    if (!sprintId || !taskId) {
      return NextResponse.json(
        { error: "Sprint ID and Task ID are required" },
        { status: 400 }
      )
    }

    // Check if sprint exists
    const sprint = await db
      .select()
      .from(sprints)
      .where(eq(sprints.id, sprintId))
      .then((rows) => rows[0])

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 })
    }

    // Add task to sprint
    await db
      .insert(sprintTasks)
      .values({
        sprintId,
        taskId,
      })
      .onConflictDoNothing()

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Error adding task to sprint:", error)
    return NextResponse.json(
      { error: "Failed to add task to sprint" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sprintId = searchParams.get("sprintId")
    const taskId = searchParams.get("taskId")

    if (!sprintId || !taskId) {
      return NextResponse.json(
        { error: "Sprint ID and Task ID are required" },
        { status: 400 }
      )
    }

    await db
      .delete(sprintTasks)
      .where(
        and(
          eq(sprintTasks.sprintId, sprintId),
          eq(sprintTasks.taskId, taskId)
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing task from sprint:", error)
    return NextResponse.json(
      { error: "Failed to remove task from sprint" },
      { status: 500 }
    )
  }
}
