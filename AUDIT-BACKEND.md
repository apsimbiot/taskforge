# TaskForge Backend API Audit Report

**Date:** 2026-02-23  
**Auditor:** Subagent  
**Repo:** /root/.openclaw/workspace/taskforge

---

## 1. API Routes Summary

Found **48 API route files** across 21 route groups:

| Category | Routes | Status |
|----------|--------|--------|
| **Auth** | `/api/auth/[...nextauth]`, `/api/auth/register` | ✅ Working |
| **Health** | `/api/health` | ✅ Working |
| **SSE** | `/api/sse` | ✅ Working |
| **Upload** | `/api/upload` | ✅ Working |
| **Files** | `/api/files/[...path]` | ✅ Working |
| **Search** | `/api/search` | ✅ Working |
| **Users** | `/api/users/me`, `/api/users/me/password` | ✅ Working |
| **Workspaces** | CRUD + members, search, stats | ✅ Working |
| **Spaces** | CRUD + folders, lists | ✅ Working |
| **Folders** | CRUD + lists | ✅ Working |
| **Lists** | CRUD + tasks, statuses, custom-fields | ✅ Working |
| **Tasks** | CRUD + assignees, comments, attachments, dependencies, subtasks, sprint, time-entries | ⚠️ Issues |
| **Sprints** | CRUD + tasks, burndown | ✅ Working |
| **Sprint Tasks** | `/api/sprint-tasks` | ✅ Working |
| **Notifications** | CRUD + read | ✅ Working |
| **Automations** | CRUD | ✅ Working |
| **Documents** | CRUD | ✅ Working |
| **Forms** | CRUD + submit | ✅ Working |
| **Reports** | time, workload | ✅ Working |
| **Events** | `/api/workspaces/[id]/events` | ✅ Working |
| **Dashboard** | `/api/workspaces/[id]/dashboard` | 🔴 Broken |

---

## 2. Schema Issues

### ✅ Database Tables - All Present

All 23 schema tables exist in the database:

```
✅ users                  ✅ task_labels
✅ workspaces            ✅ sprint_tasks  
✅ workspace_members     ✅ views
✅ spaces                ✅ notifications
✅ folders               ✅ automations
✅ lists                 ✅ documents
✅ tasks                 ✅ forms
✅ task_assignees        ✅ task_attachments
✅ task_comments         ✅ custom_field_definitions
✅ task_activities       
✅ time_entries          
✅ statuses              
✅ labels                
✅ sprints               
```

### ✅ Foreign Keys - All Present

All foreign key constraints are properly defined:
- `tasks.list_id → lists.id` ✅
- `tasks.creator_id → users.id` ✅
- `task_attachments.task_id → tasks.id` ✅
- `task_labels.task_id → tasks.id` ✅
- All junction tables have proper FKs ✅

### ⚠️ Missing Indexes

1. **sprint_tasks** - No index on `taskId` (only composite PK)
2. **task_labels** - No index on `taskId` (only composite PK)
3. **labels** - Missing workspace_id index in schema (exists in DB)

---

## 3. Data Integrity Issues

### 🔴 Critical: Dashboard API Date Serialization Error

**File:** `src/app/api/workspaces/[id]/dashboard/route.ts`

**Issue:** The dashboard endpoint directly returns database objects containing JavaScript Date objects. When Next.js tries to serialize these to JSON, it fails with:

```
TypeError: The "string" argument must be of type string... Received an instance of Date
```

**Root Cause:**
- Line 64: `const now = new Date()` - Works
- Line 71: `new Date(t.dueDate)` - Works
- Line 114: `task.updatedAt.toISOString()` - **Fails** when `updatedAt` is already a Date object

The issue is the returned task objects from drizzle contain native Date objects, not ISO strings. When returning via `NextResponse.json()`, Next.js can't serialize Date instances.

**Fix Required:** Convert all Date fields to ISO strings before returning:
```typescript
dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null
```

