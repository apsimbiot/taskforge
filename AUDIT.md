# TaskForge Application Audit

**Date:** 2026-02-22  
**App:** TaskForge (ClickUp-clone)  
**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, shadcn/ui, Drizzle ORM, Postgres

---

## Critical Issues (Broken/Non-functional)

- [ ] **Settings page does not exist** — `sidebar.tsx` has a Settings button that does nothing (no route). Users cannot access workspace or user settings.

- [ ] **Logout button does not exist** — No logout functionality in the UI. Users are stuck in the session.

- [ ] **User profile/settings not accessible** — No way to change name, password, avatar, or view account settings.

- [ ] **Workspace settings not accessible** — No way to manage workspace name, members, or invites.

- [ ] **Task deletion not implemented** — `task-detail-panel.tsx` has no delete button. API supports DELETE at `/api/tasks/[id]` but no UI trigger.

- [ ] **Assignee picker missing in Task Detail Panel** — Users cannot assign/reassign tasks to team members in the side panel.

- [ ] **Label management missing** — No UI to create, edit, or assign labels to tasks. The API exists but no frontend.

- [ ] **Status customization per list missing** — Users cannot customize statuses for individual lists. The API has statuses but no management UI.

- [ ] **Drag-drop reordering in sidebar not implemented** — Spaces, folders, and lists cannot be reordered via drag-drop. Only collapsible.

- [ ] **Gantt view is placeholder only** — List page has Gantt button but shows "Coming soon" with no implementation.

- [ ] **Task navigation from notifications broken** — `notifications.tsx` tries to route to `/dashboard/tasks/${entityId}` but tasks are at `/workspaces/{id}/spaces/{id}/lists/{id}`.

---

## Native Elements Needing Theming

- [ ] **Status dropdown** — `task-detail-panel.tsx:201` — Uses native `<select>` for status — replace with shadcn/ui `Select`
- [ ] **Priority dropdown** — `task-detail-panel.tsx:225` — Uses native `<select>` for priority — replace with shadcn/ui `Select`
- [ ] **Parent document selector** — `docs/page.tsx:220` — Uses native `<select>` — replace with shadcn/ui `Select`
- [ ] **Form field type selector** — `forms/page.tsx:239` — Uses native `<select>` — replace with shadcn/ui `Select`
- [ ] **Public form field type** — `(public)/forms/[slug]/page.tsx:173` — Uses native `<select>` — replace with shadcn/ui `Select`
- [ ] **Date picker** — `task-detail-panel.tsx:249` — Uses native `<input type="date">` — replace with shadcn/ui `DatePicker` or `Calendar`
- [ ] **Start/End date pickers** — `sprints/page.tsx` — Uses native `<Input type="date">` — replace with shadcn/ui `DatePicker`
- [ ] **Reports date filters** — `reports/page.tsx` — Uses native `<Input type="date">` — replace with shadcn/ui `DatePicker`
- [ ] **Checkbox** — `forms/page.tsx:252` — Uses native `<input type="checkbox">` for "Required" field — replace with shadcn/ui `Checkbox`
- [ ] **Native textarea** — `task-detail-panel.tsx:283` — Uses plain `<textarea>` for description — could use shadcn/ui `Textarea`

---

## Missing User Flows

- [ ] **User logout flow** — Need logout button + NextAuth signOut + redirect
- [ ] **User profile editing** — Name, avatar, password change
- [ ] **Workspace settings** — Rename workspace, manage members, invite users
- [ ] **Task deletion flow** — Delete button in task panel with confirmation
- [ ] **Bulk task actions** — Select multiple tasks, bulk status change, delete, assign
- [ ] **Assignee picker UI** — Modal or dropdown to assign users to tasks
- [ ] **Label management UI** — Create/edit labels, assign colors
- [ ] **Status management per list** — Add/edit/remove statuses for a list
- [ ] **Sidebar drag-drop reordering** — Reorder spaces, folders, lists via drag-drop

---

## Basic/Incomplete Pages

- [ ] **Settings page** — Does not exist. Link in sidebar does nothing.
- [ ] **Gantt view** — List page has Gantt tab but shows "Coming soon" placeholder
- [ ] **Docs editor** — Docs page exists (`/docs/[docId]`) but the file appears empty/missing
- [ ] **Sprint detail page** — `/sprints/[sprintId]` exists but needs verification
- [ ] **Workload page** — Shows workload but lacks capacity settings per user
- [ ] **Reports page** — Only shows time reports; needs task completion reports, burndown charts

---

## UI/UX Polish Items

- [ ] **Missing empty states** — Some pages could use better empty states with CTAs
- [ ] **Loading states inconsistent** — Some areas have skeletons, others don't
- [ ] **No error toasts** — API errors don't show user-friendly error messages (except via sonner)
- [ ] **Form validation feedback** — Login page shows error but forms don't show inline validation
- [ ] **Task card hover states** — Could show more actions on hover (edit, delete, assign)
- [ ] **Breadcrumb truncation** — Long paths may overflow in breadcrumb
- [ ] **Keyboard shortcuts incomplete** — Keyboard shortcuts dialog exists but shortcuts like "N" for new task aren't wired up

---

## API-Frontend Gaps

- [ ] **API has task deletion** — `/api/tasks/[id]` DELETE exists but no UI to trigger it
- [ ] **API has task assignees** — `/api/tasks/[id]/assignees` exists but no UI to manage
- [ ] **API has labels** — Schema has labels but no frontend hooks/UI
- [ ] **API has status management** — `/api/lists/[id]/statuses` exists but no UI
- [ ] **API has workspace members** — `/api/workspaces/[id]/members` exists but no UI to view/manage
- [ ] **API has search** — `/api/search` works via Cmd+K, but could show more results
- [ ] **Sprint burndown API** — `/api/sprints/[id]/burndown` exists but no UI uses it
- [ ] **SSE for real-time** — SSE connection established but could be used for more live updates

---

## Dashboard Issues

- [ ] **Dashboard shows "No data" with 8 tasks** — Need to verify frontend is correctly consuming API response. The dashboard API returns:
  - `stats.totalTasks`
  - `stats.completed`
  - `stats.inProgress`
  - `stats.overdue`
  - `tasksByStatus`
  - `tasksCompletedPerDay`
  - `workloadPerAssignee`
  - `overdueTasks`
  
  Frontend accesses: `stats?.stats?.totalTasks`, `stats?.tasksByStatus`, etc. May need to verify API response shape matches frontend expectations. Status mismatch in API was fixed but frontend may still have issues.

---

## Summary

### High Priority
1. Settings & Logout — Basic user account functionality missing
2. Task deletion — No way to remove tasks
3. Task assignment — Can't assign tasks to users
4. Notification navigation — Broken routing to tasks

### Medium Priority  
1. Native HTML elements — Need shadcn/ui replacements
2. Gantt view — Remove or implement
3. Labels & Status customization — API exists but no UI

### Low Priority
1. UI polish — Loading states, error handling
2. Keyboard shortcuts — Wire up missing shortcuts
3. Sidebar drag-drop — Nice to have
