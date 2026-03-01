import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spaces, workspaceMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api-auth";

// GET /api/v1/spaces - List spaces (filtered by workspace if provided)
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");

    let querySpaces;
    
    if (workspaceId) {
      // Verify user has access to this workspace
      const membership = await db.query.workspaceMembers.findFirst({
        where: eq(workspaceMembers.workspaceId, workspaceId),
      });

      if (!membership || membership.userId !== auth.userId) {
        return NextResponse.json(
          { error: "Access denied to this workspace" },
          { status: 403 }
        );
      }

      querySpaces = await db.query.spaces.findMany({
        where: eq(spaces.workspaceId, workspaceId),
      });
    } else {
      // Get all spaces from workspaces the user has access to
      querySpaces = await db.query.spaces.findMany({
        where: eq(spaces.workspaceId, auth.workspaceIds[0]),
      });
    }

    return NextResponse.json({ spaces: querySpaces });
  } catch (error) {
    console.error("Error fetching spaces:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