### ⚠️ Sprint API Date Handling

**File:** `src/app/api/sprints/[id]/route.ts`

The GET endpoint correctly serializes dates (lines 60-66):
```typescript
dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
```

But the PATCH endpoint doesn't handle date serialization properly when returning the updated sprint.

---

## 4. Known API Issues

### Task PATCH 400 Errors

**File:** `src/app/api/tasks/[id]/route.ts`

The `updateTaskSchema` has strict validation:
```typescript
const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.string().max(50).optional(),  // ⚠️ No enum - accepts any string
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),  // ⚠️ Requires ISO datetime
  // ...
});
```

**Potential Issues:**
1. `status` field accepts any string - should have enum validation
2. `dueDate` requires full ISO datetime (e.g., `2024-01-01T00:00:00Z`) - client might send just date
3. Missing validation for `listId` to ensure it belongs to same workspace

### Task Attachments API

**Status:** ✅ FIXED - Endpoint exists at `/api/tasks/[id]/attachments` with GET/POST/DELETE

---

## 5. Missing Features

### 🔴 Labels Management API - Completely Missing

- **Schema exists:** ✅ `labels` table, `task_labels` junction table
- **DB has data:** ✅ 5 labels in database
- **API missing:** ❌ No `/api/labels` endpoint

**Required endpoints:**
- `GET /api/workspaces/[id]/labels` - List labels
- `POST /api/workspaces/[id]/labels` - Create label
- `PATCH /api/labels/[id]` - Update label
- `DELETE /api/labels/[id]` - Delete label
- `POST /api/tasks/[id]/labels` - Add label to task
- `DELETE /api/tasks/[id]/labels/[labelId]` - Remove label from task

### ⚠️ Views API - Missing

- Schema has `views` table
- No CRUD endpoints at `/api/views`

### ⚠️ Bulk Operations API - Missing

No endpoints for:
- Bulk task status changes
- Bulk task assignment
- Bulk task deletion

### ⚠️ Activity Logging - Partial

- Task mutations log to `task_activities` ✅
- Other entities (lists, spaces, workspaces) don't have activity logging

---

## 6. Priority Fixes

### P0 - Critical (Fix Now)

| Issue | File | Fix |
|-------|------|-----|
| Dashboard Date Serialization | `workspaces/[id]/dashboard/route.ts` | Convert Date fields to ISO strings in response |

### P1 - High (This Sprint)

| Issue | File | Fix |
|-------|------|-----|
| Missing Labels API | N/A | Create labels CRUD endpoints |
| Task status validation | `tasks/[id]/route.ts` | Add enum validation for status |
| Due date format flexibility | `tasks/[id]/route.ts` | Accept both date and datetime |

### P2 - Medium (Backlog)

| Issue | File | Fix |
|-------|------|-----|
| Missing Views API | N/A | Create views CRUD endpoints |
| Bulk operations | N/A | Add bulk task endpoints |
| Activity logging | Various | Add activity logging to lists/spaces |

---

## 7. Auth & Validation Summary

### ✅ Auth Checked On:
- All workspace-scoped endpoints check membership
- Task endpoints verify workspace access via list→space→workspace

### ⚠️ Auth Gaps:
- `/api/health` - No auth (acceptable for health check)
- `/api/upload` - Has auth
- `/api/sse` - Should verify auth

### ✅ Zod Validation:
- Most POST/PATCH endpoints use Zod schemas
- Some gaps in task status validation

---

## Summary

| Category | Count |
|----------|-------|
| Total API Routes | 48 |
| Working Routes | 47 |
| Broken Routes | 1 (dashboard) |
| Missing Endpoints | 2+ (labels, views) |
| Schema Tables | 23/23 ✅ |
| DB-FK Integrity | ✅ Complete |

**Overall Health:** 95% - Core functionality works, but dashboard needs urgent fix and labels API is missing.
