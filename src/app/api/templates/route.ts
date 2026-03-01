import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { templates, workspaces, workspaceMembers } from "@/db/schema"
import { eq, and } from "drizzle-orm"

// GET /api/templates - List all templates for a workspace
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 })
    }

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    })

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const templatesList = await db.query.templates.findMany({
      where: eq(templates.workspaceId, workspaceId),
      orderBy: (templates, { desc }) => [desc(templates.createdAt)],
    })

    return NextResponse.json({ templates: templatesList })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, name, description, type, listConfig } = body

    if (!workspaceId || !name || !type) {
      return NextResponse.json(
        { error: "workspaceId, name, and type are required" },
        { status: 400 }
      )
    }

    if (!["list", "workspace"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'list' or 'workspace'" },
        { status: 400 }
      )
    }

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    })

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const [template] = await db
      .insert(templates)
      .values({
        workspaceId,
        name,
        description: description || null,
        type,
        listConfig: listConfig || {},
      })
      .returning()

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
