import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { forms, tasks, lists, spaces, workspaces, workspaceMembers } from "@/db/schema";
import { eq, or, and } from "drizzle-orm";
import { z } from "zod";

// GET /api/forms/[slug] - Public form (no auth required)
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const form = await db.query.forms.findFirst({
      where: eq(forms.slug, slug),
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Only return form metadata if it's public OR user is authenticated and member of the workspace
    const session = await auth();
    let hasAccess = form.isPublic;

    if (!hasAccess && session?.user?.id) {
      // Check if user is a member of the workspace
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, form.workspaceId),
          eq(workspaceMembers.userId, session.user.id)
        ),
      });
      hasAccess = !!membership;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Get linked list info if exists
    let listInfo = null;
    if (form.listId) {
      const list = await db.query.lists.findFirst({
        where: eq(lists.id, form.listId),
      });
      if (list) {
        listInfo = {
          id: list.id,
          name: list.name,
        };
      }
    }

    return NextResponse.json({ 
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        fields: form.fields,
        listInfo,
      }
    });
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/forms/[slug] - Delete a form (slug can also be an id)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    // Try to find by slug or by id
    const form = await db.query.forms.findFirst({
      where: or(eq(forms.slug, slug), eq(forms.id, slug)),
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Check if user is a member of the workspace with admin/owner role
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, form.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await db.delete(forms).where(eq(forms.id, form.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
