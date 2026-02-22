import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { sprints, workspaceMembers, sprintTasks, tasks, lists, spaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const addTaskSchema = z.object({
  taskId: z.string().uuid(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sprintId } = await params;

    // Get sprint
    const sprint = await db.query.sprints.findFirst({
      where: eq(sprints.id, sprintId),
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, sprint.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = addTaskSchema.parse(body);

    // Verify task exists
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, validatedData.taskId),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if task is already in sprint
    const existingRelation = await db.query.sprintTasks.findFirst({
      where: and(
        eq(sprintTasks.sprintId, sprintId),
        eq(sprintTasks.taskId, validatedData.taskId)
      ),
    });

    if (existingRelation) {
      return NextResponse.json({ error: "Task already in sprint" }, { status: 400 });
    }

    // Add task to sprint
    await db.insert(sprintTasks).values({
      sprintId,
      taskId: validatedData.taskId,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error adding task to sprint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
