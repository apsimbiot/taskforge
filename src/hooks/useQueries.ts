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
  deleteTask,
  fetchStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  reorderStatuses,
  fetchSprints,
  fetchSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  addTaskToSprint,
  removeTaskFromSprint,
  moveTaskBetweenSprints,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchDashboardStats,
  fetchWorkspaceMembers,
  fetchTaskAssignees,
  addTaskAssignee,
  removeTaskAssignee,
  fetchSubtasks,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  fetchComments,
  createComment,
  deleteComment,
  fetchTaskDependencies,
  fetchCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  fetchTaskSprint,
  assignTaskToSprint,
  removeTaskFromAllSprints,
  type WorkspaceResponse,
  type SpaceResponse,
  type FolderResponse,
  type ListResponse,
  type TaskResponse,
  type StatusResponse,
  type SprintResponse,
  type SprintDetailResponse,
  type DashboardStats,
  type WorkspaceMemberResponse,
  type TaskAssigneeResponse,
  type SubtaskResponse,
  type CommentResponse,
  type CustomFieldDefinitionResponse,
  type TaskSprintResponse,
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

export function useTask(taskId: string | undefined) {
  return useQuery<TaskResponse>({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}`)
      if (!res.ok) throw new Error("Failed to fetch task")
      const data = await res.json()
      return data.task || data
    },
    enabled: !!taskId,
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
      description?: string | Record<string, unknown>
      status?: string
      priority?: string
      dueDate?: string
      timeEstimate?: number
      order?: number
      customFields?: Record<string, unknown>
    }) => updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
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

export function useCreateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      listId,
      ...data
    }: {
      listId: string
      name: string
      color?: string
      order?: number
    }) => createStatus(listId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["statuses", variables.listId] })
    },
  })
}

export function useUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      listId,
      statusId,
      ...data
    }: {
      listId: string
      statusId: string
      name?: string
      color?: string
      order?: number
    }) => updateStatus(listId, statusId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["statuses", variables.listId] })
    },
  })
}

export function useDeleteStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, statusId }: { listId: string; statusId: string }) =>
      deleteStatus(listId, statusId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["statuses", variables.listId] })
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.listId] })
    },
  })
}

export function useReorderStatuses() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, statusIds }: { listId: string; statusIds: string[] }) =>
      reorderStatuses(listId, statusIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["statuses", variables.listId] })
    },
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

export function useMoveTaskBetweenSprints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ fromSprintId, toSprintId, taskId }: { fromSprintId: string; toSprintId: string; taskId: string }) =>
      moveTaskBetweenSprints(fromSprintId, toSprintId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
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

// ── Workspace Members Hooks ────────────────────────────────────────────────

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery<WorkspaceMemberResponse[]>({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembers(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useSearchWorkspaceMembers(workspaceId: string | undefined, query: string) {
  return useQuery<WorkspaceMemberResponse[]>({
    queryKey: ["workspace-members", workspaceId, query],
    queryFn: () => fetchWorkspaceMembers(workspaceId!, query),
    enabled: !!workspaceId && query.length > 0,
  })
}

// ── Task Assignees Hooks ─────────────────────────────────────────────────

export function useTaskAssignees(taskId: string | undefined) {
  return useQuery<TaskAssigneeResponse[]>({
    queryKey: ["task-assignees", taskId],
    queryFn: () => fetchTaskAssignees(taskId!),
    enabled: !!taskId,
  })
}

export function useAddTaskAssignee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      addTaskAssignee(taskId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-assignees", variables.taskId] })
    },
  })
}

export function useRemoveTaskAssignee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      removeTaskAssignee(taskId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-assignees", variables.taskId] })
    },
  })
}

// ── Subtasks Hooks ────────────────────────────────────────────────────────

export function useSubtasks(taskId: string | undefined) {
  return useQuery<SubtaskResponse[]>({
    queryKey: ["subtasks", taskId],
    queryFn: () => fetchSubtasks(taskId!),
    enabled: !!taskId,
  })
}

export function useCreateSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      ...data
    }: {
      taskId: string
      title: string
      description?: Record<string, unknown>
      status?: string
      priority?: string
      dueDate?: string
      timeEstimate?: number
    }) => createSubtask(taskId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.taskId] })
    },
  })
}

export function useToggleSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, subtaskId, completed }: { taskId: string; subtaskId: string; completed: boolean }) =>
      toggleSubtask(taskId, subtaskId, completed),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.taskId] })
    },
  })
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) =>
      deleteSubtask(taskId, subtaskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.taskId] })
    },
  })
}

// ── Comments Hooks ─────────────────────────────────────────────────────────

export function useComments(taskId: string | undefined) {
  return useQuery<CommentResponse[]>({
    queryKey: ["comments", taskId],
    queryFn: () => fetchComments(taskId!),
    enabled: !!taskId,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      createComment(taskId, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.taskId] })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: string; commentId: string }) =>
      deleteComment(taskId, commentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.taskId] })
    },
  })
}

// ── Task Dependencies Hooks ───────────────────────────────────────────────

export function useTaskDependencies(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-dependencies", taskId],
    queryFn: () => fetchTaskDependencies(taskId!),
    enabled: !!taskId,
  })
}

// ── Custom Fields Hooks ─────────────────────────────────────────────────

export function useCustomFields(listId: string | undefined) {
  return useQuery<CustomFieldDefinitionResponse[]>({
    queryKey: ["custom-fields", listId],
    queryFn: () => fetchCustomFields(listId!),
    enabled: !!listId,
  })
}

export function useCreateCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      listId,
      ...data
    }: {
      listId: string
      name: string
      type: string
      options?: Record<string, unknown>
    }) => createCustomField(listId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", variables.listId] })
    },
  })
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      listId,
      fieldId,
      ...data
    }: {
      listId: string
      fieldId: string
      name?: string
      type?: string
      options?: Record<string, unknown>
      order?: number
    }) => updateCustomField(listId, fieldId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", variables.listId] })
    },
  })
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, fieldId }: { listId: string; fieldId: string }) =>
      deleteCustomField(listId, fieldId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", variables.listId] })
    },
  })
}

// ── Task Sprint Hooks ───────────────────────────────────────────────────

export function useTaskSprint(taskId: string | undefined) {
  return useQuery<TaskSprintResponse | null>({
    queryKey: ["task-sprint", taskId],
    queryFn: () => fetchTaskSprint(taskId!),
    enabled: !!taskId,
  })
}

export function useAssignTaskToSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, sprintId }: { taskId: string; sprintId: string }) =>
      assignTaskToSprint(taskId, sprintId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-sprint", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
  })
}

export function useRemoveTaskFromAllSprints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId }: { taskId: string }) =>
      removeTaskFromAllSprints(taskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-sprint", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
  })
}

// ── Task Attachments Hooks ─────────────────────────────────────────────────

export interface TaskAttachmentResponse {
  id: string;
  taskId: string;
  filename: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
  url: string;
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery<TaskAttachmentResponse[]>({
    queryKey: ["task-attachments", taskId],
    queryFn: () => fetch(`/api/tasks/${taskId}/attachments`).then(r => r.json()),
    enabled: !!taskId,
  })
}

export function useUploadAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      return res.json()
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] })
    },
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      return res.json()
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] })
    },
  })
}
