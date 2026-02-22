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
  type WorkspaceResponse,
  type SpaceResponse,
  type FolderResponse,
  type ListResponse,
  type TaskResponse,
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
