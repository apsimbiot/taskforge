import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, taskComments, documents, lists, spaces, workspaceMembers } from "@/db/schema";
import { eq, ilike, or, and, sql, inArray } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]/search?q=searchterm
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ error: "Search query too short (min 2 chars)" }, { status: 400 });
    }

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

    // Get space IDs for this workspace
    const workspaceSpaces = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(eq(spaces.workspaceId, workspaceId));
    const spaceIds = workspaceSpaces.map(s => s.id);

    // Get list IDs for this workspace (through spaces)
    let listIds: string[] = [];
    if (spaceIds.length > 0) {
      const workspaceLists = await db
        .select({ id: lists.id })
        .from(lists)
        .where(inArray(lists.spaceId, spaceIds));
      listIds = workspaceLists.map(l => l.id);
    }

    // Sanitize query for tsquery - escape special characters
    const tsQuery = query.replace(/[^\w\s]/g, "").trim().split(/\s+/).join(" & ");
    const searchPattern = `%${query}%`;

    // Search tasks using full-text search with ILIKE fallback
    let taskResults: any[] = [];
    if (listIds.length > 0) {
      taskResults = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          listId: tasks.listId,
        })
        .from(tasks)
        .where(
          and(
            inArray(tasks.listId, listIds),
            or(
              sql`to_tsvector('english', ${tasks.title}) @@ plainto_tsquery('english', ${query})`,
              ilike(tasks.title, searchPattern),
              sql`${tasks.description}::text ILIKE ${searchPattern}`
            )
          )
        )
        .limit(20);
    }

    // Search comments on workspace tasks
    let commentResults: any[] = [];
    if (listIds.length > 0) {
      commentResults = await db
        .select({
          id: taskComments.id,
          taskId: taskComments.taskId,
          content: taskComments.content,
          createdAt: taskComments.createdAt,
        })
        .from(taskComments)
        .innerJoin(tasks, eq(taskComments.taskId, tasks.id))
        .where(
          and(
            inArray(tasks.listId, listIds),
            or(
              sql`to_tsvector('english', ${taskComments.content}) @@ plainto_tsquery('english', ${query})`,
              ilike(taskComments.content, searchPattern)
            )
          )
        )
        .limit(10);
    }

    // Search documents
    const docResults = await db
      .select({
        id: documents.id,
        title: documents.title,
        icon: documents.icon,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.workspaceId, workspaceId),
          or(
            sql`to_tsvector('english', ${documents.title}) @@ plainto_tsquery('english', ${query})`,
            ilike(documents.title, searchPattern),
            sql`${documents.content}::text ILIKE ${searchPattern}`
          )
        )
      )
      .limit(20);

    // Group results
    const results = {
      tasks: taskResults.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        type: "task" as const,
      })),
      comments: commentResults.map(comment => ({
        id: comment.id,
        taskId: comment.taskId,
        content: comment.content.substring(0, 200),
        createdAt: comment.createdAt,
        type: "comment" as const,
      })),
      documents: docResults.map(doc => ({
        id: doc.id,
        title: doc.title,
        icon: doc.icon,
        updatedAt: doc.updatedAt,
        type: "document" as const,
      })),
    };

    return NextResponse.json({
      results,
      query,
      total: results.tasks.length + results.comments.length + results.documents.length,
    });
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
