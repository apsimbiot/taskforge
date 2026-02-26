import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { workspaceMembers, users, workspaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, userId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["admin", "member", "viewer"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, member, or viewer" },
        { status: 400 }
      );
    }

    // Check membership and role of current user
    const currentMembership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!currentMembership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only admins and owners can change roles
    if (currentMembership.role !== "owner" && currentMembership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins and owners can change member roles" },
        { status: 403 }
      );
    }

    // Get the target member
    const targetMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found in this workspace" },
        { status: 404 }
      );
    }

    // Prevent changing the owner's role
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change the role of the workspace owner" },
        { status: 400 }
      );
    }

    // Update the member's role
    await db
      .update(workspaceMembers)
      .set({ role })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      );

    // Get the full user info for the response
    const memberWithUser = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    return NextResponse.json({ member: memberWithUser[0] });
  } catch (error) {
    console.error("Error updating workspace member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, userId } = await params;

    // Check membership and role of current user
    const currentMembership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    });

    if (!currentMembership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only admins and owners can remove members
    if (currentMembership.role !== "owner" && currentMembership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins and owners can remove members" },
        { status: 403 }
      );
    }

    // Get the target member
    const targetMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found in this workspace" },
        { status: 404 }
      );
    }

    // Prevent removing the workspace owner
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove the workspace owner" },
        { status: 400 }
      );
    }

    // Remove the member
    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing workspace member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
