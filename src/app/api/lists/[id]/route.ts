import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { lists, spaces, workspaceMembers } from "@/db/schema"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/lists/[id] - Get a single list by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: listId } = await params

    // Get the list
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
    })

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 })
    }

    // Get the space to check workspace access
    const space = await db.query.spaces.findFirst({
      where: eq(spaces.id, list.spaceId),
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, space.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    })

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ list })
  } catch (error) {
    console.error("Error fetching list:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
