import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, workspaceMembers, reminders } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

// Preset types for reminder timing
export type ReminderPreset = "15min" | "1hour" | "1day" | "custom";

const createReminderSchema = z.object({
  remindAt: z.string().datetime(),
  type: z.enum(["notification", "email", "both"]).default("notification"),
  preset: z.enum(["15min", "1hour", "1day", "custom"]).optional(),
});

async function checkTaskAccess(taskId: string, userId: string) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      list: {
        with: {
          space: true,
        },
      },
    },
  });

  if (!task) return null;

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, task.list.space.workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });

  if (!membership) return null;

  return { task, membership };
}

// Calculate remindAt based on preset
function calculateRemindAt(preset: ReminderPreset, dueDate: Date | null): Date | null {
  if (!dueDate) return null;
  
  const baseDate = new Date(dueDate);
  
  switch (preset) {
    case "15min":
      return new Date(baseDate.getTime() - 15 * 60 * 1000);
    case "1hour":
      return new Date(baseDate.getTime() - 60 * 60 * 1000);
    case "1day":
      return new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);
    case "custom":
    default:
      return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const access = await checkTaskAccess(taskId, session.user.id);

    if (!access) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    const taskReminders = await db.query.reminders.findMany({
      where: eq(reminders.taskId, taskId),
      orderBy: [desc(reminders.remindAt)],
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ reminders: taskReminders });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const access = await checkTaskAccess(taskId, session.user.id);

    if (!access) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createReminderSchema.parse(body);

    let remindAtDate: Date;

    // If preset is provided and task has a due date, calculate remindAt
    if (validatedData.preset && validatedData.preset !== "custom" && access.task.dueDate) {
      const calculatedDate = calculateRemindAt(validatedData.preset, new Date(access.task.dueDate));
      if (!calculatedDate) {
        return NextResponse.json(
          { error: "Task has no due date to calculate reminder from" },
          { status: 400 }
        );
      }
      remindAtDate = calculatedDate;
    } else {
      // Use the provided remindAt time
      remindAtDate = new Date(validatedData.remindAt);
    }

    // Check if a reminder already exists for this exact time
    const existingReminder = await db.query.reminders.findFirst({
      where: and(
        eq(reminders.taskId, taskId),
        eq(reminders.userId, session.user.id),
        eq(reminders.remindAt, remindAtDate)
      ),
    });

    if (existingReminder) {
      return NextResponse.json(
        { error: "A reminder already exists for this time" },
        { status: 409 }
      );
    }

    const [reminder] = await db
      .insert(reminders)
      .values({
        taskId,
        userId: session.user.id,
        remindAt: remindAtDate,
        type: validatedData.type,
      })
      .returning();

    // Get user info for response
    const reminderWithUser = await db.query.reminders.findFirst({
      where: eq(reminders.id, reminder.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ reminder: reminderWithUser }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating reminder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const access = await checkTaskAccess(taskId, session.user.id);

    if (!access) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const reminderId = searchParams.get("reminderId");

    if (!reminderId) {
      return NextResponse.json({ error: "reminderId is required" }, { status: 400 });
    }

    // Verify reminder belongs to this task and user owns it
    const reminder = await db.query.reminders.findFirst({
      where: and(
        eq(reminders.id, reminderId),
        eq(reminders.taskId, taskId)
      ),
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    // Only allow the reminder owner or task creator to delete
    if (reminder.userId !== session.user.id && access.task.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized to delete this reminder" }, { status: 403 });
    }

    await db.delete(reminders).where(eq(reminders.id, reminderId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
