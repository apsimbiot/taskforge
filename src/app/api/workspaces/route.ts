import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { workspaces, workspaceMembers, spaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  subdomain: z.string().min(1).max(63).regex(/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/).optional(),
  logoUrl: z.string().optional(),
  plan: z.enum(["free", "pro", "enterprise"]).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userWorkspaces = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        subdomain: workspaces.subdomain,
        logoUrl: workspaces.logoUrl,
        plan: workspaces.plan,
        status: workspaces.status,
        createdAt: workspaces.createdAt,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, session.user.id));

    return NextResponse.json({ workspaces: userWorkspaces });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
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
    const validatedData = createWorkspaceSchema.parse(body);

    // Check if slug already exists
    const existingWorkspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.slug, validatedData.slug),
    });

    if (existingWorkspace) {
      return NextResponse.json(
        { error: "Workspace slug already exists" },
        { status: 409 }
      );
    }

    // Check subdomain availability if provided
    if (validatedData.subdomain) {
      const existingSubdomain = await db.query.workspaces.findFirst({
        where: eq(workspaces.subdomain, validatedData.subdomain.toLowerCase()),
      });

      if (existingSubdomain) {
        return NextResponse.json(
          { error: "Subdomain is not available" },
          { status: 409 }
        );
      }
    }

    // Create workspace with owner as member
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: validatedData.name,
        slug: validatedData.slug,
        subdomain: validatedData.subdomain?.toLowerCase(),
        ownerId: session.user.id,
        logoUrl: validatedData.logoUrl,
        plan: validatedData.plan || "free",
        status: "active",
      })
      .returning();

    // Add owner as workspace member
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: session.user.id,
      role: "owner",
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating workspace:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
