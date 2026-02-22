import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { forms } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createFormSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  fields: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(["text", "textarea", "number", "date", "select", "checkbox"]),
    required: z.boolean().default(false),
    options: z.array(z.string()).default([]),
  })).default([]),
  listId: z.string().uuid().optional(),
  isPublic: z.boolean().default(false),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]/forms - List forms for a workspace
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    // Check membership
    const { workspaceMembers: wm } = await import("@/db/schema");
    const memberCheck = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(wm.workspaceId, workspaceId),
        eq(wm.userId, session.user.id)
      ),
    });

    if (!memberCheck) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const workspaceForms = await db.query.forms.findMany({
      where: eq(forms.workspaceId, workspaceId),
    });

    return NextResponse.json({ forms: workspaceForms });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/forms - Create form
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    // Check membership
    const { workspaceMembers: wm } = await import("@/db/schema");
    const memberCheck = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(wm.workspaceId, workspaceId),
        eq(wm.userId, session.user.id)
      ),
    });

    if (!memberCheck || !["owner", "admin"].includes(memberCheck.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createFormSchema.parse(body);

    // Check slug uniqueness
    const existingForm = await db.query.forms.findFirst({
      where: eq(forms.slug, validatedData.slug),
    });

    if (existingForm) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }

    const [form] = await db.insert(forms).values({
      ...validatedData,
      workspaceId,
    }).returning();

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating form:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
