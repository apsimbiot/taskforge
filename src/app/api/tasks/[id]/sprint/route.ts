import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { sprintTasks, sprints, tasks, workspaceMembers, lists, spaces, taskActivities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const assignSprintSchema = z.object({
  sprintId: z.string().uuid(),
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

    // Query sprintTasks where taskId = id, join with sprints table
    const sprintTaskRelations = await db
      .select({
        sprintId: sprintTasks.sprintId,
        sprintName: sprints.name,
        sprintStatus: sprints.status,
        sprintStartDate: sprints.startDate,
        sprintEndDate: sprints.endDate,
      })
      .from(sprintTasks)
      .innerJoin(sprints, eq(sprintTasks.sprintId, sprints.id))
      .where(eq(sprintTasks.taskId, taskId));

    const sprintsData = sprintTaskRelations.map((st) => ({
      id: st.sprintId,
      name: st.sprintName,
      status: st.sprintStatus,
      startDate: st.sprintStartDate?.toISOString() || "",
      endDate: st.sprintEndDate?.toISOString() || "",
    }));

    return NextResponse.json({ sprints: sprintsData });
  } catch (error) {
    console.error("Error fetching task sprint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const validatedData = assignSprintSchema.parse(body);
    const { sprintId } = validatedData;

    // Verify the sprint exists and belongs to the same workspace
    const sprint = await db.query.sprints.findFirst({
      where: eq(sprints.id, sprintId),
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Verify sprint is in the same workspace
    if (sprint.workspaceId !== access.task.list.space.workspaceId) {
      return NextResponse.json({ error: "Sprint must be in the same workspace as the task" }, { status: 400 });
    }

    // Delete all existing sprintTasks entries for this taskId (move semantics)
    await db.delete(sprintTasks).where(eq(sprintTasks.taskId, taskId));

    // Insert new sprintTasks entry with (sprintId, taskId)
    await db.insert(sprintTasks).values({
      sprintId,
      taskId,
    });

    // Log activity
    await db.insert(taskActivities).values({
      taskId,
      userId: session.user.id,
      action: "updated",
      field: "sprint",
      newValue: sprint.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error assigning task to sprint:", error);
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

    // Get current sprint name before deleting
    const currentSprint = await db
      .select({
        sprintId: sprintTasks.sprintId,
        sprintName: sprints.name,
      })
      .from(sprintTasks)
      .innerJoin(sprints, eq(sprintTasks.sprintId, sprints.id))
      .where(eq(sprintTasks.taskId, taskId))
      .limit(1);

    const sprintName = currentSprint[0]?.sprintName || "sprint";

    // Delete all sprintTasks entries for this taskId
    await db.delete(sprintTasks).where(eq(sprintTasks.taskId, taskId));

    // Log activity
    await db.insert(taskActivities).values({
      taskId,
      userId: session.user.id,
      action: "updated",
      field: "sprint",
      oldValue: sprintName,
      newValue: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing task from sprints:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
