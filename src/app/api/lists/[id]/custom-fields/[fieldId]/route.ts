import { NextResponse } from "next/server"
import { db } from "@/db"
import { customFieldDefinitions } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const { id: listId, fieldId } = await params
    const body = await request.json()
    const { name, type, options, order } = body

    // Verify field exists
    const existingField = await db
      .select()
      .from(customFieldDefinitions)
      .where(eq(customFieldDefinitions.id, fieldId))
      .limit(1)

    if (!existingField.length) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 })
    }

    // Validate field type if provided
    if (type) {
      const validTypes = [
        "text", "textarea", "number", "date", "time", "datetime",
        "checkbox", "select", "multiSelect", "url", "email", "phone",
        "currency", "percentage", "user"
      ]

      if (!validTypes.includes(type)) {
        return NextResponse.json({ error: "Invalid field type" }, { status: 400 })
      }
    }

    const [field] = await db
      .update(customFieldDefinitions)
      .set({
        ...(name && { name }),
        ...(type && { type }),
        ...(options !== undefined && { options }),
        ...(order !== undefined && { order }),
      })
      .where(eq(customFieldDefinitions.id, fieldId))
      .returning()

    return NextResponse.json({ field })
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

    // Verify field exists
    const existingField = await db
      .select()
      .from(customFieldDefinitions)
      .where(eq(customFieldDefinitions.id, fieldId))
      .limit(1)

    if (!existingField.length) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 })
    }

    await db
      .delete(customFieldDefinitions)
      .where(eq(customFieldDefinitions.id, fieldId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting custom field:", error)
    return NextResponse.json(
      { error: "Failed to delete custom field" },
      { status: 500 }
    )
  }
}
