import { NextResponse } from "next/server"
import { db } from "@/db"
import { statuses, tasks } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params
    
    const listStatuses = await db
      .select()
      .from(statuses)
      .where(eq(statuses.listId, listId))
      .orderBy(statuses.order)

    return NextResponse.json({ statuses: listStatuses })
  } catch (error) {
    console.error("Error fetching statuses:", error)
    return NextResponse.json(
      { error: "Failed to fetch statuses" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params
    const body = await request.json()
    const { name, color, order } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Status name is required" },
        { status: 400 }
      )
    }

    // Check for unique name within list
    const existingStatus = await db
      .select()
      .from(statuses)
      .where(and(eq(statuses.listId, listId), eq(statuses.name, name)))
      .limit(1)

    if (existingStatus.length > 0) {
      return NextResponse.json(
        { error: "Status name must be unique within this list" },
        { status: 400 }
      )
    }

    // Get max order if not provided
    let newOrder = order
    if (newOrder === undefined || newOrder === null) {
      const maxOrderStatus = await db
        .select({ order: statuses.order })
        .from(statuses)
        .where(eq(statuses.listId, listId))
        .orderBy(statuses.order)
        .limit(1)
      
      newOrder = maxOrderStatus.length > 0 ? (maxOrderStatus[0].order ?? 0) + 1 : 0
    }

    const [newStatus] = await db
      .insert(statuses)
      .values({
        listId,
        name,
        color: color || "#6366f1",
        order: newOrder,
        isDefault: false,
      })
      .returning()

    return NextResponse.json({ status: newStatus }, { status: 201 })
  } catch (error) {
    console.error("Error creating status:", error)
    return NextResponse.json(
      { error: "Failed to create status" },
      { status: 500 }
    )
  }
}
