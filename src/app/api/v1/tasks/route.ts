import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, lists, spaces, workspaceMembers, taskActivities, taskAssignees } from "@/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api-auth";
import { z } from "zod";
import { runAutomations } from "@/lib/automations";

const createTaskSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.record(z.string(), z.unknown()).optional(),
  status: z.string().max(50).optional(),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  timeEstimate: z.number().min(0).optional(),
  order: z.number().optional(),
  parentTaskId: z.string().uuid().optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
});

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

// GET /api/v1/tasks - List tasks (with filters)
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const listId = searchParams.get("list_id");
    const spaceId = searchParams.get("space_id");
    const workspaceId = searchParams.get("workspace_id");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let queryTasks;

    if (listId) {
      const list = await db.query.lists.findFirst({
        where: eq(lists.id, listId),
        with: { space: true },
      });

      if (!list) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
      }

      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, list.space.workspaceId),
          eq(workspaceMembers.userId, auth.userId)
        ),
      });

      if (!membership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const conditions: any[] = [eq(tasks.listId, listId)];
      if (status) conditions.push(eq(tasks.status, status));
      if (priority) conditions.push(eq(tasks.priority, priority));

      queryTasks = await db.query.tasks.findMany({
        where: and(...conditions),
        orderBy: [asc(tasks.order)],
        limit,
        offset,
        with: {
          assignees: {
            with: {
              user: { columns: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
          creator: { columns: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });
    } else if (spaceId) {
      const space = await db.query.spaces.findFirst({ where: eq(spaces.id, spaceId) });
      if (!space) return NextResponse.json({ error: "Space not found" }, { status: 404 });

      const membership = await db.query.workspaceMembers.findFirst({
        where: and(eq(workspaceMembers.workspaceId, space.workspaceId), eq(workspaceMembers.userId, auth.userId)),
      });
      if (!membership) return NextResponse.json({ error: "Access denied" }, { status: 403 });

      const spaceLists = await db.query.lists.findMany({ where: eq(lists.spaceId, spaceId) });
      const listIds = spaceLists.map((l) => l.id);
      if (listIds.length === 0) return NextResponse.json({ tasks: [] });

      const conditions: any[] = [inArray(tasks.listId, listIds)];
      if (status) conditions.push(eq(tasks.status, status));
      if (priority) conditions.push(eq(tasks.priority, priority));

      queryTasks = await db.query.tasks.findMany({
        where: and(...conditions),
        orderBy: [asc(tasks.order)],
        limit,
        offset,
        with: {
          assignees: { with: { user: { columns: { id: true, name: true, email: true, avatarUrl: true } } } },
          creator: { columns: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });
    } else if (workspaceId) {
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, auth.userId)),
      });
      if (!membership) return NextResponse.json({ error: "Access denied" }, { status: 403 });

      const workspaceSpaces = await db.query.spaces.findMany({ where: eq(spaces.workspaceId, workspaceId) });
      const spaceIds = workspaceSpaces.map((s) => s.id);
      if (spaceIds.length === 0) return NextResponse.json({ tasks: [] });

      const workspaceLists = await db.query.lists.findMany({ where: inArray(lists.spaceId, spaceIds) });
      const listIds = workspaceLists.map((l) => l.id);
      if (listIds.length === 0) return NextResponse.json({ tasks: [] });

      const conditions: any[] = [inArray(tasks.listId, listIds)];
      if (status) conditions.push(eq(tasks.status, status));
      if (priority) conditions.push(eq(tasks.priority, priority));

      queryTasks = await db.query.tasks.findMany({
        where: and(...conditions),
        orderBy: [asc(tasks.order)],
        limit,
        offset,
        with: {
          assignees: { with: { user: { columns: { id: true, name: true, email: true, avatarUrl: true } } } },
          creator: { columns: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });
    } else {
      if (auth.workspaceIds.length === 0) return NextResponse.json({ tasks: [] });

      const workspaceSpaces = await db.query.spaces.findMany({ where: inArray(spaces.workspaceId, auth.workspaceIds) });
      const spaceIds = workspaceSpaces.map((s) => s.id);
      if (spaceIds.length === 0) return NextResponse.json({ tasks: [] });

      const workspaceLists = await db.query.lists.findMany({ where: inArray(lists.spaceId, spaceIds) });
      const listIds = workspaceLists.map((l) => l.id);
      if (listIds.length === 0) return NextResponse.json({ tasks: [] });

      const conditions: any[] = [inArray(tasks.listId, listIds)];
      if (status) conditions.push(eq(tasks.status, status));
      if (priority) conditions.push(eq(tasks.priority, priority));

      queryTasks = await db.query.tasks.findMany({
        where: and(...conditions),
        orderBy: [asc(tasks.order)],
        limit,
        offset,
        with: {
          assignees: { with: { user: { columns: { id: true, name: true, email: true, avatarUrl: true } } } },
          creator: { columns: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });
    }

    return NextResponse.json({ tasks: queryTasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/v1/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Verify list exists and user has access
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, validatedData.listId),
      with: { space: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, list.space.workspaceId),
        eq(workspaceMembers.userId, auth.userId)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [task] = await db
      .insert(tasks)
      .values({
        listId: validatedData.listId,
        title: validatedData.title,
        description: validatedData.description ?? {},
        status: validatedData.status ?? "todo",
        priority: validatedData.priority ?? "none",
        creatorId: auth.userId,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        timeEstimate: validatedData.timeEstimate,
        order: validatedData.order ?? 0,
        parentTaskId: validatedData.parentTaskId,
      })
      .returning();

    // Add assignees if provided
    if (validatedData.assigneeIds && validatedData.assigneeIds.length > 0) {
      const assigneeRecords = validatedData.assigneeIds.map((userId) => ({
        taskId: task.id,
        userId,
      }));
      await db.insert(taskAssignees).values(assigneeRecords);
    }

    // Create activity log
    await db.insert(taskActivities).values({
      taskId: task.id,
      userId: auth.userId,
      action: "created",
    });

    // Trigger automations
    try {
      await runAutomations("task_created", {
        taskId: task.id,
        workspaceId: list.space.workspaceId,
        userId: auth.userId,
      });
    } catch (err) {
      console.error("Error running automations:", err);
    }

    // Fetch the created task with relations
    const createdTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, task.id),
      with: {
        assignees: { with: { user: { columns: { id: true, name: true, email: true, avatarUrl: true } } } },
        creator: { columns: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ task: createdTask }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
