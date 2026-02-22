import { db } from "@/db";
import { notifications } from "@/db/schema";

// Notification types
export type NotificationType = 
  | "task_assigned"
  | "task_completed"
  | "comment_added"
  | "mention"
  | "sprint_started"
  | "sprint_ended"
  | "sprint_completed";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
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
