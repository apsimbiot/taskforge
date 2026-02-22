import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { 
  tasks, 
  workspaceMembers, 
  workspaces, 
  lists, 
  spaces, 
  sprints, 
  sprintTasks,
  taskAssignees,
  users 
} from "@/db/schema";
import { eq, and, inArray, sql, desc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get all lists in the workspace through spaces
    const workspaceSpaces = await db.query.spaces.findMany({
      where: eq(spaces.workspaceId, workspaceId),
    });
    const spaceIds = workspaceSpaces.map((s) => s.id);

    let listIds: string[] = [];
    if (spaceIds.length > 0) {
      const workspaceLists = await db.query.lists.findMany({
        where: inArray(lists.spaceId, spaceIds),
      });
      listIds = workspaceLists.map((l) => l.id);
    }

    // Get all tasks in workspace lists
    let workspaceTasks: typeof tasks.$inferSelect[] = [];
    if (listIds.length > 0) {
      workspaceTasks = await db.query.tasks.findMany({
        where: inArray(tasks.listId, listIds),
      });
    }

    const now = new Date();

    // Calculate stats
    const totalTasks = workspaceTasks.length;
    const completedTasks = workspaceTasks.filter((t) => t.status === "done" || t.status === "completed").length;
    const inProgressTasks = workspaceTasks.filter((t) => t.status === "in_progress").length;
    const overdueTasks = workspaceTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done" && t.status !== "completed"
    );

    // Tasks by status
    const tasksByStatus = {
      todo: workspaceTasks.filter((t) => t.status === "todo").length,
      in_progress: workspaceTasks.filter((t) => t.status === "in_progress").length,
      in_review: workspaceTasks.filter((t) => t.status === "in_review").length,
      done: workspaceTasks.filter((t) => t.status === "done" || t.status === "completed").length,
    };

    // Tasks by priority
    const tasksByPriority = {
      urgent: workspaceTasks.filter((t) => t.priority === "urgent").length,
      high: workspaceTasks.filter((t) => t.priority === "high").length,
      medium: workspaceTasks.filter((t) => t.priority === "medium").length,
      low: workspaceTasks.filter((t) => t.priority === "low").length,
      none: workspaceTasks.filter((t) => t.priority === "none").length,
    };

    // Tasks completed per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get completed task activities
    let completedActivities: typeof tasks.$inferSelect[] = [];
    if (listIds.length > 0) {
      completedActivities = await db
        .select()
        .from(tasks)
        .where(
          and(
            inArray(tasks.listId, listIds),
            sql`${tasks.status} IN ('done', 'completed')`,
            sql`${tasks.updatedAt} >= ${thirtyDaysAgo.toISOString()}`
          )
        )
        .orderBy(desc(tasks.updatedAt));
    }

    // Group by day
    const completedByDay = new Map<string, number>();
    for (const task of completedActivities) {
      const dateKey = task.updatedAt.toISOString().split("T")[0];
      completedByDay.set(dateKey, (completedByDay.get(dateKey) || 0) + 1);
    }

    const tasksCompletedPerDay: Array<{ date: string; count: number }> = [];
    for (const [date, count] of completedByDay) {
      tasksCompletedPerDay.push({ date, count });
    }
    tasksCompletedPerDay.sort((a, b) => a.date.localeCompare(b.date));

    // Sprint velocity (tasks completed per sprint)
    const workspaceSprints = await db.query.sprints.findMany({
      where: eq(sprints.workspaceId, workspaceId),
      orderBy: [desc(sprints.startDate)],
      limit: 10,
    });

    const sprintVelocity: Array<{ sprintId: string; sprintName: string; completedTasks: number }> = [];

    for (const sprint of workspaceSprints) {
      const sprintTaskRelations = await db.query.sprintTasks.findMany({
        where: eq(sprintTasks.sprintId, sprint.id),
      });

      const sprintTaskIds = sprintTaskRelations.map((st) => st.taskId);
      
      if (sprintTaskIds.length > 0) {
        const completedInSprint = await db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(
            and(
              inArray(tasks.id, sprintTaskIds),
              sql`${tasks.status} IN ('done', 'completed')`
            )
          );

        sprintVelocity.push({
          sprintId: sprint.id,
          sprintName: sprint.name,
          completedTasks: completedInSprint[0]?.count || 0,
        });
      } else {
        sprintVelocity.push({
          sprintId: sprint.id,
          sprintName: sprint.name,
          completedTasks: 0,
        });
      }
    }

    // Workload per assignee
    const allTaskAssignees = await db.query.taskAssignees.findMany({
      where: inArray(taskAssignees.taskId, workspaceTasks.map((t) => t.id)),
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
    });

    const workloadByUser = new Map<string, { userId: string; name: string; avatarUrl: string | null; total: number; completed: number }>();

    for (const assignee of allTaskAssignees) {
      const userId = assignee.user.id;
      if (!workloadByUser.has(userId)) {
        const userTasks = workspaceTasks.filter((t) => 
          allTaskAssignees.some((a) => a.userId === userId && a.taskId === t.id)
        );
        workloadByUser.set(userId, {
          userId,
          name: assignee.user.name,
          avatarUrl: assignee.user.avatarUrl,
          total: userTasks.length,
          completed: userTasks.filter((t) => t.status === "done" || t.status === "completed").length,
        });
      }
    }

    const workloadPerAssignee = Array.from(workloadByUser.values());

    // Overdue tasks list
    const overdueTasksList = overdueTasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      listId: task.listId,
    }));

    return NextResponse.json({
      stats: {
        totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        overdue: overdueTasks.length,
      },
      tasksByStatus,
      tasksByPriority,
      tasksCompletedPerDay,
      sprintVelocity,
      workloadPerAssignee,
      overdueTasks: overdueTasksList,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
