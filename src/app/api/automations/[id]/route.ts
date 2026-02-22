import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { automations, workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateAutomationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  triggerType: z.enum(["status_change", "task_created", "due_date_approaching", "assignment"]).optional(),
  triggerConfig: z.record(z.string(), z.any()).optional(),
  actionType: z.enum(["change_status", "assign_user", "add_label", "send_notification"]).optional(),
  actionConfig: z.record(z.string(), z.any()).optional(),
  enabled: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/automations/[id] - Get single automation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const automation = await db.query.automations.findFirst({
      where: eq(automations.id, id),
    });

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    // Check workspace membership
    const memberCheck = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, automation.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!memberCheck) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ automation });
  } catch (error) {
    console.error("Error fetching automation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/automations/[id] - Update automation
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const automation = await db.query.automations.findFirst({
      where: eq(automations.id, id),
    });

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    // Check workspace membership
    const memberCheck = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, automation.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!memberCheck || !["owner", "admin"].includes(memberCheck.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateAutomationSchema.parse(body);

    const [updated] = await db
      .update(automations)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(automations.id, id))
      .returning();

    return NextResponse.json({ automation: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating automation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/automations/[id] - Delete automation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const automation = await db.query.automations.findFirst({
      where: eq(automations.id, id),
    });

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    // Check workspace membership
    const memberCheck = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, automation.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!memberCheck || !["owner", "admin"].includes(memberCheck.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await db.delete(automations).where(eq(automations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting automation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
