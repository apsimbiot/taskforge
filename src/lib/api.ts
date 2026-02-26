const BASE_URL = "/api"

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Workspaces ──────────────────────────────────────────────────────────────
export interface WorkspaceResponse {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  createdAt: string
  role: string
}

export async function fetchWorkspaces(): Promise<WorkspaceResponse[]> {
  const data = await fetchJSON<{ workspaces: WorkspaceResponse[] }>("/workspaces")
  return data.workspaces
}

export async function createWorkspace(data: {
  name: string
  slug: string
  logoUrl?: string
}): Promise<{ workspace: WorkspaceResponse }> {
  return fetchJSON("/workspaces", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; slug?: string; logoUrl?: string }
): Promise<{ workspace: WorkspaceResponse }> {
  return fetchJSON(`/workspaces/${workspaceId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

// ── Spaces ──────────────────────────────────────────────────────────────────
export interface SpaceResponse {
  id: string
  workspaceId: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  order: number | null
  createdAt: string
}

export async function fetchSpaces(workspaceId: string): Promise<SpaceResponse[]> {
  const data = await fetchJSON<{ spaces: SpaceResponse[] }>(`/workspaces/${workspaceId}/spaces`)
  return data.spaces
}

export async function fetchSpace(spaceId: string): Promise<SpaceResponse> {
  const data = await fetchJSON<{ space: SpaceResponse }>(`/spaces/${spaceId}`)
  return data.space
}

export async function createSpace(
  workspaceId: string,
  data: { name: string; color?: string; icon?: string; description?: string }
): Promise<{ space: SpaceResponse }> {
  return fetchJSON(`/workspaces/${workspaceId}/spaces`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ── Folders ─────────────────────────────────────────────────────────────────
export interface FolderResponse {
  id: string
  spaceId: string
  name: string
  order: number | null
  createdAt: string
}

export async function fetchFolders(spaceId: string): Promise<FolderResponse[]> {
  const data = await fetchJSON<{ folders: FolderResponse[] }>(`/spaces/${spaceId}/folders`)
  return data.folders
}

export async function createFolder(
  spaceId: string,
  data: { name: string }
): Promise<{ folder: FolderResponse }> {
  return fetchJSON(`/spaces/${spaceId}/folders`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ── Lists ───────────────────────────────────────────────────────────────────
export interface ListResponse {
  id: string
  folderId: string | null
  spaceId: string
  name: string
  description: string | null
  order: number | null
  createdAt: string
}

export async function fetchFolderLists(folderId: string): Promise<ListResponse[]> {
  const data = await fetchJSON<{ lists: ListResponse[] }>(`/folders/${folderId}/lists`)
  return data.lists
}

export async function fetchSpaceLists(spaceId: string): Promise<ListResponse[]> {
  const data = await fetchJSON<{ lists: ListResponse[] }>(`/spaces/${spaceId}/lists`)
  return data.lists
}

export async function fetchList(listId: string): Promise<ListResponse> {
  const data = await fetchJSON<{ list: ListResponse }>(`/lists/${listId}`)
  return data.list
}

export async function createList(
  folderId: string,
  data: { name: string; spaceId: string }
): Promise<{ list: ListResponse }> {
  return fetchJSON(`/folders/${folderId}/lists`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ── Tasks ───────────────────────────────────────────────────────────────────
export interface ActivityResponse {
  id: string
  taskId: string
  userId: string
  action: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
  user: {
    id: string
    name: string
  }
}

export interface TaskResponse {
  id: string
  listId: string
  title: string
  description: Record<string, unknown> | null
  status: string | null
  priority: string | null
  creatorId: string
  dueDate: string | null
  timeEstimate: number | null
  timeSpent: number | null
  order: number | null
  customFields: Record<string, unknown> | null
  parentTaskId: string | null
  createdAt: string
  updatedAt: string
  activities?: ActivityResponse[]
}

export async function fetchTasks(listId: string): Promise<TaskResponse[]> {
  const data = await fetchJSON<{ tasks: TaskResponse[] }>(`/lists/${listId}/tasks`)
  return data.tasks
}

export async function createTask(
  listId: string,
  data: {
    title: string
    description?: string
    status?: string
    priority?: string
    dueDate?: string
    timeEstimate?: number
    parentTaskId?: string
  }
): Promise<{ task: TaskResponse }> {
  return fetchJSON(`/lists/${listId}/tasks`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateTask(
  taskId: string,
  data: Partial<{
    title: string
    description: string | Record<string, unknown>
    status: string
    priority: string
    dueDate: string
    timeEstimate: number
    order: number
    customFields: Record<string, unknown>
  }>
): Promise<{ task: TaskResponse }> {
  return fetchJSON(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteTask(taskId: string): Promise<void> {
  return fetchJSON(`/tasks/${taskId}`, {
    method: "DELETE",
  })
}

// ── Statuses ─────────────────────────────────────────────────────────────────
export interface StatusResponse {
  id: string
  listId: string
  name: string
  color: string | null
  order: number | null
  isDefault: boolean | null
}

export async function fetchStatuses(listId: string): Promise<StatusResponse[]> {
  const data = await fetchJSON<{ statuses: StatusResponse[] }>(`/lists/${listId}/statuses`)
  return data.statuses
}

export async function createStatus(
  listId: string,
  data: { name: string; color?: string; order?: number }
): Promise<{ status: StatusResponse }> {
  return fetchJSON(`/lists/${listId}/statuses`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateStatus(
  listId: string,
  statusId: string,
  data: { name?: string; color?: string; order?: number }
): Promise<{ status: StatusResponse }> {
  return fetchJSON(`/lists/${listId}/statuses/${statusId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteStatus(listId: string, statusId: string): Promise<void> {
  return fetchJSON(`/lists/${listId}/statuses/${statusId}`, {
    method: "DELETE",
  })
}

export async function reorderStatuses(
  listId: string,
  statusIds: string[]
): Promise<{ statuses: StatusResponse[] }> {
  return fetchJSON(`/lists/${listId}/statuses/reorder`, {
    method: "PUT",
    body: JSON.stringify({ statusIds }),
  })
}

// ── Sprints ─────────────────────────────────────────────────────────────────
export interface SprintResponse {
  id: string
  workspaceId: string
  name: string
  startDate: string
  endDate: string
  status: "planned" | "active" | "completed"
  goal: string | null
  createdAt: string
}

export interface SprintDetailResponse {
  sprint: SprintResponse
  tasks: TaskResponse[]
}

export async function fetchSprints(workspaceId: string): Promise<SprintResponse[]> {
  const data = await fetchJSON<{ sprints: SprintResponse[] }>(`/workspaces/${workspaceId}/sprints`)
  return data.sprints
}

export async function fetchSprint(sprintId: string): Promise<SprintDetailResponse> {
  return fetchJSON<SprintDetailResponse>(`/sprints/${sprintId}`)
}

export async function createSprint(
  workspaceId: string,
  data: { name: string; startDate: string; endDate: string; goal?: string }
): Promise<{ sprint: SprintResponse }> {
  return fetchJSON(`/workspaces/${workspaceId}/sprints`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateSprint(
  sprintId: string,
  data: Partial<{ name: string; startDate: string; endDate: string; status: string; goal: string }>
): Promise<{ sprint: SprintResponse }> {
  return fetchJSON(`/sprints/${sprintId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteSprint(sprintId: string): Promise<void> {
  await fetchJSON(`/sprints/${sprintId}`, { method: "DELETE" })
}

export async function addTaskToSprint(sprintId: string, taskId: string): Promise<void> {
  await fetchJSON(`/sprints/${sprintId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ taskId }),
  })
}

export async function removeTaskFromSprint(sprintId: string, taskId: string): Promise<void> {
  await fetchJSON(`/sprints/${sprintId}/tasks/${taskId}`, {
    method: "DELETE",
  })
}

export async function moveTaskBetweenSprints(
  fromSprintId: string,
  toSprintId: string,
  taskId: string
): Promise<void> {
  // First remove from old sprint, then add to new (ensures move behavior)
  await fetchJSON(`/sprint-tasks/move`, {
    method: "PUT",
    body: JSON.stringify({ fromSprintId, toSprintId, taskId }),
  })
}

// ── Notifications ─────────────────────────────────────────────────────────
export interface NotificationResponse {
  id: string
  type: string
  title: string
  message: string | null
  read: boolean
  entityType: string | null
  entityId: string | null
  createdAt: string
}

export async function fetchNotifications(unreadOnly = false): Promise<{ notifications: NotificationResponse[]; unreadCount: number }> {
  const url = unreadOnly ? "/notifications?unread=true" : "/notifications"
  return fetchJSON(url)
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await fetchJSON("/notifications", {
    method: "PATCH",
    body: JSON.stringify({ notificationId }),
  })
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetchJSON("/notifications", {
    method: "PATCH",
    body: JSON.stringify({ markAllRead: true }),
  })
}

// ── Dashboard Stats ───────────────────────────────────────────────────────
export interface DashboardStats {
  stats: {
    totalTasks: number
    completed: number
    inProgress: number
    overdue: number
  }
  tasksByStatus: Record<string, number>
  tasksByPriority: Record<string, number>
  tasksCompletedPerDay: { date: string; count: number }[]
  sprintVelocity: { sprintId: string; sprintName: string; completedTasks: number }[]
  workloadPerAssignee: { userId: string; name: string; avatarUrl: string | null; total: number; completed: number }[]
  overdueTasks: { id: string; title: string; status: string | null; priority: string | null; dueDate: string | null; listId: string }[]
}

export async function fetchDashboardStats(workspaceId: string): Promise<DashboardStats> {
  return fetchJSON<DashboardStats>(`/workspaces/${workspaceId}/dashboard`)
}

// ── Workspace Members ─────────────────────────────────────────────────────
export interface WorkspaceMemberResponse {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
  role: string
}

export async function fetchWorkspaceMembers(
  workspaceId: string,
  query?: string
): Promise<WorkspaceMemberResponse[]> {
  const url = query ? `/workspaces/${workspaceId}/members?q=${encodeURIComponent(query)}` : `/workspaces/${workspaceId}/members`
  const data = await fetchJSON<{ members: WorkspaceMemberResponse[] }>(url)
  return data.members
}

export async function addWorkspaceMember(
  workspaceId: string,
  email: string,
  role: "admin" | "member" | "viewer"
): Promise<WorkspaceMemberResponse> {
  const data = await fetchJSON<{ member: WorkspaceMemberResponse }>(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  })
  return data.member
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: "admin" | "member" | "viewer"
): Promise<WorkspaceMemberResponse> {
  const data = await fetchJSON<{ member: WorkspaceMemberResponse }>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  })
  return data.member
}

