import { db } from "@/db";
import { reminders, notifications } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";

/**
 * Check for pending reminders and create notifications
 * This should be called periodically (e.g., via cron or API)
 * @returns Number of reminders that were processed
 */
export async function checkAndSendReminders(): Promise<number> {
  const now = new Date();

  // Find all reminders that are due (remindAt <= now) and not sent
  const pendingReminders = await db.query.reminders.findMany({
    where: and(
      eq(reminders.sent, false),
      lte(reminders.remindAt, now)
    ),
    with: {
      task: {
        with: {
          list: {
            with: {
              space: true,
            },
          },
        },
      },
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (pendingReminders.length === 0) {
    return 0;
  }

  let sentCount = 0;

  for (const reminder of pendingReminders) {
    try {
      // Create a notification for the user
      const taskTitle = reminder.task?.title || "Untitled Task";
      const dueDateStr = reminder.task?.dueDate 
        ? new Date(reminder.task.dueDate).toLocaleDateString()
        : "No due date";

      await db.insert(notifications).values({
        userId: reminder.userId,
        type: "task_reminder",
        title: `Reminder: ${taskTitle}`,
        message: `Task "${taskTitle}" is due on ${dueDateStr}`,
        entityType: "task",
        entityId: reminder.taskId,
      });

      // Mark reminder as sent
      await db
        .update(reminders)
        .set({ sent: true })
        .where(eq(reminders.id, reminder.id));

      sentCount++;
    } catch (error) {
      console.error(`Error processing reminder ${reminder.id}:`, error);
      // Continue with other reminders even if one fails
    }
  }

  return sentCount;
}

/**
 * Auto-create a reminder for 1 day before due date
 * Called when a task gets a due date set
 * @param taskId - The task ID
 * @param userId - The user setting the due date
 * @param dueDate - The due date that was set
 */
export async function autoCreateDueDateReminder(
  taskId: string,
  userId: string,
  dueDate: Date
): Promise<void> {
  // Calculate 1 day before due date
  const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);

  // Only create reminder if it's in the future
  if (oneDayBefore <= new Date()) {
    return;
  }

  // Check if a reminder already exists for 1 day before
  const existingReminder = await db.query.reminders.findFirst({
    where: and(
      eq(reminders.taskId, taskId),
      eq(reminders.userId, userId),
      eq(reminders.sent, false)
    ),
  });

  if (existingReminder) {
    return;
  }

  // Create the reminder
  await db.insert(reminders).values({
    taskId,
    userId,
    remindAt: oneDayBefore,
    type: "notification",
  });
}

/**
 * Create a reminder for a specific user
 * @param taskId - The task ID
 * @param userId - The user to remind
 * @param remindAt - When to remind
 * @param type - Reminder type (notification, email, both)
 */
export async function createReminder(
  taskId: string,
  userId: string,
  remindAt: Date,
  type: "notification" | "email" | "both" = "notification"
) {
  const [reminder] = await db
    .insert(reminders)
    .values({
      taskId,
      userId,
      remindAt,
      type,
    })
    .returning();

  return reminder;
}

/**
 * Delete a reminder by ID
 * @param reminderId - The reminder ID
 */
export async function deleteReminder(reminderId: string) {
  await db.delete(reminders).where(eq(reminders.id, reminderId));
}

/**
 * Get all reminders for a specific task
 * @param taskId - The task ID
 */
export async function getTaskReminders(taskId: string) {
  return db.query.reminders.findMany({
    where: eq(reminders.taskId, taskId),
  });
}

/**
 * Get all pending reminders for a user
 * @param userId - The user ID
 */
export async function getUserPendingReminders(userId: string) {
  return db.query.reminders.findMany({
    where: and(
      eq(reminders.userId, userId),
      eq(reminders.sent, false),
      lte(reminders.remindAt, new Date())
    ),
    with: {
      task: true,
    },
  });
}
