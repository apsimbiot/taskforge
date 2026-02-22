import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, taskAssignees, timeEntries, lists, spaces, users, workspaceMembers } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]/reports/workload - Per-assignee task count and time
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

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

    // Get workspace members
    const members = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, workspaceId),
      with: {
        user: true,
      },
    });

    const workloadData = [];

    for (const member of members) {
      if (listIds.length === 0) {
        workloadData.push({
          user: {
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
            avatarUrl: member.user.avatarUrl,
          },
          tasks: { total: 0, byStatus: {} },
          time: { totalMinutes: 0 },
        });
        continue;
      }

      // Get assigned task count by status
      const taskStats = await db
        .select({
          status: tasks.status,
          count: sql<number>`count(*)::int`,
        })
        .from(tasks)
        .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
        .where(
          and(
            eq(taskAssignees.userId, member.userId),
            inArray(tasks.listId, listIds)
          )
        )
        .groupBy(tasks.status);

      // Get total time spent
      const timeResult = await db
        .select({
          totalTime: sql<number>`COALESCE(SUM(${timeEntries.duration}), 0)::int`,
        })
        .from(timeEntries)
        .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
        .where(
          and(
            eq(timeEntries.userId, member.userId),
            inArray(tasks.listId, listIds)
          )
        );

      const totalTasks = taskStats.reduce((sum, s) => sum + s.count, 0);

      workloadData.push({
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatarUrl: member.user.avatarUrl,
        },
        tasks: {
          total: totalTasks,
          byStatus: taskStats.reduce((acc, s) => {
            acc[s.status ?? "unknown"] = s.count;
            return acc;
          }, {} as Record<string, number>),
        },
        time: {
          totalMinutes: timeResult[0]?.totalTime || 0,
        },
      });
    }

    return NextResponse.json({ workload: workloadData });
  } catch (error) {
    console.error("Error fetching workload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
