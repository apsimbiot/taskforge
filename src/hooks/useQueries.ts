import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchWorkspaces,
  createWorkspace,
  fetchSpaces,
  createSpace,
  fetchFolders,
  createFolder,
  fetchFolderLists,
  fetchSpaceLists,
  createList,
  fetchTasks,
  createTask,
  updateTask,
  fetchStatuses,
  fetchSprints,
  fetchSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  addTaskToSprint,
  removeTaskFromSprint,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchDashboardStats,
  type WorkspaceResponse,
  type SpaceResponse,
  type FolderResponse,
  type ListResponse,
  type TaskResponse,
  type StatusResponse,
  type SprintResponse,
  type SprintDetailResponse,
  type DashboardStats,
} from "@/lib/api"

// ── Workspace Hooks ─────────────────────────────────────────────────────────

export function useWorkspaces() {
  return useQuery<WorkspaceResponse[]>({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; slug: string; logoUrl?: string }) =>
      createWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

// ── Space Hooks ─────────────────────────────────────────────────────────────

export function useSpaces(workspaceId: string | undefined) {
  return useQuery<SpaceResponse[]>({
    queryKey: ["spaces", workspaceId],
    queryFn: () => fetchSpaces(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useCreateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      workspaceId,
      ...data
    }: {
      workspaceId: string
      name: string
      color?: string
      icon?: string
      description?: string
    }) => createSpace(workspaceId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaces", variables.workspaceId] })
    },
  })
}

// ── Folder Hooks ────────────────────────────────────────────────────────────

export function useFolders(spaceId: string | undefined) {
  return useQuery<FolderResponse[]>({
    queryKey: ["folders", spaceId],
    queryFn: () => fetchFolders(spaceId!),
    enabled: !!spaceId,
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      spaceId,
      ...data
    }: {
      spaceId: string
      name: string
    }) => createFolder(spaceId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["folders", variables.spaceId] })
    },
  })
}

// ── List Hooks ──────────────────────────────────────────────────────────────

export function useFolderLists(folderId: string | undefined) {
  return useQuery<ListResponse[]>({
    queryKey: ["lists", "folder", folderId],
    queryFn: () => fetchFolderLists(folderId!),
    enabled: !!folderId,
  })
}

export function useSpaceLists(spaceId: string | undefined) {
  return useQuery<ListResponse[]>({
    queryKey: ["lists", "space", spaceId],
    queryFn: () => fetchSpaceLists(spaceId!),
    enabled: !!spaceId,
  })
}

export function useCreateList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      folderId,
      ...data
    }: {
      folderId: string
      name: string
      spaceId: string
    }) => createList(folderId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lists", "folder", variables.folderId] })
      queryClient.invalidateQueries({ queryKey: ["lists", "space", variables.spaceId] })
    },
  })
}

// ── Task Hooks ──────────────────────────────────────────────────────────────

export function useTasks(listId: string | undefined) {
  return useQuery<TaskResponse[]>({
    queryKey: ["tasks", listId],
    queryFn: () => fetchTasks(listId!),
    enabled: !!listId,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      listId,
      ...data
    }: {
      listId: string
      title: string
      description?: string
      status?: string
      priority?: string
      dueDate?: string
      timeEstimate?: number
    }) => createTask(listId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.listId] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      ...data
    }: {
      taskId: string
      title?: string
      description?: string
      status?: string
      priority?: string
      dueDate?: string
      timeEstimate?: number
      order?: number
    }) => updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

// ── Status Hooks ───────────────────────────────────────────────────────────

export function useStatuses(listId: string | undefined) {
  return useQuery<StatusResponse[]>({
    queryKey: ["statuses", listId],
    queryFn: () => fetchStatuses(listId!),
    enabled: !!listId,
  })
}

// ── Sprint Hooks ──────────────────────────────────────────────────────────

export function useSprints(workspaceId: string | undefined) {
  return useQuery<SprintResponse[]>({
    queryKey: ["sprints", workspaceId],
    queryFn: () => fetchSprints(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useSprint(sprintId: string | undefined) {
  return useQuery<SprintDetailResponse>({
    queryKey: ["sprint", sprintId],
    queryFn: () => fetchSprint(sprintId!),
    enabled: !!sprintId,
  })
}

export function useCreateSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      workspaceId,
      ...data
    }: {
      workspaceId: string
      name: string
      startDate: string
      endDate: string
      goal?: string
    }) => createSprint(workspaceId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprints", variables.workspaceId] })
    },
  })
}

export function useUpdateSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      sprintId,
      ...data
    }: {
      sprintId: string
      name?: string
      startDate?: string
      endDate?: string
      status?: string
      goal?: string
    }) => updateSprint(sprintId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprint", variables.sprintId] })
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
  })
}

export function useDeleteSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) => deleteSprint(sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
  })
}

export function useAddTaskToSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sprintId, taskId }: { sprintId: string; taskId: string }) =>
      addTaskToSprint(sprintId, taskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprint", variables.sprintId] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useRemoveTaskFromSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sprintId, taskId }: { sprintId: string; taskId: string }) =>
      removeTaskFromSprint(sprintId, taskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprint", variables.sprintId] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

// ── Notification Hooks ───────────────────────────────────────────────────

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => fetchNotifications(unreadOnly),
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

// ── Dashboard Stats Hook ────────────────────────────────────────────────

export function useDashboardStats(workspaceId: string | undefined) {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", workspaceId],
    queryFn: () => fetchDashboardStats(workspaceId!),
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refetch every 30s
  })
}
