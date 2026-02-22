import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, lists, spaces, workspaceMembers, taskActivities } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const createSubtaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.record(z.string(), z.unknown()).optional(),
  status: z.string().max(50).optional(),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
  dueDate: z.string().datetime().optional(),
  timeEstimate: z.number().min(0).optional(),
  order: z.number().optional(),
});

async function checkTaskAccess(taskId: string, userId: string) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      list: {
        with: {
          space: true,
        },
      },
    },
  });

  if (!task) return null;

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, task.list.space.workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });

  if (!membership) return null;

  return { task, membership };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const access = await checkTaskAccess(taskId, session.user.id);

    if (!access) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    const subtasks = await db.query.tasks.findMany({
      where: eq(tasks.parentTaskId, taskId),
      orderBy: [asc(tasks.order)],
      with: {
        assignees: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ subtasks });
  } catch (error) {
    console.error("Error fetching subtasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const access = await checkTaskAccess(taskId, session.user.id);

    if (!access) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createSubtaskSchema.parse(body);

    const [subtask] = await db
      .insert(tasks)
      .values({
        listId: access.task.listId,
        title: validatedData.title,
        description: validatedData.description ?? {},
        status: validatedData.status ?? "todo",
        priority: validatedData.priority ?? "none",
        creatorId: session.user.id,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        timeEstimate: validatedData.timeEstimate,
        order: validatedData.order ?? 0,
        parentTaskId: taskId,
      })
      .returning();

    // Create activity log
    await db.insert(taskActivities).values({
      taskId,
      userId: session.user.id,
      action: "subtask_created",
      newValue: subtask.id,
    });

    return NextResponse.json({ subtask }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating subtask:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const access = await checkTaskAccess(taskId, session.user.id);

    if (!access) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const subtaskId = searchParams.get("subtaskId");

    if (!subtaskId) {
      return NextResponse.json({ error: "subtaskId is required" }, { status: 400 });
    }

    // Verify subtask belongs to this task
    const subtask = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, subtaskId),
        eq(tasks.parentTaskId, taskId)
      ),
    });

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    await db.delete(tasks).where(eq(tasks.id, subtaskId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subtask:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
