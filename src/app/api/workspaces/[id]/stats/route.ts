import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { tasks, lists, folders, spaces, taskActivities, workspaceMembers, users } from "@/db/schema"
import { eq, and, sql, desc, gte } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params

    // Get all spaces in workspace
    const workspaceSpaces = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(eq(spaces.workspaceId, workspaceId))

    const spaceIds = workspaceSpaces.map((s) => s.id)

    if (spaceIds.length === 0) {
      return NextResponse.json({
        totalTasks: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        byStatus: [],
        completedOverTime: [],
        workload: [],
        recentActivity: [],
      })
    }

    // Get all folders in those spaces
    const allFolders = await db
      .select({ id: folders.id, spaceId: folders.spaceId })
      .from(folders)
      .where(sql`${folders.spaceId} IN ${spaceIds}`)

    const folderIds = allFolders.map((f) => f.id)

    if (folderIds.length === 0) {
      return NextResponse.json({
        totalTasks: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        byStatus: [],
        completedOverTime: [],
        workload: [],
        recentActivity: [],
      })
    }

    // Get all lists in those folders
    const allLists = await db
      .select({ id: lists.id })
      .from(lists)
      .where(sql`${lists.folderId} IN ${folderIds}`)

    const listIds = allLists.map((l) => l.id)

    if (listIds.length === 0) {
      return NextResponse.json({
        totalTasks: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        byStatus: [],
        completedOverTime: [],
        workload: [],
        recentActivity: [],
      })
    }

    // Get all tasks in those lists
    const allTasks = await db
      .select({
        id: tasks.id,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        creatorId: tasks.creatorId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        title: tasks.title,
      })
      .from(tasks)
      .where(sql`${tasks.listId} IN ${listIds}`)

    const totalTasks = allTasks.length
    const completed = allTasks.filter(
      (t) => t.status === "done" || t.status === "closed" || t.status === "complete"
    ).length
    const inProgress = allTasks.filter(
      (t) => t.status === "in_progress" || t.status === "in progress"
    ).length
    const now = new Date()
    const overdue = allTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== "done" &&
        t.status !== "closed" &&
        t.status !== "complete"
    ).length

    // Tasks by status
    const statusCounts: Record<string, number> = {}
    allTasks.forEach((t) => {
      const status = t.status || "open"
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })
    const byStatus = Object.entries(statusCounts).map(([name, count]) => ({
      name,
      count,
    }))

    // Tasks completed over last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const completedOverTime: Record<string, number> = {}
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      completedOverTime[date.toISOString().split("T")[0]] = 0
    }

    allTasks
      .filter(
        (t) =>
          (t.status === "done" || t.status === "closed" || t.status === "complete") &&
          new Date(t.updatedAt) >= thirtyDaysAgo
      )
      .forEach((t) => {
        const dateKey = new Date(t.updatedAt).toISOString().split("T")[0]
        if (completedOverTime[dateKey] !== undefined) {
          completedOverTime[dateKey]++
        }
      })

    const completedOverTimeArr = Object.entries(completedOverTime).map(([date, count]) => ({
      date,
      count,
    }))

    // Workload per member (by creator for now)
    const workloadMap: Record<string, number> = {}
    allTasks.forEach((t) => {
      const creator = t.creatorId || "unknown"
      workloadMap[creator] = (workloadMap[creator] || 0) + 1
    })

    // Get member names
    const members = await db
      .select({
        userId: workspaceMembers.userId,
        name: users.name,
        email: users.email,
      })
      .from(workspaceMembers)
      .leftJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId))

    const memberMap = new Map(
      members.map((m) => [m.userId, m.name || m.email || "Unknown"])
    )

    const workload = Object.entries(workloadMap).map(([userId, count]) => ({
      name: memberMap.get(userId) || "Unknown",
      tasks: count,
    }))

    // Recent activity
    const recentActivity = allTasks
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        updatedAt: t.updatedAt,
        creatorName: memberMap.get(t.creatorId) || "Unknown",
      }))

    return NextResponse.json({
      totalTasks,
      completed,
      inProgress,
      overdue,
      byStatus,
      completedOverTime: completedOverTimeArr,
      workload,
      recentActivity,
    })
  } catch (error) {
    console.error("Error fetching workspace stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
