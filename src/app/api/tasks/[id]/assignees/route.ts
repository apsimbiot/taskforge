import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, lists, spaces, workspaceMembers, taskAssignees, users, taskActivities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";

const addAssigneeSchema = z.object({
  userId: z.string().uuid(),
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

    const assignees = await db.query.taskAssignees.findMany({
      where: eq(taskAssignees.taskId, taskId),
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
    });

    return NextResponse.json({ assignees });
  } catch (error) {
    console.error("Error fetching assignees:", error);
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
    const validatedData = addAssigneeSchema.parse(body);

    // Check if user is a workspace member
    const userMembership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, access.task.list.space.workspaceId),
        eq(workspaceMembers.userId, validatedData.userId)
      ),
    });

    if (!userMembership) {
      return NextResponse.json({ error: "User is not a workspace member" }, { status: 400 });
    }

    // Check if already assigned
    const existing = await db.query.taskAssignees.findFirst({
      where: and(
        eq(taskAssignees.taskId, taskId),
        eq(taskAssignees.userId, validatedData.userId)
      ),
    });

    if (existing) {
      return NextResponse.json({ error: "User is already assigned to this task" }, { status: 400 });
    }

    const [assignee] = await db
      .insert(taskAssignees)
      .values({
        taskId,
        userId: validatedData.userId,
      })
      .onConflictDoNothing()
      .returning();

    // Fetch the user details
    const assignedUser = await db.query.users.findFirst({
      where: eq(users.id, validatedData.userId),
      columns: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    // Get the current user who assigned the task
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { name: true },
    });

    // Notify the assigned user
    await createNotification({
      userId: validatedData.userId,
      type: "task_assigned",
      title: `You were assigned to "${access.task.title}"`,
      message: `You have been assigned to a new task`,
      entityType: "task",
      entityId: taskId,
      taskTitle: access.task.title,
      assignedBy: currentUser?.name || "Someone",
    });

    // Log activity
    await db.insert(taskActivities).values({
      taskId,
      userId: session.user.id,
      action: "added_assignee",
      field: "assignee",
      newValue: assignedUser?.name || assignedUser?.email || "user",
    });

    return NextResponse.json({ assignee: { ...assignee, user: assignedUser } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error adding assignee:", error);
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
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Get the removed user details for activity log
    const removedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
      },
    });

    await db
      .delete(taskAssignees)
      .where(
        and(
          eq(taskAssignees.taskId, taskId),
          eq(taskAssignees.userId, userId)
        )
      );

    // Log activity
    await db.insert(taskActivities).values({
      taskId,
      userId: session.user.id,
      action: "removed_assignee",
      field: "assignee",
      oldValue: removedUser?.name || removedUser?.email || "user",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing assignee:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
