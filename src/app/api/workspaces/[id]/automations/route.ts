import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { automations, workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createAutomationSchema = z.object({
  name: z.string().min(1).max(255),
  triggerType: z.enum(["status_change", "task_created", "due_date_approaching", "assignment"]),
  triggerConfig: z.record(z.string(), z.any()).default({}),
  actionType: z.enum(["change_status", "assign_user", "add_label", "send_notification"]),
  actionConfig: z.record(z.string(), z.any()).default({}),
  enabled: z.boolean().default(true),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]/automations - List automations for a workspace
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    // Check membership
    const memberCheck = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!memberCheck) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const workspaceAutomations = await db.query.automations.findMany({
      where: eq(automations.workspaceId, workspaceId),
    });

    return NextResponse.json({ automations: workspaceAutomations });
  } catch (error) {
    console.error("Error fetching automations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/automations - Create automation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    // Check membership (admin/owner only)
    const memberCheck = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!memberCheck || !["owner", "admin"].includes(memberCheck.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createAutomationSchema.parse(body);

    const [automation] = await db.insert(automations).values({
      ...validatedData,
      workspaceId,
    }).returning();

    return NextResponse.json({ automation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating automation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
