import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { goals, keyResults, workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createGoalSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  workspaceId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

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

    // Get goals with key results
    const goalsList = await db.query.goals.findMany({
      where: eq(goals.workspaceId, workspaceId),
      with: {
        keyResults: true,
      },
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    });

    // Calculate progress for each goal
    const goalsWithProgress = goalsList.map((goal) => {
      const totalTarget = goal.keyResults.reduce((sum, kr) => sum + kr.targetValue, 0);
      const totalCurrent = goal.keyResults.reduce((sum, kr) => sum + kr.currentValue, 0);
      const progress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

      return {
        ...goal,
        progress,
        targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString() : null,
        createdAt: goal.createdAt ? new Date(goal.createdAt).toISOString() : goal.createdAt,
      };
    });

    return NextResponse.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error("Error fetching goals:", error);
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
    const validatedData = createGoalSchema.parse(body);

    // Check membership and permissions
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, validatedData.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [goal] = await db
      .insert(goals)
      .values({
        workspaceId: validatedData.workspaceId,
        name: validatedData.name,
        description: validatedData.description || null,
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null,
        status: "active",
      })
      .returning();

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating goal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
