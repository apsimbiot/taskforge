import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, timeEntries, lists, spaces, users, workspaceMembers } from "@/db/schema";
import { eq, and, sql, between, inArray } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]/reports/time - Time tracking report
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");
    const taskId = searchParams.get("taskId");

    // Check membership
    const memberCheck = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!memberCheck) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get list IDs for this workspace (through spaces)
    const workspaceSpaces = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(eq(spaces.workspaceId, workspaceId));
    const spaceIds = workspaceSpaces.map(s => s.id);

    let listIds: string[] = [];
    if (spaceIds.length > 0) {
      const workspaceLists = await db
        .select({ id: lists.id })
        .from(lists)
        .where(inArray(lists.spaceId, spaceIds));
      listIds = workspaceLists.map(l => l.id);
    }

    if (listIds.length === 0) {
      return NextResponse.json({
        entries: [],
        byUser: [],
        byTask: [],
        summary: { totalMinutes: 0, entryCount: 0 },
      });
    }

    // Build where conditions
    const whereConditions = [inArray(tasks.listId, listIds)];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereConditions.push(between(timeEntries.startTime, start, end));
    }

    if (userId) {
      whereConditions.push(eq(timeEntries.userId, userId));
    }

    if (taskId) {
      whereConditions.push(eq(timeEntries.taskId, taskId));
    }

    const whereClause = and(...whereConditions);

    // Get time entries with task and user info
    const entries = await db
      .select({
        id: timeEntries.id,
        taskId: timeEntries.taskId,
        userId: timeEntries.userId,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        duration: timeEntries.duration,
        description: timeEntries.description,
        taskTitle: tasks.title,
        userName: users.name,
      })
      .from(timeEntries)
      .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .innerJoin(users, eq(timeEntries.userId, users.id))
      .where(whereClause)
      .orderBy(sql`${timeEntries.startTime} DESC`)
      .limit(500);

    // Aggregate by user
    const userAggregation = await db
      .select({
        userId: timeEntries.userId,
        userName: users.name,
        totalDuration: sql<number>`COALESCE(SUM(${timeEntries.duration}), 0)::int`,
        entryCount: sql<number>`COUNT(*)::int`,
      })
      .from(timeEntries)
      .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .innerJoin(users, eq(timeEntries.userId, users.id))
      .where(whereClause)
      .groupBy(timeEntries.userId, users.name);

    // Aggregate by task
    const taskAggregation = await db
      .select({
        taskId: tasks.id,
        taskTitle: tasks.title,
        totalDuration: sql<number>`COALESCE(SUM(${timeEntries.duration}), 0)::int`,
        entryCount: sql<number>`COUNT(*)::int`,
      })
      .from(timeEntries)
      .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .where(whereClause)
      .groupBy(tasks.id, tasks.title);

    // Summary
    const summary = await db
      .select({
        totalDuration: sql<number>`COALESCE(SUM(${timeEntries.duration}), 0)::int`,
        entryCount: sql<number>`COUNT(*)::int`,
      })
      .from(timeEntries)
      .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .where(whereClause);

    return NextResponse.json({
      entries: entries.map(e => ({
        id: e.id,
        taskId: e.taskId,
        taskTitle: e.taskTitle,
        userId: e.userId,
        userName: e.userName,
        startTime: e.startTime,
        endTime: e.endTime,
        duration: e.duration,
        description: e.description,
      })),
      byUser: userAggregation.map(u => ({
        userId: u.userId,
        userName: u.userName,
        totalMinutes: u.totalDuration,
        entryCount: u.entryCount,
      })),
      byTask: taskAggregation.map(t => ({
        taskId: t.taskId,
        taskTitle: t.taskTitle,
        totalMinutes: t.totalDuration,
        entryCount: t.entryCount,
      })),
      summary: {
        totalMinutes: summary[0]?.totalDuration || 0,
        entryCount: summary[0]?.entryCount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching time report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