export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<{ success: boolean }> {
  return fetchJSON(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "DELETE",
  })
}

// ── Task Assignees ────────────────────────────────────────────────────────
export interface TaskAssigneeResponse {
  id: string
  taskId: string
  userId: string
  user: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
  }
}

export async function fetchTaskAssignees(taskId: string): Promise<TaskAssigneeResponse[]> {
  const data = await fetchJSON<{ assignees: TaskAssigneeResponse[] }>(`/tasks/${taskId}/assignees`)
  return data.assignees
}

export async function addTaskAssignee(
  taskId: string,
  userId: string
): Promise<{ assignee: TaskAssigneeResponse }> {
  return fetchJSON(`/tasks/${taskId}/assignees`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  })
}

export async function removeTaskAssignee(taskId: string, userId: string): Promise<void> {
  await fetchJSON(`/tasks/${taskId}/assignees?userId=${userId}`, {
    method: "DELETE",
  })
}

// ── Subtasks ────────────────────────────────────────────────────────────────
export interface SubtaskResponse {
  id: string
  listId: string
  title: string
  description: Record<string, unknown> | null
  status: string | null
  priority: string | null
  creatorId: string
  dueDate: string | null
  timeEstimate: number | null
  timeSpent: number | null
  order: number | null
  parentTaskId: string | null
  createdAt: string
  updatedAt: string
  assignees: TaskAssigneeResponse[]
  creator: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
  }
}

