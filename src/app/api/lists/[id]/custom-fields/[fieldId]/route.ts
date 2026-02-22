import { NextResponse } from "next/server"
import { db } from "@/db"
import { customFieldDefinitions } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const { id: listId, fieldId } = await params
    const body = await request.json()
    const { name, type, options, order } = body

    const validTypes = [
      "text", "textarea", "number", "date", "time", "datetime",
      "checkbox", "select", "multiSelect", "url", "email", 
      "phone", "currency", "percentage", "user"
    ]
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid field type. Valid types: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const updateData: Partial<typeof customFieldDefinitions.$inferInsert> = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (options !== undefined) updateData.options = options
    if (order !== undefined) updateData.order = order

    const [updatedField] = await db
      .update(customFieldDefinitions)
      .set(updateData)
      .where(and(
        eq(customFieldDefinitions.id, fieldId),
        eq(customFieldDefinitions.listId, listId)
      ))
      .returning()

    if (!updatedField) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ field: updatedField })
  } catch (error) {
    console.error("Error updating custom field:", error)
    return NextResponse.json(
      { error: "Failed to update custom field" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const { id: listId, fieldId } = await params

    const [deletedField] = await db
      .delete(customFieldDefinitions)
      .where(and(
        eq(customFieldDefinitions.id, fieldId),
        eq(customFieldDefinitions.listId, listId)
      ))
      .returning()

    if (!deletedField) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting custom field:", error)
    return NextResponse.json(
      { error: "Failed to delete custom field" },
      { status: 500 }
    )
  }
}
