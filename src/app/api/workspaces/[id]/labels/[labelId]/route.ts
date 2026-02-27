import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { labels, workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string; labelId: string }>;
}

const updateLabelSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, labelId } = await params;

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if label exists and belongs to workspace
    const existingLabel = await db.query.labels.findFirst({
      where: and(
        eq(labels.id, labelId),
        eq(labels.workspaceId, workspaceId)
      ),
    });

    if (!existingLabel) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const body = await request.json();
    const validationResult = updateLabelSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, color } = validationResult.data;

    // Update the label
    const [updatedLabel] = await db
      .update(labels)
      .set({
        ...(name && { name }),
        ...(color && { color }),
      })
      .where(eq(labels.id, labelId))
      .returning();

    return NextResponse.json({ label: updatedLabel });
  } catch (error) {
    console.error("Error updating label:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, labelId } = await params;

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if label exists and belongs to workspace
    const existingLabel = await db.query.labels.findFirst({
      where: and(
        eq(labels.id, labelId),
        eq(labels.workspaceId, workspaceId)
      ),
    });

    if (!existingLabel) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Delete the label (cascades to task_labels due to foreign key)
    await db.delete(labels).where(eq(labels.id, labelId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting label:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