export async function fetchSubtasks(taskId: string): Promise<SubtaskResponse[]> {
  const data = await fetchJSON<{ subtasks: SubtaskResponse[] }>(`/tasks/${taskId}/subtasks`)
  return data.subtasks
}

export async function createSubtask(
  taskId: string,
  data: { title: string; description?: Record<string, unknown>; status?: string; priority?: string; dueDate?: string; timeEstimate?: number }
): Promise<{ subtask: SubtaskResponse }> {
  return fetchJSON(`/tasks/${taskId}/subtasks`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function toggleSubtask(
  taskId: string,
  subtaskId: string,
  completed: boolean
): Promise<{ task: TaskResponse }> {
  return fetchJSON(`/tasks/${subtaskId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: completed ? "done" : "todo" }),
  })
}

export async function deleteSubtask(taskId: string, subtaskId: string): Promise<void> {
  await fetchJSON(`/tasks/${taskId}/subtasks?subtaskId=${subtaskId}`, {
    method: "DELETE",
  })
}

// ── Comments ───────────────────────────────────────────────────────────────
export interface CommentResponse {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string | null
  user: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
  }
}

export async function fetchComments(taskId: string): Promise<CommentResponse[]> {
  const data = await fetchJSON<{ comments: CommentResponse[] }>(`/tasks/${taskId}/comments`)
  return data.comments
}

export async function createComment(
  taskId: string,
  content: string
): Promise<{ comment: CommentResponse }> {
  return fetchJSON(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  })
}

export async function deleteComment(taskId: string, commentId: string): Promise<void> {
  await fetchJSON(`/tasks/${taskId}/comments?commentId=${commentId}`, {
    method: "DELETE",
  })
}

// ── Task Dependencies ───────────────────────────────────────────────────
export interface TaskDependenciesResponse {
  blockedBy: string[]
  blocks: string[]
}

export async function fetchTaskDependencies(taskId: string): Promise<TaskDependenciesResponse> {
  const data = await fetchJSON<{ blockedBy: string[]; blocks: string[] }>(`/tasks/${taskId}/dependencies`)
  return data
}

// ── Custom Fields ─────────────────────────────────────────────────────────
export interface CustomFieldDefinitionResponse {
  id: string
  listId: string
  name: string
  type: CustomFieldType
  options: Record<string, unknown>
  order: number | null
  createdAt?: string
}

export type CustomFieldType = 
  | "text" 
  | "textarea" 
  | "number" 
  | "date" 
  | "time" 
  | "datetime" 
  | "checkbox" 
  | "select" 
  | "multiSelect" 
  | "url" 
  | "email" 
  | "phone" 
  | "currency" 
  | "percentage" 
  | "user"

export const CUSTOM_FIELD_TYPES: { value: CustomFieldType; label: string; description: string }[] = [
  { value: "text", label: "Text", description: "Single line text" },
  { value: "textarea", label: "Text Area", description: "Multi-line text" },
  { value: "number", label: "Number", description: "Numeric value" },
  { value: "date", label: "Date", description: "Date picker" },
  { value: "time", label: "Time", description: "Time picker" },
  { value: "datetime", label: "Date & Time", description: "Both date and time" },
  { value: "checkbox", label: "Checkbox", description: "Yes/No toggle" },
  { value: "select", label: "Select", description: "Dropdown with options" },
  { value: "multiSelect", label: "Multi-Select", description: "Multiple selections" },
  { value: "url", label: "URL", description: "Web address" },
  { value: "email", label: "Email", description: "Email address" },
  { value: "phone", label: "Phone", description: "Phone number" },
  { value: "currency", label: "Currency", description: "Money amount" },
  { value: "percentage", label: "Percentage", description: "Percentage value" },
  { value: "user", label: "User", description: "Assign to workspace member" },
]

export async function fetchCustomFields(listId: string): Promise<CustomFieldDefinitionResponse[]> {
  const data = await fetchJSON<{ fields: CustomFieldDefinitionResponse[] }>(`/lists/${listId}/custom-fields`)
  return data.fields
}

export async function createCustomField(
  listId: string,
  data: { name: string; type: string; options?: Record<string, unknown> }
): Promise<{ field: CustomFieldDefinitionResponse }> {
  return fetchJSON(`/lists/${listId}/custom-fields`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateCustomField(
  listId: string,
  fieldId: string,
  data: Partial<{ name: string; type: string; options: Record<string, unknown>; order: number }>
): Promise<{ field: CustomFieldDefinitionResponse }> {
  return fetchJSON(`/lists/${listId}/custom-fields/${fieldId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteCustomField(listId: string, fieldId: string): Promise<void> {
  await fetchJSON(`/lists/${listId}/custom-fields/${fieldId}`, {
    method: "DELETE",
  })
}

// ── Task Sprint ────────────────────────────────────────────────────────────
export interface TaskSprintResponse {
  id: string
  name: string
  status: string
  startDate: string
  endDate: string
}

export async function fetchTaskSprint(taskId: string): Promise<TaskSprintResponse | null> {
  const data = await fetchJSON<{ sprints: TaskSprintResponse[] }>(`/tasks/${taskId}/sprint`)
  return data.sprints[0] || null
}

export async function assignTaskToSprint(taskId: string, sprintId: string): Promise<void> {
  return fetchJSON(`/tasks/${taskId}/sprint`, {
    method: "PUT",
    body: JSON.stringify({ sprintId }),
  })
}

export async function removeTaskFromAllSprints(taskId: string): Promise<void> {
  return fetchJSON(`/tasks/${taskId}/sprint`, {
    method: "DELETE",
  })
}
