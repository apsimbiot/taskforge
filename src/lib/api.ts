const BASE_URL = "/api"

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
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
    description: string
    status: string
    priority: string
    dueDate: string
    timeEstimate: number
    order: number
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
