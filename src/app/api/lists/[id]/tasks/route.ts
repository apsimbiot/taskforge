import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, lists, spaces, workspaceMembers, taskActivities } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { runAutomations } from "@/lib/automations";

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.record(z.string(), z.unknown()).optional(),
  status: z.string().max(50).optional(),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
  dueDate: z.string().datetime().optional(),
  timeEstimate: z.number().min(0).optional(),
  order: z.number().optional(),
  parentTaskId: z.string().uuid().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: listId } = await params;

    // Get list and check access
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
      with: {
        space: true,
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, list.space.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const listTasks = await db.query.tasks.findMany({
      where: eq(tasks.listId, listId),
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

    return NextResponse.json({ tasks: listTasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
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

    const { id: listId } = await params;

    // Get list and check access
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
      with: {
        space: true,
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, list.space.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    const [task] = await db
      .insert(tasks)
      .values({
        listId,
        title: validatedData.title,
        description: validatedData.description ?? {},
        status: validatedData.status ?? "todo",
        priority: validatedData.priority ?? "none",
        creatorId: session.user.id,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        timeEstimate: validatedData.timeEstimate,
        order: validatedData.order ?? 0,
        parentTaskId: validatedData.parentTaskId,
      })
      .returning();

    // Create activity log
    await db.insert(taskActivities).values({
      taskId: task.id,
      userId: session.user.id,
      action: "created",
    });

    // Trigger automations
    try {
      await runAutomations("task_created", {
        taskId: task.id,
        workspaceId: list.space.workspaceId,
        userId: session.user.id,
      });
    } catch (err) {
      console.error("Error running automations:", err);
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
