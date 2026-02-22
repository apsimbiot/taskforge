import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { sprints, workspaceMembers, sprintTasks, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sprintId, taskId } = await params;

    // Get sprint
    const sprint = await db.query.sprints.findFirst({
      where: eq(sprints.id, sprintId),
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, sprint.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if relation exists
    const existingRelation = await db.query.sprintTasks.findFirst({
      where: and(
        eq(sprintTasks.sprintId, sprintId),
        eq(sprintTasks.taskId, taskId)
      ),
    });

    if (!existingRelation) {
      return NextResponse.json({ error: "Task not in sprint" }, { status: 404 });
    }

    // Remove task from sprint
    await db.delete(sprintTasks).where(
      and(
        eq(sprintTasks.sprintId, sprintId),
        eq(sprintTasks.taskId, taskId)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing task from sprint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
