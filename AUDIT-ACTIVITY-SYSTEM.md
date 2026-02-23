# TaskForge Activity Tracking System Audit

**Date:** 2026-02-23  
**Status:** ⚠️ PARTIALLY IMPLEMENTED

---

## 1. Current State

### 1.1 Database Schema ✅

The `taskActivities` table exists in `src/db/schema/index.ts` (lines 184-199):

```typescript
export const taskActivities = pgTable(
  "task_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 50 }).notNull(),
    field: varchar("field", { length: 50 }),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: timestamp("created_at").defaultNow().notNotNull(),
  },
  (t) => [index("activities_task_idx").on(t.taskId)]
);
```

**Columns:** `id`, `taskId`, `userId`, `action`, `field`, `oldValue`, `newValue`, `createdAt`

**Relations:** Properly linked to `tasks` and `users` tables.

---

### 1.2 API - Activity Logging Status

| Route | Method | Action | Activity Logged? |
|-------|--------|--------|------------------|
| `/api/tasks/[id]` | PATCH | Field updates (title, description, status, priority, dueDate, etc.) | ✅ **YES** |
| `/api/tasks/[id]/subtasks` | POST | Subtask created | ✅ **YES** |
| `/api/tasks/[id]/subtasks` | DELETE | Subtask deleted | ❌ **NO** |
| `/api/tasks/[id]/comments` | POST | Comment added | ❌ **NO** |
| `/api/tasks/[id]/comments` | DELETE | Comment deleted | ❌ **NO** |
| `/api/tasks/[id]/attachments` | POST | Attachment uploaded | ❌ **NO** |
| `/api/tasks/[id]/attachments` | DELETE | Attachment deleted | ❌ **NO** |
| `/api/tasks/[id]/assignees` | POST | Assignee added | ❌ **NO** |
| `/api/tasks/[id]/assignees` | DELETE | Assignee removed | ❌ **NO** |
| `/api/tasks/[id]/time-entries` | POST (start) | Timer started | ❌ **NO** |
| `/api/tasks/[id]/time-entries` | POST (stop) | Timer stopped | ❌ **NO** |
| `/api/tasks/[id]/dependencies` | POST | Dependency added | ✅ **YES** |
| `/api/tasks/[id]/dependencies` | DELETE | Dependency removed | ✅ **YES** |
| `/api/lists/[id]/tasks` | POST | Task created | ✅ **YES** |
| `/api/tasks/[id]` | DELETE | Task deleted | ❌ **NO** |

---

### 1.3 UI - Activity Display (task-detail-panel.tsx)

**Location:** Lines 1527-1580

The Activity tab shows **MOCK/HARDCODE data**, NOT real activities:

```tsx
// Line 1532 - HARDCODED, not from API
<ActivityItem
  avatar={null}
  name="System"
  action="created this task"
  timestamp={task.createdAt}
  icon={<Plus className="h-3 w-3" />}
/>

// Line 1537-1545 - MOCK DATA, not from activity log
{currentStatus && (
  <ActivityItem
    avatar={null}
    name="System"
    action={`changed status to ${currentStatus.name}`}
    timestamp={task.updatedAt}
    icon={<ArrowUpRight className="h-3 w-3" />}
  />
)}
```

**Problem:** The task detail panel is NOT rendering the `activities` array from the API response!

The GET endpoint (`/api/tasks/[id]`) DOES return activities (lines 93-102 in route.ts):
```typescript
activities: {
  with: {
    user: {
      columns: { id: true, name: true },
    },
  },
  orderBy: (activities, { desc }) => [desc(activities.createdAt)],
  limit: 50,
},
```

But the UI is ignoring them and showing hardcoded mock items.

---

## 2. What's Missing

### Critical Gaps

1. **UI Not Rendering Real Activities** - The `activities` array from API is ignored
2. **Comment Activities** - No logging when comments are added/deleted
3. **Attachment Activities** - No logging when files are uploaded/deleted
4. **Assignee Activities** - No logging when assignees are added/removed
5. **Time Tracking Activities** - No logging for timer start/stop
6. **Subtask Delete** - No logging when subtask is deleted
7. **Task Delete** - No logging when task is deleted

### Partially Working

- **Task Updates (PATCH)** - Logs field changes but converts all values to strings (loses type info)
- **Subtask Creation** - Logs but uses `newValue: subtask.id` which isn't descriptive

---

## 3. Implementation Plan

### Priority 1: Fix UI to Show Real Activities

**File:** `src/components/task-detail-panel.tsx`

The component receives `activities` from the API but ignores them. Replace hardcoded mock items with real activity rendering.

**Current code (lines 1527-1545):**
```tsx
{/* Mock: Created task */}
<ActivityItem
  avatar={null}
  name="System"
  action="created this task"
  timestamp={task.createdAt}
  icon={<Plus className="h-3 w-3" />}
/>

{/* Mock: Status change */}
{currentStatus && (
  <ActivityItem
    avatar={null}
    name="System"
    action={`changed status to ${currentStatus.name}`}
    timestamp={task.updatedAt}
    icon={<ArrowUpRight className="h-3 w-3" />}
  />
)}
```

**Replace with:**
```tsx
{/* Real activities from API */}
{activities && activities.length > 0 ? (
  activities.map((activity) => (
    <ActivityItem
      key={activity.id}
      avatar={activity.user?.avatarUrl}
      name={activity.user?.name || "System"}
      action={formatActivityAction(activity)}
      timestamp={activity.createdAt}
      icon={getActivityIcon(activity.action)}
    />
  ))
) : (
  <p className="text-xs text-muted-foreground italic text-center py-4">No activity yet</p>
)}
```

