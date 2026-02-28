import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { tasks, documents, workspaceMembers, spaces, lists, workspaces } from "@/db/schema"
import { and, or, ilike, eq, inArray } from "drizzle-orm"

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const workspaceId = searchParams.get("workspaceId") // Optional: search within specific workspace

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] })
  }

  const searchPattern = `%${query}%`

  // Get user's workspace IDs
  const userWorkspaces = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, session.user.id))

  const workspaceIds = userWorkspaces.map(w => w.workspaceId)

  if (workspaceIds.length === 0) {
    return NextResponse.json({ results: [] })
  }

  // If workspaceId provided, verify user has access to it
  if (workspaceId && !workspaceIds.includes(workspaceId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  const targetWorkspaceIds = workspaceId ? [workspaceId] : workspaceIds

  // Search tasks within user's workspaces
  const taskResults = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      listId: tasks.listId,
      workspaceId: spaces.workspaceId,
    })
    .from(tasks)
    .innerJoin(lists, eq(tasks.listId, lists.id))
    .innerJoin(spaces, eq(lists.spaceId, spaces.id))
    .where(
      and(
        ilike(tasks.title, searchPattern),
        inArray(spaces.workspaceId, targetWorkspaceIds)
      )
    )
    .limit(10)

  // Search documents within user's workspaces
  const docResults = await db
    .select({
      id: documents.id,
      title: documents.title,
      workspaceId: documents.workspaceId,
    })
    .from(documents)
    .where(
      and(
        ilike(documents.title, searchPattern),
        inArray(documents.workspaceId, targetWorkspaceIds)
      )
    )
    .limit(10)

  // Format results
  const results = [
    ...taskResults.map((task) => ({
      id: task.id,
      title: task.title,
      type: "task" as const,
      workspaceId: task.workspaceId,
      url: `/dashboard/workspaces/${task.workspaceId}/lists/${task.listId}/tasks/${task.id}`,
    })),
    ...docResults.map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: "doc" as const,
      workspaceId: doc.workspaceId,
      url: `/dashboard/workspaces/${doc.workspaceId}/docs/${doc.id}`,
    })),
  ]

  return NextResponse.json({ results })
}
