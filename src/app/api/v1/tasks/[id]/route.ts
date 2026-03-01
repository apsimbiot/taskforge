import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, lists, spaces, workspaceMembers, taskActivities, taskAssignees } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api-auth";
import { z } from "zod";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.record(z.string(), z.unknown()).optional(),
  status: z.string().max(50).optional(),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  timeEstimate: z.number().min(0).optional().nullable(),
  order: z.number().optional(),
  parentTaskId: z.string().uuid().optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).optional(),
});

// GET /api/v1/tasks/:id - Get a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const { id: taskId } = await params;

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        list: {
          with: {
            space: true,
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
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        activities: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check workspace access
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, task.list.space.workspaceId),
        eq(workspaceMembers.userId, auth.userId)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied to this task" },
        { status: 403 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/tasks/:id - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const { id: taskId } = await params;

    // Get the task to check access
    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        list: {
          with: {
            space: true,
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check workspace access
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, existingTask.list.space.workspaceId),
        eq(workspaceMembers.userId, auth.userId)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied to this task" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    // Build update values
    const updateValues: any = {
      updatedAt: new Date(),
    };

    if (validatedData.title !== undefined) updateValues.title = validatedData.title;
    if (validatedData.description !== undefined) updateValues.description = validatedData.description;
    if (validatedData.status !== undefined) updateValues.status = validatedData.status;
    if (validatedData.priority !== undefined) updateValues.priority = validatedData.priority;
    if (validatedData.dueDate !== undefined) {
      updateValues.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
    }
    if (validatedData.timeEstimate !== undefined) updateValues.timeEstimate = validatedData.timeEstimate;
    if (validatedData.order !== undefined) updateValues.order = validatedData.order;
    if (validatedData.parentTaskId !== undefined) updateValues.parentTaskId = validatedData.parentTaskId;

    // Update the task
    const [updatedTask] = await db
      .update(tasks)
      .set(updateValues)
      .where(eq(tasks.id, taskId))
      .returning();

    // Handle assignees update if provided
    if (validatedData.assigneeIds !== undefined) {
      // Remove existing assignees
      await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
      
      // Add new assignees
      if (validatedData.assigneeIds.length > 0) {
        const assigneeRecords = validatedData.assigneeIds.map((userId) => ({
          taskId: taskId,
          userId,
        }));
        await db.insert(taskAssignees).values(assigneeRecords);
      }
    }

    // Create activity log for changes
    const changes: string[] = [];
    if (validatedData.status && validatedData.status !== existingTask.status) {
      changes.push(`status: ${existingTask.status} → ${validatedData.status}`);
    }
    if (validatedData.priority && validatedData.priority !== existingTask.priority) {
      changes.push(`priority: ${existingTask.priority} → ${validatedData.priority}`);
    }
    if (validatedData.title && validatedData.title !== existingTask.title) {
      changes.push(`title changed`);
    }

    if (changes.length > 0) {
      await db.insert(taskActivities).values({
        taskId: taskId,
        userId: auth.userId,
        action: "updated",
        field: changes.join(", "),
      });
    }

    // Fetch the updated task with relations
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
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

    return NextResponse.json({ task });
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

// DELETE /api/v1/tasks/:id - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const { id: taskId } = await params;

    // First get the task to check workspace access
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

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check workspace access
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, task.list.space.workspaceId),
        eq(workspaceMembers.userId, auth.userId)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied to this task" },
        { status: 403 }
      );
    }

    await db.delete(tasks).where(eq(tasks.id, taskId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
