import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { keyResults, goals, workspaceMembers, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateKeyResultSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  targetValue: z.number().int().positive().optional(),
  currentValue: z.number().int().min(0).optional(),
  linkedTaskId: z.string().uuid().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ krId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { krId } = await params;

    // Get key result
    const keyResult = await db.query.keyResults.findFirst({
      where: eq(keyResults.id, krId),
    });

    if (!keyResult) {
      return NextResponse.json({ error: "Key result not found" }, { status: 404 });
    }

    // Get goal for workspace check
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, keyResult.goalId),
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, goal.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // If linked task exists, fetch task details
    let linkedTask = null;
    if (keyResult.linkedTaskId) {
      linkedTask = await db.query.tasks.findFirst({
        where: eq(tasks.id, keyResult.linkedTaskId),
        columns: {
          id: true,
          title: true,
          status: true,
        },
      });
    }

    return NextResponse.json({
      keyResult: {
        ...keyResult,
        linkedTask,
      },
    });
  } catch (error) {
    console.error("Error fetching key result:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { krId } = await params;

    // Get key result
    const keyResult = await db.query.keyResults.findFirst({
      where: eq(keyResults.id, krId),
    });

    if (!keyResult) {
      return NextResponse.json({ error: "Key result not found" }, { status: 404 });
    }

    // Get goal for workspace check
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, keyResult.goalId),
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Check membership and permissions
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, goal.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateKeyResultSchema.parse(body);

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.targetValue !== undefined) updateData.targetValue = validatedData.targetValue;
    if (validatedData.currentValue !== undefined) updateData.currentValue = validatedData.currentValue;
    if (validatedData.linkedTaskId !== undefined) updateData.linkedTaskId = validatedData.linkedTaskId;

    const [updatedKeyResult] = await db
      .update(keyResults)
      .set(updateData)
      .where(eq(keyResults.id, krId))
      .returning();

    return NextResponse.json({ keyResult: updatedKeyResult });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating key result:", error);
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

    const { krId } = await params;

    // Get key result
    const keyResult = await db.query.keyResults.findFirst({
      where: eq(keyResults.id, krId),
    });

    if (!keyResult) {
      return NextResponse.json({ error: "Key result not found" }, { status: 404 });
    }

    // Get goal for workspace check
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, keyResult.goalId),
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Check membership and permissions
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, goal.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Delete key result
    await db.delete(keyResults).where(eq(keyResults.id, krId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting key result:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
