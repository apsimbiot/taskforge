import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { tasks, documents } from "@/db/schema"
import { or, ilike, eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] })
  }

  const searchPattern = `%${query}%`

  // Search tasks
  const taskResults = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      listId: tasks.listId,
    })
    .from(tasks)
    .where(ilike(tasks.title, searchPattern))
    .limit(10)

  // Search documents
  const docResults = await db
    .select({
      id: documents.id,
      title: documents.title,
      workspaceId: documents.workspaceId,
    })
    .from(documents)
    .where(ilike(documents.title, searchPattern))
    .limit(10)

  // Format results
  const results = [
    ...taskResults.map((task) => ({
      id: task.id,
      title: task.title,
      type: "task" as const,
      url: `/dashboard/workspaces/.../lists/${task.listId}/tasks/${task.id}`, // We'll need workspace context
    })),
    ...docResults.map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: "doc" as const,
      url: `/dashboard/workspaces/${doc.workspaceId}/docs/${doc.id}`,
    })),
  ]

  return NextResponse.json({ results })
}
