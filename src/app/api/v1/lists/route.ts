import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lists, spaces, workspaceMembers } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api-auth";

// GET /api/v1/lists - List lists (filtered by space if provided)
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
    const spaceId = searchParams.get("space_id");
    const workspaceId = searchParams.get("workspace_id");

    let queryLists;

    if (spaceId) {
      // Verify user has access to the space's workspace
      const space = await db.query.spaces.findFirst({
        where: eq(spaces.id, spaceId),
      });

      if (!space) {
        return NextResponse.json({ error: "Space not found" }, { status: 404 });
      }

      const membership = await db.query.workspaceMembers.findFirst({
        where: eq(workspaceMembers.workspaceId, space.workspaceId),
      });

      if (!membership || membership.userId !== auth.userId) {
        return NextResponse.json(
          { error: "Access denied to this space" },
          { status: 403 }
        );
      }

      queryLists = await db.query.lists.findMany({
        where: eq(lists.spaceId, spaceId),
      });
    } else if (workspaceId) {
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

      // Get all spaces in this workspace, then get lists
      const workspaceSpaces = await db.query.spaces.findMany({
        where: eq(spaces.workspaceId, workspaceId),
      });

      const spaceIds = workspaceSpaces.map((s) => s.id);

      if (spaceIds.length === 0) {
        return NextResponse.json({ lists: [] });
      }

      queryLists = await db.query.lists.findMany({
        where: inArray(lists.spaceId, spaceIds),
      });
    } else {
      // Get all lists from workspaces the user has access to
      const workspaceSpaces = await db.query.spaces.findMany({
        where: inArray(spaces.workspaceId, auth.workspaceIds),
      });

      const spaceIds = workspaceSpaces.map((s) => s.id);

      if (spaceIds.length === 0) {
        return NextResponse.json({ lists: [] });
      }

      queryLists = await db.query.lists.findMany({
        where: inArray(lists.spaceId, spaceIds),
      });
    }

    return NextResponse.json({ lists: queryLists });
  } catch (error) {
    console.error("Error fetching lists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
