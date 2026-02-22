import { NextResponse } from "next/server"
import { db } from "@/db"
import { statuses } from "@/db/schema"
import { eq } from "drizzle-orm"

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
