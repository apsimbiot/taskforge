import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, workspaceMembers } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const createDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.record(z.string(), z.any()).default({}),
  icon: z.string().max(50).default("file-text"),
  coverUrl: z.string().optional(),
  spaceId: z.string().uuid().optional(),
  parentDocumentId: z.string().uuid().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]/documents - List documents for a workspace
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

    const searchParams = request.nextUrl.searchParams;
    const spaceId = searchParams.get("spaceId");
    const parentId = searchParams.get("parentId");

    const whereConditions: any[] = [eq(documents.workspaceId, workspaceId)];
    
    if (spaceId) {
      whereConditions.push(eq(documents.spaceId, spaceId));
    }
    
    if (parentId) {
      whereConditions.push(eq(documents.parentDocumentId, parentId));
    } else if (!parentId && !spaceId) {
      // Return root-level documents only
      whereConditions.push(isNull(documents.parentDocumentId));
    }

    const workspaceDocuments = await db.query.documents.findMany({
      where: and(...whereConditions),
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

    return NextResponse.json({ documents: workspaceDocuments });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/documents - Create document
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const validatedData = createDocumentSchema.parse(body);

    const [document] = await db.insert(documents).values({
      ...validatedData,
      workspaceId,
      creatorId: session.user.id,
    }).returning();

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
