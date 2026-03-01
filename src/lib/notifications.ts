import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendTaskAssignedEmail, sendMentionEmail, sendTaskDueSoonEmail } from "./email";

// Notification types
export type NotificationType = 
  | "task_assigned"
  | "task_completed"
  | "comment_added"
  | "mention"
  | "sprint_started"
  | "sprint_ended"
  | "sprint_completed"
  | "task_due_soon";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  taskTitle?: string;
  mentionedBy?: string;
  assignedBy?: string;
  dueDate?: Date;
}

/**
 * Check if user has email notifications enabled
 */
async function shouldSendEmail(userId: string): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        emailNotifications: true,
        email: true,
      },
    });
    return user?.emailNotifications !== false && !!user?.email;
  } catch {
    return false;
  }
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  const [notification] = await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message || null,
    entityType: params.entityType || null,
    entityId: params.entityId || null,
  }).returning();

  // Try to send email notification (async, don't await)
  const sendEmail = async () => {
    const shouldEmail = await shouldSendEmail(params.userId);
    if (!shouldEmail) return;

    const user = await db.query.users.findFirst({
      where: eq(users.id, params.userId),
      columns: { email: true, name: true },
    });
    if (!user?.email) return;

    try {
      switch (params.type) {
        case "task_assigned":
          if (params.taskTitle && params.assignedBy) {
            await sendTaskAssignedEmail(user.email, params.taskTitle, params.assignedBy);
          }
          break;
        case "mention":
          if (params.taskTitle && params.mentionedBy) {
            await sendMentionEmail(user.email, params.taskTitle, params.mentionedBy);
          }
          break;
        case "task_due_soon":
          if (params.taskTitle && params.dueDate) {
            await sendTaskDueSoonEmail(user.email, params.taskTitle, params.dueDate);
          }
          break;
      }
    } catch (error) {
      console.error("[Notifications] Failed to send email:", error);
    }
  };

  sendEmail();

  return notification;
}

/**
 * Parse @mentions from content and return unique usernames
 */
export function parseMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1].toLowerCase();
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }

  return mentions;
}

/**
 * Get user IDs by usernames (for @mentions)
 */
export async function getUsersByUsernames(usernames: string[]) {
  if (usernames.length === 0) return [];

  const { users } = await import("@/db/schema");
  const { ilike, inArray, or } = await import("drizzle-orm");

  // Build OR conditions for each username
  const conditions = usernames.map((username) => 
    ilike(users.name, username)
  );

  const foundUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(or(...conditions));

  return foundUsers;
}

/**
 * Create notifications for @mentions in content
 */
export async function notifyMentions(
  content: string,
  mentionedByUserId: string,
  entityType: string,
  entityId: string
) {
  const usernames = parseMentions(content);
  if (usernames.length === 0) return [];

  const mentionedUsers = await getUsersByUsernames(usernames);
  
  const createdNotifications = [];
  for (const user of mentionedUsers) {
    // Don't notify the user who created the mention
    if (user.id === mentionedByUserId) continue;

    const notification = await createNotification({
      userId: user.id,
      type: "mention",
      title: `You were mentioned by ${user.name}`,
      message: `You were mentioned in a ${entityType}`,
      entityType,
      entityId,
    });
    createdNotifications.push(notification);
  }

  return createdNotifications;
}
