import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, lists, spaces, workspaceMembers, taskComments, taskAssignees, taskActivities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { createNotification, notifyMentions } from "@/lib/notifications";

const createCommentSchema = z.object({
  content: z.string().min(1),
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

    const comments = await db.query.taskComments.findMany({
      where: eq(taskComments.taskId, taskId),
      orderBy: [desc(taskComments.createdAt)],
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

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
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
    const validatedData = createCommentSchema.parse(body);

    const [comment] = await db
      .insert(taskComments)
      .values({
        taskId,
        userId: session.user.id,
        content: validatedData.content,
      })
      .returning();

    // Log activity
    await db.insert(taskActivities).values({
      taskId,
      userId: session.user.id,
      action: "added_comment",
      field: "comment",
      newValue: validatedData.content.substring(0, 100) || "comment",
    });

    // Fetch user details
    const commentWithUser = await db.query.taskComments.findFirst({
      where: eq(taskComments.id, comment.id),
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

    // Notify task assignees about the new comment (except the commenter)
    const taskAssigneesList = await db.query.taskAssignees.findMany({
      where: eq(taskAssignees.taskId, taskId),
    });

    for (const assignee of taskAssigneesList) {
      if (assignee.userId !== session.user.id) {
        await createNotification({
          userId: assignee.userId,
          type: "comment_added",
          title: `New comment on "${access.task.title}"`,
          message: `${commentWithUser?.user?.name || "Someone"} commented on a task you're assigned to`,
          entityType: "task",
          entityId: taskId,
        });
      }
    }

    // Also notify the task creator if they're not the commenter and not already notified
    if (access.task.creatorId !== session.user.id) {
      const alreadyNotified = taskAssigneesList.some(a => a.userId === access.task.creatorId);
      if (!alreadyNotified) {
        await createNotification({
          userId: access.task.creatorId,
          type: "comment_added",
          title: `New comment on "${access.task.title}"`,
          message: `${commentWithUser?.user?.name || "Someone"} commented on your task`,
          entityType: "task",
          entityId: taskId,
        });
      }
    }

    // Handle @mentions
    await notifyMentions(validatedData.content, session.user.id, "task", taskId);

    return NextResponse.json({ comment: commentWithUser }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating comment:", error);
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
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json({ error: "commentId is required" }, { status: 400 });
    }

    // Verify comment belongs to this task and user owns it (or is admin)
    const comment = await db.query.taskComments.findFirst({
      where: and(
        eq(taskComments.id, commentId),
        eq(taskComments.taskId, taskId)
      ),
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Allow deletion if user owns the comment or is the task creator
    if (comment.userId !== session.user.id && access.task.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized to delete this comment" }, { status: 403 });
    }

    await db.delete(taskComments).where(eq(taskComments.id, commentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