Add helper functions:
```tsx
function formatActivityAction(activity: TaskActivity): string {
  const { action, field, oldValue, newValue } = activity;
  
  switch (action) {
    case "created":
      return "created this task";
    case "updated":
      if (field === "status") return `changed status from ${oldValue} to ${newValue}`;
      if (field === "priority") return `changed priority from ${oldValue} to ${newValue}`;
      if (field === "title") return `changed title to "${newValue}"`;
      if (field === "description") return "updated description";
      if (field === "dueDate") return `changed due date to ${newValue}`;
      return `changed ${field} from ${oldValue} to ${newValue}`;
    case "subtask_created":
      return "added a subtask";
    case "subtask_deleted":
      return "removed a subtask";
    case "comment_added":
      return "added a comment";
    case "comment_deleted":
      return "deleted a comment";
    case "attachment_added":
      return "attached a file";
    case "attachment_deleted":
      return "removed an attachment";
    case "assignee_added":
      return `added ${newValue} as assignee`;
    case "assignee_removed":
      return `removed ${oldValue} from assignees`;
    case "timer_started":
      return "started tracking time";
    case "timer_stopped":
      return `stopped tracking time (${newValue})`;
    case "dependency_added":
      return `added dependency: ${newValue}`;
    case "dependency_removed":
      return `removed dependency: ${oldValue}`;
    default:
      return action;
  }
}

function getActivityIcon(action: string): React.ReactNode {
  switch (action) {
    case "created": return <Plus className="h-3 w-3" />;
    case "updated": return <Edit3 className="h-3 w-3" />;
    case "subtask_created": return <CheckSquare className="h-3 w-3" />;
    case "subtask_deleted": return <XSquare className="h-3 w-3" />;
    case "comment_added": return <MessageSquare className="h-3 w-3" />;
    case "attachment_added": return <Paperclip className="h-3 w-3" />;
    case "assignee_added": return <UserPlus className="h-3 w-3" />;
    case "timer_started": return <Play className="h-3 w-3" />;
    case "timer_stopped": return <Square className="h-3 w-3" />;
    default: return <Activity className="h-3 w-3" />;
  }
}
```

---

### Priority 2: Add Comment Activity Logging

**File:** `src/app/api/tasks/[id]/comments/route.ts`

Add after comment creation (after line ~100):

```typescript
// Log activity
await db.insert(taskActivities).values({
  taskId,
  userId: session.user.id,
  action: "comment_added",
  newValue: validatedData.content.substring(0, 100), // First 100 chars as preview
});
```

Add after comment deletion:

```typescript
await db.insert(taskActivities).values({
  taskId,
  userId: session.user.id,
  action: "comment_deleted",
  oldValue: comment.content.substring(0, 100),
});
```

---

### Priority 3: Add Attachment Activity Logging

**File:** `src/app/api/tasks/[id]/attachments/route.ts`

Add to POST (upload):
```typescript
await db.insert(taskActivities).values({
  taskId,
  userId: session.user.id,
  action: "attachment_added",
  newValue: filename,
});
```

Add to DELETE:
```typescript
await db.insert(taskActivities).values({
  taskId,
  userId: session.user.id,
  action: "attachment_deleted",
  oldValue: attachment.filename,
});
```

---

### Priority 4: Add Assignee Activity Logging

**File:** `src/app/api/tasks/[id]/assignees/route.ts`

Add to POST (add assignee):
```typescript
// Get user name for activity log
const assignedUser = await db.query.users.findFirst({
  where: eq(users.id, validatedData.userId),
});

await db.insert(taskActivities).values({
  taskId,
  userId: session.user.id,
  action: "assignee_added",
  newValue: assignedUser?.name || "a user",
});
```

Add to DELETE (remove assignee):
```typescript
await db.insert(taskActivities).values({
  taskId,
  userId: session.user.id,
  action: "assignee_removed",
  oldValue: assignee.userId, // Or fetch name
});
```

---

### Priority 5: Add Time Entry Activity Logging

**File:** `src/app/api/tasks/[id]/time-entries/route.ts`

After timer start (line ~175):
```typescript
await db.insert(taskActivities).values({
  taskId,
  userId: session.user.id,
  action: "timer_started",
});
```

After timer stop (line ~145):
```typescript
await db.insert(taskActivities).values({
  taskId,
  userId: session.user.id,
  action: "timer_stopped",
  newValue: `${Math.floor(duration / 60)}m`, // Duration in minutes
});
```

---

### Priority 6: Subtask Delete Activity

**File:** `src/app/api/tasks/[id]/subtasks/route.ts`

After subtask deletion (around line ~185):
```typescript
await db.insert(taskActivities).values({
  taskId,
  userId: session.user.id,
  action: "subtask_deleted",
  oldValue: subtask.title,
});
```

---

## 4. Priority Summary

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P1** | Fix UI to show real activities | Low | High |
| **P2** | Comment activity logging | Low | High |
| **P3** | Attachment activity logging | Low | Medium |
| **P4** | Assignee activity logging | Low | Medium |
| **P5** | Time tracking activity logging | Low | Medium |
| **P6** | Subtask delete logging | Low | Low |

---

## Summary

The activity tracking system has a **working foundation**:
- ✅ Database schema exists and is correct
- ✅ Task updates log field changes  
- ✅ Subtask creation logs activity
- ✅ Dependencies log activity

But it's **broken at the UI layer** (showing mock data) and **missing key integrations** (comments, attachments, assignees, time tracking).

**Immediate fix needed:** Update `task-detail-panel.tsx` to render the `activities` array that's already being returned by the API.
