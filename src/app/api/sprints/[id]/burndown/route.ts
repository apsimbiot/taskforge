import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { sprints, workspaceMembers, sprintTasks, tasks, taskActivities } from "@/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sprintId } = await params;

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

    // Get all tasks in sprint
    const sprintTaskRelations = await db.query.sprintTasks.findMany({
      where: eq(sprintTasks.sprintId, sprintId),
    });

    const taskIds = sprintTaskRelations.map((st) => st.taskId);
    const totalTasks = taskIds.length;

    if (totalTasks === 0) {
      return NextResponse.json({
        sprint,
        totalTasks: 0,
        burndown: [],
      });
    }

    // Get status change activities for tasks in sprint
    const statusChanges = await db.query.taskActivities.findMany({
      where: and(
        eq(taskActivities.action, "updated"),
        eq(taskActivities.field, "status"),
        eq(taskActivities.newValue, "completed"),
        eq(taskActivities.taskId, taskIds[0]) // Need to handle multiple tasks
      ),
      orderBy: [asc(taskActivities.createdAt)],
    });

    // For simplicity, let's get task updates in the date range
    // Generate burndown data for each day of the sprint
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const burndown: Array<{ date: string; completed: number; remaining: number }> = [];

    // Get all completion activities in the sprint period
    const completedActivities = await db.query.taskActivities.findMany({
      where: and(
        eq(taskActivities.action, "updated"),
        eq(taskActivities.field, "status"),
        // Tasks in this sprint
        // Note: This is simplified, ideally we'd use sql `in` clause
      ),
    });

    // Get tasks that were completed during the sprint
    const allTaskActivities = await db
      .select()
      .from(taskActivities)
      .where(
        and(
          eq(taskActivities.action, "updated"),
          eq(taskActivities.field, "status"),
          eq(taskActivities.newValue, "completed"),
          gte(taskActivities.createdAt, startDate),
          lte(taskActivities.createdAt, endDate)
        )
      )
      .orderBy(asc(taskActivities.createdAt));

    // Count completions per day
    const completionsByDate = new Map<string, number>();
    for (const activity of allTaskActivities) {
      if (taskIds.includes(activity.taskId)) {
        const dateKey = activity.createdAt.toISOString().split("T")[0];
        completionsByDate.set(dateKey, (completionsByDate.get(dateKey) || 0) + 1);
      }
    }

    // Generate daily data
    const currentDate = new Date(startDate);
    let cumulativeCompleted = 0;

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split("T")[0];
      const dayCompleted = completionsByDate.get(dateKey) || 0;
      cumulativeCompleted += dayCompleted;

      burndown.push({
        date: dateKey,
        completed: cumulativeCompleted,
        remaining: totalTasks - cumulativeCompleted,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      sprint,
      totalTasks,
      burndown,
    });
  } catch (error) {
    console.error("Error fetching burndown:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
