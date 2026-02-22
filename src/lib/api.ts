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
