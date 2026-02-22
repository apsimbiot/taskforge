import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { sprints, workspaceMembers } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const createSprintSchema = z.object({
  name: z.string().min(1).max(255),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  goal: z.string().optional(),
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

    const { id: workspaceId } = await params;

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

    const workspaceSprints = await db.query.sprints.findMany({
      where: eq(sprints.workspaceId, workspaceId),
      orderBy: [asc(sprints.startDate)],
    });

    return NextResponse.json({ sprints: workspaceSprints });
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    // Check membership and permissions
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createSprintSchema.parse(body);

    const [sprint] = await db.insert(sprints).values({
      workspaceId,
      name: validatedData.name,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      goal: validatedData.goal || null,
    }).returning();

    return NextResponse.json({ sprint }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating sprint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
