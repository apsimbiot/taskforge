import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { templates, workspaces, workspaceMembers, spaces, lists, customFieldDefinitions, statuses } from "@/db/schema"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/templates/[id] - Get a single template
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const template = await db.query.templates.findFirst({
      where: eq(templates.id, id),
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, template.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    })

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/templates/[id]/apply - Apply a template to create a new list
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const template = await db.query.templates.findFirst({
      where: eq(templates.id, id),
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, template.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    })

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    const { spaceId, listName, folderId } = body

    if (!spaceId || !listName) {
      return NextResponse.json(
        { error: "spaceId and listName are required" },
        { status: 400 }
      )
    }

    // Verify space belongs to workspace
    const space = await db.query.spaces.findFirst({
      where: and(
        eq(spaces.id, spaceId),
        eq(spaces.workspaceId, template.workspaceId)
      ),
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // Extract listConfig
    const listConfig = template.listConfig as {
      statuses?: Array<{ name: string; color: string; order: number; isDefault?: boolean }>
      customFields?: Array<{ name: string; type: string; options: Record<string, unknown>; order: number }>
    } || {}

    // Create the new list
    const [newList] = await db
      .insert(lists)
      .values({
        spaceId,
        folderId: folderId || null,
        name: listName,
        description: template.description,
      })
      .returning()

    // Create statuses from template if provided
    if (listConfig.statuses && listConfig.statuses.length > 0) {
      const statusValues = listConfig.statuses.map((status, index) => ({
        listId: newList.id,
        name: status.name,
        color: status.color,
        order: status.order ?? index,
        isDefault: status.isDefault ?? (index === 0),
      }))

      await db.insert(statuses).values(statusValues)
    }

    // Create custom fields from template if provided
    if (listConfig.customFields && listConfig.customFields.length > 0) {
      const customFieldValues = listConfig.customFields.map((field) => ({
        listId: newList.id,
        name: field.name,
        type: field.type,
        options: field.options || {},
        order: field.order ?? 0,
      }))

      await db.insert(customFieldDefinitions).values(customFieldValues)
    }

    return NextResponse.json({ 
      list: newList,
      message: "Template applied successfully" 
    }, { status: 201 })
  } catch (error) {
    console.error("Error applying template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
