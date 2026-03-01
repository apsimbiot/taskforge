import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { keyResults, goals, workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createKeyResultSchema = z.object({
  goalId: z.string().uuid(),
  title: z.string().min(1).max(255),
  targetValue: z.number().int().positive(),
  linkedTaskId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get("goalId");

    if (!goalId) {
      return NextResponse.json({ error: "goalId is required" }, { status: 400 });
    }

    // Get goal first
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
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

    // Get key results
    const keyResultsList = await db.query.keyResults.findMany({
      where: eq(keyResults.goalId, goalId),
    });

    return NextResponse.json({ keyResults: keyResultsList });
  } catch (error) {
    console.error("Error fetching key results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createKeyResultSchema.parse(body);

    // Get goal first
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, validatedData.goalId),
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

    const [keyResult] = await db
      .insert(keyResults)
      .values({
        goalId: validatedData.goalId,
        title: validatedData.title,
        targetValue: validatedData.targetValue,
        currentValue: 0,
        linkedTaskId: validatedData.linkedTaskId || null,
      })
      .returning();

    return NextResponse.json({ keyResult }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating key result:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
