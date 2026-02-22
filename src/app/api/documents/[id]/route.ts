import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.record(z.string(), z.any()).optional(),
  icon: z.string().max(50).optional(),
  coverUrl: z.string().optional(),
  spaceId: z.string().uuid().nullable().optional(),
  parentDocumentId: z.string().uuid().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/documents/[id] - Get single document
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check workspace membership
    const memberCheck = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, document.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!memberCheck) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get children
    const children = await db.query.documents.findMany({
      where: eq(documents.parentDocumentId, id),
      columns: {
        id: true,
        title: true,
        icon: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ document, children });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/documents/[id] - Update document
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check workspace membership
    const memberCheck = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, document.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!memberCheck) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateDocumentSchema.parse(body);

    const [updated] = await db
      .update(documents)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();

    return NextResponse.json({ document: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete document (cascades to children)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check workspace membership
    const memberCheck = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, document.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!memberCheck) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await db.delete(documents).where(eq(documents.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
