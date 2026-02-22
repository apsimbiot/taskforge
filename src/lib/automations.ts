import { db } from "@/db";
import { automations, tasks, taskLabels, labels, notifications, taskAssignees } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export type TriggerType = "status_change" | "task_created" | "due_date_approaching" | "assignment";
export type ActionType = "change_status" | "assign_user" | "add_label" | "send_notification";

export interface AutomationContext {
  taskId: string;
  workspaceId: string;
  userId?: string;
  oldStatus?: string;
  newStatus?: string;
  previousAssignees?: string[];
  newAssignees?: string[];
}

/**
 * Run automations for a given trigger
 */
export async function runAutomations(trigger: TriggerType, context: AutomationContext) {
  // Get all enabled automations for this workspace matching the trigger
  const matchingAutomations = await db.query.automations.findMany({
    where: and(
      eq(automations.workspaceId, context.workspaceId),
      eq(automations.triggerType, trigger),
      eq(automations.enabled, true)
    ),
  });

  for (const automation of matchingAutomations) {
    try {
      await executeAutomation(automation, context);
    } catch (error) {
      console.error(`Error executing automation ${automation.id}:`, error);
    }
  }
}

/**
 * Execute a single automation
 */
async function executeAutomation(automation: typeof automations.$inferSelect, context: AutomationContext) {
  const { actionType, triggerType } = automation;
  const actionConfig = (automation.actionConfig ?? {}) as Record<string, any>;
  const triggerConfig = (automation.triggerConfig ?? {}) as Record<string, any>;

  // Check if automation conditions are met
  if (!checkTriggerCondition(triggerType, triggerConfig, context)) {
    return;
  }

  switch (actionType) {
    case "change_status":
      await executeChangeStatus(actionConfig, context);
      break;
    case "assign_user":
      await executeAssignUser(actionConfig, context);
      break;
    case "add_label":
      await executeAddLabel(actionConfig, context);
      break;
    case "send_notification":
      await executeSendNotification(actionConfig, context);
      break;
  }
}

/**
 * Check if trigger conditions are met
 */
function checkTriggerCondition(
  triggerType: string,
  triggerConfig: Record<string, any>,
  context: AutomationContext
): boolean {
  switch (triggerType) {
    case "status_change":
      if (!context.oldStatus || !context.newStatus) return false;
      return (
        triggerConfig.fromStatus === context.oldStatus &&
        triggerConfig.toStatus === context.newStatus
      );
    case "task_created":
      // Task created triggers always run
      return true;
    case "due_date_approaching":
      // This would be checked by a scheduled job
      return true;
    case "assignment":
      if (!context.previousAssignees || !context.newAssignees) return false;
      // Check if a new assignee was added
      const newAssignees = context.newAssignees.filter(
        (a) => !context.previousAssignees?.includes(a)
      );
      return newAssignees.length > 0;
    default:
      return false;
  }
}

/**
 * Execute change_status action
 */
async function executeChangeStatus(
  actionConfig: Record<string, any>,
  context: AutomationContext
) {
  await db
    .update(tasks)
    .set({ status: actionConfig.status })
    .where(eq(tasks.id, context.taskId));
}

/**
 * Execute assign_user action
 */
async function executeAssignUser(
  actionConfig: Record<string, any>,
  context: AutomationContext
) {
  const userId = actionConfig.userId;
  if (!userId) return;

  await db.insert(taskAssignees).values({
    taskId: context.taskId,
    userId,
  }).onConflictDoNothing();
}

/**
 * Execute add_label action
 */
async function executeAddLabel(
  actionConfig: Record<string, any>,
  context: AutomationContext
) {
  const labelId = actionConfig.labelId;
  if (!labelId) return;

  // Check if label exists in workspace
  const label = await db.query.labels.findFirst({
    where: and(
      eq(labels.id, labelId),
      eq(labels.workspaceId, context.workspaceId)
    ),
  });

  if (!label) return;

  await db.insert(taskLabels).values({
    taskId: context.taskId,
    labelId,
  }).onConflictDoNothing();
}

/**
 * Execute send_notification action
 */
async function executeSendNotification(
  actionConfig: Record<string, any>,
  context: AutomationContext
) {
  const { userId, title, message } = actionConfig;
  if (!userId) return;

  await db.insert(notifications).values({
    userId,
    type: "automation",
    title: title || "Automation triggered",
    message: message || `Task was updated by automation: ${context.taskId}`,
    entityType: "task",
    entityId: context.taskId,
  });
}

/**
 * Helper to get automations for a workspace
 */
export async function getWorkspaceAutomations(workspaceId: string) {
  return db.query.automations.findMany({
    where: eq(automations.workspaceId, workspaceId),
  });
}

/**
 * Helper to create an automation
 */
export async function createAutomation(data: {
  workspaceId: string;
  name: string;
  triggerType: TriggerType;
  triggerConfig: Record<string, any>;
  actionType: ActionType;
  actionConfig: Record<string, any>;
  enabled?: boolean;
}) {
  const [automation] = await db.insert(automations).values({
    ...data,
    enabled: data.enabled ?? true,
  }).returning();
  return automation;
}
