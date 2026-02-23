import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, lists, spaces, workspaceMembers, timeEntries, taskActivities } from "@/db/schema";
import { eq, and, desc, isNull, isNotNull } from "drizzle-orm";
import { z } from "zod";

const createTimeEntrySchema = z.object({
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  duration: z.number().min(0).optional(),
});

const startTimerSchema = z.object({
  description: z.string().optional(),
});

const stopTimerSchema = z.object({
  description: z.string().optional(),
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

    const entries = await db.query.timeEntries.findMany({
      where: eq(timeEntries.taskId, taskId),
      orderBy: [desc(timeEntries.startTime)],
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

    // Calculate total time spent
    const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

    return NextResponse.json({ timeEntries: entries, totalTimeSpent: totalSeconds });
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Start a timer (create time entry with start_time)
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
    const action = body.action;

    // Check for running timer
    if (action === "stop") {
      // Stop the most recent running timer for this user on this task
      // A running timer has endTime=null AND duration=null (not a manual entry)
      const runningEntry = await db.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.taskId, taskId),
          eq(timeEntries.userId, session.user.id),
          isNull(timeEntries.endTime),
          isNull(timeEntries.duration)
        ),
        orderBy: [desc(timeEntries.startTime)],
      });

      if (!runningEntry) {
        return NextResponse.json({ error: "No running timer found" }, { status: 400 });
      }

      const stopData = stopTimerSchema.parse(body);
      const endTime = new Date();
      const startTime = new Date(runningEntry.startTime);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      const [updatedEntry] = await db
        .update(timeEntries)
        .set({
          endTime,
          duration,
          description: stopData.description || runningEntry.description,
        })
        .where(eq(timeEntries.id, runningEntry.id))
        .returning();

      // Update task time_spent
      const entries = await db.query.timeEntries.findMany({
        where: eq(timeEntries.taskId, taskId),
      });
      const totalTimeSpent = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
      await db.update(tasks).set({ timeSpent: totalTimeSpent }).where(eq(tasks.id, taskId));

      // Log activity
      await db.insert(taskActivities).values({
        taskId,
        userId: session.user.id,
        action: "stopped_timer",
        field: "time_tracking",
        newValue: `${Math.floor(duration / 60)} minutes`,
      });

      return NextResponse.json({ timeEntry: updatedEntry });
    }

    // Default: Start timer or add manual entry
    if (action === "start") {
      const validatedData = startTimerSchema.parse(body);

      // Check for existing running timer (endTime=null AND duration=null)
      const existingTimer = await db.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.taskId, taskId),
          eq(timeEntries.userId, session.user.id),
          isNull(timeEntries.endTime),
          isNull(timeEntries.duration)
        ),
      });

      if (existingTimer) {
        return NextResponse.json({ error: "Timer already running. Stop it first." }, { status: 400 });
      }

      const [entry] = await db
        .insert(timeEntries)
        .values({
          taskId,
          userId: session.user.id,
          startTime: new Date(),
          description: validatedData.description,
        })
        .returning();

      // Log activity
      await db.insert(taskActivities).values({
        taskId,
        userId: session.user.id,
        action: "started_timer",
        field: "time_tracking",
      });

      return NextResponse.json({ timeEntry: entry }, { status: 201 });
    }

    // Manual time entry
    const validatedData = createTimeEntrySchema.parse(body);
    
    let startTime: Date;
    let endTime: Date | null = null;
    let duration: number | null = null;

    if (validatedData.startTime) {
      startTime = new Date(validatedData.startTime);
    } else {
      startTime = new Date();
    }

    if (validatedData.endTime) {
      endTime = new Date(validatedData.endTime);
      duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    } else if (validatedData.duration !== undefined) {
      duration = validatedData.duration;
    }

    const [entry] = await db
      .insert(timeEntries)
      .values({
        taskId,
        userId: session.user.id,
        startTime,
        endTime,
        duration,
        description: validatedData.description,
      })
      .returning();

    // Update task time_spent if duration was provided
    if (duration) {
      const entries = await db.query.timeEntries.findMany({
        where: eq(timeEntries.taskId, taskId),
      });
      const totalTimeSpent = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
      await db.update(tasks).set({ timeSpent: totalTimeSpent }).where(eq(tasks.id, taskId));
    }

    return NextResponse.json({ timeEntry: entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error with time entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
