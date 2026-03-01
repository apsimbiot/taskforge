import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { notifications, tasks, lists, spaces } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";

const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  message: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unread") === "true";

    const userId = session.user.id;

    let baseWhere = eq(notifications.userId, userId);
    if (unreadOnly) {
      baseWhere = and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      );
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(baseWhere)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Enrich notifications with navigation context (workspaceId, spaceId, listId)
    // by joining with tasks -> lists -> spaces when entityType is "task"
    const enrichedNotifications = await Promise.all(
      userNotifications.map(async (notification) => {
        const enriched = { ...notification } as Record<string, unknown>;
        
        if (notification.entityType === "task" && notification.entityId) {
          try {
            const taskWithContext = await db
              .select({
                id: tasks.id,
                listId: lists.id,
                spaceId: spaces.id,
                workspaceId: spaces.workspaceId,
              })
              .from(tasks)
              .innerJoin(lists, eq(tasks.listId, lists.id))
              .innerJoin(spaces, eq(lists.spaceId, spaces.id))
              .where(eq(tasks.id, notification.entityId))
              .limit(1);

            if (taskWithContext.length > 0) {
              enriched.workspaceId = taskWithContext[0].workspaceId;
              enriched.spaceId = taskWithContext[0].spaceId;
              enriched.listId = taskWithContext[0].listId;
            }
          } catch (err) {
            console.error("Error enriching notification:", err);
          }
        }
        
        return enriched;
      })
    );

    // Get unread count
    const unreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        )
      );

    return NextResponse.json({
      notifications: enrichedNotifications,
      unreadCount: unreadCount[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
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
    const validatedData = createNotificationSchema.parse(body);

    // Verify the requesting user has access to create notifications for this user
    // (In practice, this would be called internally by other parts of the system)
    const [notification] = await db.insert(notifications).values({
      userId: validatedData.userId,
      type: validatedData.type,
      title: validatedData.title,
      message: validatedData.message || null,
      entityType: validatedData.entityType || null,
      entityId: validatedData.entityId || null,
    }).returning();

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
