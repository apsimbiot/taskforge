import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { taskLabels, labels, tasks, workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const addLabelSchema = z.object({
  labelId: z.string().uuid("Invalid label ID"),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;

    // Get the task to check workspace access
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        list: {
          with: {
            space: {
              with: {
                workspace: {
                  with: {
                    members: {
                      where: eq(workspaceMembers.userId, session.user.id),
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const workspace = task.list?.space?.workspace;
    if (!workspace || workspace.members.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get labels for this task
    const taskLabelRelations = await db.query.taskLabels.findMany({
      where: eq(taskLabels.taskId, taskId),
      with: {
        label: true,
      },
    });

    const taskLabelsList = taskLabelRelations.map((tl) => tl.label);

    return NextResponse.json({ labels: taskLabelsList });
  } catch (error) {
    console.error("Error fetching task labels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;

    // Get the task to check workspace access
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        list: {
          with: {
            space: {
              with: {
                workspace: {
                  with: {
                    members: {
                      where: eq(workspaceMembers.userId, session.user.id),
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const workspace = task.list?.space?.workspace;
    if (!workspace || workspace.members.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = addLabelSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { labelId } = validationResult.data;

    // Verify the label belongs to the same workspace
    const label = await db.query.labels.findFirst({
      where: and(
        eq(labels.id, labelId),
        eq(labels.workspaceId, workspace.id)
      ),
    });

    if (!label) {
      return NextResponse.json(
        { error: "Label not found in this workspace" },
        { status: 404 }
      );
    }

    // Check if already assigned
    const existingRelation = await db.query.taskLabels.findFirst({
      where: and(
        eq(taskLabels.taskId, taskId),
        eq(taskLabels.labelId, labelId)
      ),
    });

    if (existingRelation) {
      return NextResponse.json(
        { error: "Label already assigned to this task" },
        { status: 409 }
      );
    }

    // Add the label to the task
    await db.insert(taskLabels).values({
      taskId,
      labelId,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error adding label to task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const { searchParams } = new URL(request.url);
    const labelId = searchParams.get("labelId");

    if (!labelId) {
      return NextResponse.json(
        { error: "labelId query parameter is required" },
        { status: 400 }
      );
    }

    // Get the task to check workspace access
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        list: {
          with: {
            space: {
              with: {
                workspace: {
                  with: {
                    members: {
                      where: eq(workspaceMembers.userId, session.user.id),
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const workspace = task.list?.space?.workspace;
    if (!workspace || workspace.members.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if the relation exists
    const existingRelation = await db.query.taskLabels.findFirst({
      where: and(
        eq(taskLabels.taskId, taskId),
        eq(taskLabels.labelId, labelId)
      ),
    });

    if (!existingRelation) {
      return NextResponse.json(
        { error: "Label not assigned to this task" },
        { status: 404 }
      );
    }

    // Remove the label from the task
    await db.delete(taskLabels).where(
      and(
        eq(taskLabels.taskId, taskId),
        eq(taskLabels.labelId, labelId)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing label from task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
