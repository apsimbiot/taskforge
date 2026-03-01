import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { goals, keyResults, workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateGoalSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: goalId } = await params;

    // Get goal first
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
      with: {
        keyResults: true,
      },
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

    // Calculate progress
    const totalTarget = goal.keyResults.reduce((sum, kr) => sum + kr.targetValue, 0);
    const totalCurrent = goal.keyResults.reduce((sum, kr) => sum + kr.currentValue, 0);
    const progress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

    return NextResponse.json({
      goal: {
        ...goal,
        progress,
        targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString() : null,
        createdAt: goal.createdAt ? new Date(goal.createdAt).toISOString() : goal.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching goal:", error);
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

    const { id: goalId } = await params;

    // Get goal first
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
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
    const validatedData = updateGoalSchema.parse(body);

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.targetDate !== undefined) {
      updateData.targetDate = validatedData.targetDate ? new Date(validatedData.targetDate) : null;
    }
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    const [updatedGoal] = await db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, goalId))
      .returning();

    return NextResponse.json({
      goal: {
        ...updatedGoal,
        targetDate: updatedGoal.targetDate ? new Date(updatedGoal.targetDate).toISOString() : null,
        createdAt: updatedGoal.createdAt ? new Date(updatedGoal.createdAt).toISOString() : updatedGoal.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating goal:", error);
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

    const { id: goalId } = await params;

    // Get goal first
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
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

    // Delete key results first (cascade should handle this, but being explicit)
    await db.delete(keyResults).where(eq(keyResults.goalId, goalId));

    // Delete goal
    await db.delete(goals).where(eq(goals.id, goalId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
