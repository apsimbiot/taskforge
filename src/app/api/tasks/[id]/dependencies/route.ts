import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, lists, spaces, workspaceMembers, taskActivities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const linkDependencySchema = z.object({
  blockedTaskId: z.string().uuid(),
});

const unlinkDependencySchema = z.object({
  blockedTaskId: z.string().uuid(),
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

    // Get the full task with dependencies
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    return NextResponse.json({ 
      blockedBy: (task?.blockedBy as string[] || []), 
      blocks: (task?.blocks as string[] || []) 
    });
  } catch (error) {
    console.error("Error fetching dependencies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Link a task as blocked by another task
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
    const validatedData = linkDependencySchema.parse(body);

    const { blockedTaskId } = validatedData;

    // Verify the blocked task exists
    const blockedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, blockedTaskId),
      with: {
        list: {
          with: {
            space: true,
          },
        },
      },
    });

    if (!blockedTask) {
      return NextResponse.json({ error: "Blocked task not found" }, { status: 404 });
    }

    // Check user has access to the blocked task workspace
    const blockedMembership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, blockedTask.list.space.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!blockedMembership) {
      return NextResponse.json({ error: "Access denied to blocked task" }, { status: 403 });
    }

    // Prevent self-reference
    if (blockedTaskId === taskId) {
      return NextResponse.json({ error: "A task cannot block itself" }, { status: 400 });
    }

    // Prevent circular dependency
    const taskBlocks = (access.task.blocks as string[] || []);
    const taskBlockedBy = (access.task.blockedBy as string[] || []);
    if (taskBlocks.includes(blockedTaskId) || taskBlockedBy.includes(blockedTaskId)) {
      return NextResponse.json({ error: "Dependency already exists" }, { status: 400 });
    }

    // Update the task's blockedBy array
    const currentBlockedBy = taskBlockedBy;
    const newBlockedBy = [...currentBlockedBy, blockedTaskId];

    await db
      .update(tasks)
      .set({ blockedBy: newBlockedBy, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    // Update the blocked task's blocks array
    const currentBlocks = (blockedTask.blocks as string[] || []);
    const newBlocks = [...currentBlocks, taskId];

    await db
      .update(tasks)
      .set({ blocks: newBlocks, updatedAt: new Date() })
      .where(eq(tasks.id, blockedTaskId));

    // Log activity
    await db.insert(taskActivities).values({
      taskId,
      userId: session.user.id,
      action: "dependency_added",
      field: "blockedBy",
      newValue: blockedTaskId,
    });

    return NextResponse.json({ success: true, blockedBy: newBlockedBy });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error linking dependency:", error);
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
    const blockedTaskId = searchParams.get("blockedTaskId");

    if (!blockedTaskId) {
      return NextResponse.json({ error: "blockedTaskId is required" }, { status: 400 });
    }

    // Verify the blocked task exists
    const blockedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, blockedTaskId),
    });

    if (!blockedTask) {
      return NextResponse.json({ error: "Blocked task not found" }, { status: 404 });
    }

    // Update the task's blockedBy array
    const currentBlockedBy = (access.task.blockedBy as string[] || []);
    const newBlockedBy = currentBlockedBy.filter((id: string) => id !== blockedTaskId);

    await db
      .update(tasks)
      .set({ blockedBy: newBlockedBy, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    // Update the blocked task's blocks array
    const currentBlocks = (blockedTask.blocks as string[] || []);
    const newBlocks = currentBlocks.filter((id: string) => id !== taskId);

    await db
      .update(tasks)
      .set({ blocks: newBlocks, updatedAt: new Date() })
      .where(eq(tasks.id, blockedTaskId));

    // Log activity
    await db.insert(taskActivities).values({
      taskId,
      userId: session.user.id,
      action: "dependency_removed",
      field: "blockedBy",
      oldValue: blockedTaskId,
    });

    return NextResponse.json({ success: true, blockedBy: newBlockedBy });
  } catch (error) {
    console.error("Error unlinking dependency:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
