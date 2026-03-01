import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api-auth";

// GET /api/v1/workspaces - List workspaces
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    // Get workspaces the user has access to
    const userWorkspaces = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.userId, auth.userId),
    });

    const workspaceIds = userWorkspaces.map((m) => m.workspaceId);

    if (workspaceIds.length === 0) {
      return NextResponse.json({ workspaces: [] });
    }

    const workspaceList = await db.query.workspaces.findMany({
      where: inArray(workspaces.id, workspaceIds),
    });

    return NextResponse.json({ workspaces: workspaceList });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
