import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, lists, spaces, workspaceMembers, taskActivities, taskAssignees } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { runAutomations } from "@/lib/automations";
import { autoCreateDueDateReminder } from "@/lib/reminders";
import { broadcastToWorkspace } from "@/lib/sse";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.record(z.string(), z.unknown()).optional(),
  status: z.string().max(50).optional(),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  timeEstimate: z.number().min(0).nullable().optional(),
  timeSpent: z.number().min(0).optional(),
  order: z.number().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  listId: z.string().uuid().optional(),
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

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        list: {
          columns: { id: true, name: true, spaceId: true },
          with: {
            space: {
              columns: { id: true, name: true, workspaceId: true },
            },
          },
        },
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
        comments: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: (comments, { desc }) => [desc(comments.createdAt)],
        },
        activities: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: (activities, { desc }) => [desc(activities.createdAt)],
          limit: 50,
        },
        taskLabels: {
          with: {
            label: true,
          },
        },
        timeEntries: {
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
        subtasks: {
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
          },
          orderBy: (subtasks, { asc }) => [asc(subtasks.order)],
        },
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const validatedData = updateTaskSchema.parse(body);

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority;
    if (validatedData.dueDate !== undefined) updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
    if (validatedData.timeEstimate !== undefined) updateData.timeEstimate = validatedData.timeEstimate;
    if (validatedData.timeSpent !== undefined) updateData.timeSpent = validatedData.timeSpent;
    if (validatedData.order !== undefined) updateData.order = validatedData.order;
    if (validatedData.customFields !== undefined) updateData.customFields = validatedData.customFields;
    if (validatedData.parentTaskId !== undefined) updateData.parentTaskId = validatedData.parentTaskId;
    if (validatedData.listId !== undefined) updateData.listId = validatedData.listId;

    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    // Log activity for each changed field
    const oldTask = access.task;
    const changedFields = Object.keys(validatedData) as Array<keyof typeof validatedData>;
    
    for (const field of changedFields) {
      const oldValue = String(oldTask[field as keyof typeof oldTask] ?? "");
      const newValue = String(validatedData[field] ?? "");
      
      if (oldValue !== newValue) {
        await db.insert(taskActivities).values({
          taskId,
          userId: session.user.id,
          action: "updated",
          field,
          oldValue,
          newValue,
        });
      }
    }

    // Trigger automations for status change
    if (validatedData.status && validatedData.status !== oldTask.status) {
      try {
        await runAutomations("status_change", {
          taskId,
          workspaceId: oldTask.list.space.workspaceId,
          userId: session.user.id,
          oldStatus: oldTask.status ?? undefined,
          newStatus: validatedData.status,
        });
      } catch (err) {
        console.error("Error running status_change automations:", err);
      }
    }

    // Auto-create reminder for 1 day before due date when due date is set
    if (validatedData.dueDate !== undefined) {
      const newDueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
      const oldDueDate = oldTask.dueDate ? new Date(oldTask.dueDate) : null;
      
      // Only create reminder if:
      // 1. A new due date is being set (was null, now has value)
      // 2. Or the due date is being changed to a later date
      if (newDueDate && (!oldDueDate || newDueDate.getTime() > oldDueDate.getTime())) {
        try {
          await autoCreateDueDateReminder(taskId, session.user.id, newDueDate);
        } catch (err) {
          console.error("Error creating auto-reminder:", err);
          // Don't fail the request if reminder creation fails
        }
      }
    }

    // Broadcast SSE event to workspace
    broadcastToWorkspace(oldTask.list.space.workspaceId, {
      type: "task_updated",
      data: { task: updatedTask, listId: oldTask.listId, userId: session.user.id },
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating task:", error);
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

    const workspaceId = access.task.list.space.workspaceId;
    const listId = access.task.listId;

    await db.delete(tasks).where(eq(tasks.id, taskId));

    // Broadcast SSE event to workspace
    broadcastToWorkspace(workspaceId, {
      type: "task_deleted",
      data: { taskId, listId, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
