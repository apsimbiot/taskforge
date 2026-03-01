"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { X, Calendar, Clock, CheckSquare, MessageSquare, Play, Pause, Square, Trash2, Plus, Check, Search, Link2, ChevronRight, Tag, Paperclip, AlertCircle, ArrowUpRight, MoreHorizontal, CircleCheckBig, Flag, Users, Timer, Gauge, ChevronDown, FolderKanban, FileText, Edit3, Eye, Lock, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RichTextEditor } from "./rich-text-editor"
import { MarkdownRenderer } from "./markdown-renderer"
import { SubtaskRow } from "./subtask-row"
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useTaskAssignees,
  useAddTaskAssignee,
  useRemoveTaskAssignee,
  useSubtasks,
  useCreateSubtask,
  useToggleSubtask,
  useDeleteSubtask,
  useComments,
  useCreateComment,
  useWorkspaceMembers,
  useCustomFields,
  useCreateCustomField,
  useDeleteCustomField,
  useSprints,
  useTaskSprint,
  useAssignTaskToSprint,
  useRemoveTaskFromAllSprints,
  useTaskAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  useTaskDependencies,
  useAddTaskDependency,
  useRemoveTaskDependency,
  useSearchWorkspaceTasks,
} from "@/hooks/useQueries"
import { CUSTOM_FIELD_TYPES, type CustomFieldType } from "@/lib/api"
import { cn } from "@/lib/utils"
import { extractTextFromTiptap } from "@/lib/tiptap"
import type { TaskResponse, StatusResponse, WorkspaceMemberResponse, SubtaskResponse, CommentResponse, ActivityResponse } from "@/lib/api"

interface TaskDetailPanelProps {
  task: TaskResponse | null | undefined
  taskId?: string
  open: boolean
  onClose: () => void
  onTaskSelect?: (taskId: string) => void
  statuses: StatusResponse[]
  workspaceId?: string
}

type Priority = "none" | "low" | "medium" | "high" | "urgent"

const PRIORITIES: { value: Priority; label: string; color: string; dotColor: string }[] = [
  { value: "none", label: "None", color: "bg-muted", dotColor: "#6b7280" },
  { value: "low", label: "Low", color: "bg-green-500", dotColor: "#22c55e" },
  { value: "medium", label: "Medium", color: "bg-blue-500", dotColor: "#3b82f6" },
  { value: "high", label: "High", color: "bg-orange-500", dotColor: "#f97316" },
  { value: "urgent", label: "Urgent", color: "bg-red-500", dotColor: "#ef4444" },
]

const STATUS_COLORS: Record<string, string> = {
  todo: "#6b7280",
  in_progress: "#3b82f6",
  review: "#eab308",
  done: "#22c55e",
}

function normalizeStatusName(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, "_")
  const aliases: Record<string, string> = {
    "to_do": "todo",
    "in_review": "review",
  }
  return aliases[slug] ?? slug
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/** Convert snake_case to Title Case */
function humanize(str: string | null | undefined): string {
  if (!str) return "empty"
  // Try to parse as date if it looks like an ISO string
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    try {
      const d = new Date(str)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      }
    } catch { /* not a date */ }
  }
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Format a field name for display */
function humanizeField(field: string): string {
  const fieldNames: Record<string, string> = {
    status: "status",
    priority: "priority",
    due_date: "due date",
    dueDate: "due date",
    title: "title",
    description: "description",
    order: "position",
    parent_task_id: "parent task",
    parentTaskId: "parent task",
    sprint_id: "sprint",
    sprintId: "sprint",
    list_id: "list",
    listId: "list",
    estimated_hours: "estimated hours",
    estimatedHours: "estimated hours",
  }
  return fieldNames[field] || field.replace(/_/g, " ").replace(/([A-Z])/g, " $1").toLowerCase().trim()
}

function getActivityActionText(activity: ActivityResponse): string {
  const { action, field, oldValue, newValue } = activity
  switch (action) {
    case "created":
      return "created this task"
    case "updated":
      if (field) {
        const fieldName = humanizeField(field)
        // Skip showing order/position changes — too noisy
        if (field === "order") return `reordered this task`
        const from = humanize(oldValue)
        const to = humanize(newValue)
        if (!oldValue || oldValue === "empty") {
          return `set ${fieldName} to ${to}`
        }
        return `changed ${fieldName} from "${from}" to "${to}"`
      }
      return "updated this task"
    case "added_subtask":
    case "subtask_created":
      return `added a subtask${newValue ? `: "${humanize(newValue)}"` : ""}`
    case "added_dependency":
      return "added a dependency"
    case "removed_dependency":
      return "removed a dependency"
    case "added_comment":
      return "added a comment"
    case "added_attachment":
      return `uploaded ${newValue ? `"${newValue}"` : "a file"}`
    case "removed_attachment":
      return `removed ${oldValue ? `"${oldValue}"` : "an attachment"}`
    case "added_assignee":
      return `assigned ${newValue || "someone"}`
    case "removed_assignee":
      return `unassigned ${oldValue || "someone"}`
    case "started_timer":
      return "started time tracking"
    case "stopped_timer":
      return `stopped time tracking (${newValue || "0 minutes"})`
    default:
      // Humanize unknown actions
      return humanize(action)
  }
}

function getActivityIcon(action: string): React.ReactNode {
  switch (action) {
    case "created":
      return <Plus className="h-3 w-3" />
    case "updated":
      return <Edit3 className="h-3 w-3" />
    case "added_subtask":
      return <Plus className="h-3 w-3" />
    case "added_dependency":
      return <Link2 className="h-3 w-3" />
    case "removed_dependency":
      return <Link2 className="h-3 w-3" />
    case "added_comment":
      return <MessageSquare className="h-3 w-3" />
    case "added_attachment":
      return <Paperclip className="h-3 w-3" />
    case "removed_attachment":
      return <Trash2 className="h-3 w-3" />
    case "added_assignee":
      return <Users className="h-3 w-3" />
    case "removed_assignee":
      return <Users className="h-3 w-3" />
    case "started_timer":
      return <Play className="h-3 w-3" />
    case "stopped_timer":
      return <Pause className="h-3 w-3" />
    default:
      return <Clock className="h-3 w-3" />
  }
}

export function TaskDetailPanel({ task, taskId, open, onClose, onTaskSelect, statuses, workspaceId }: TaskDetailPanelProps) {
  // If taskId is passed but task is not, fetch the task (for subtask navigation)
  const { data: fetchedTask, isLoading: taskLoading } = useTask(taskId)
  const currentTask = task || fetchedTask

  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()

  // Assignees
  const { data: assignees = [], isLoading: assigneesLoading } = useTaskAssignees(task?.id)
  const addAssigneeMutation = useAddTaskAssignee()
  const removeAssigneeMutation = useRemoveTaskAssignee()

  // Subtasks
  const { data: subtasks = [], isLoading: subtasksLoading } = useSubtasks(task?.id)
  const createSubtaskMutation = useCreateSubtask()
  const toggleSubtaskMutation = useToggleSubtask()
  const deleteSubtaskMutation = useDeleteSubtask()

  // Comments
  const { data: comments = [], isLoading: commentsLoading } = useComments(task?.id)
  const createCommentMutation = useCreateComment()

  // Workspace members for assignee picker
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState<Record<string, unknown> | null>(null)
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState<Priority>("none")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [timeEstimate, setTimeEstimate] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Activity tab
  const [activityTab, setActivityTab] = useState<"all" | "comments" | "history">("all")

  // Time tracking state
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null)

  // Subtask input
  const [newSubtask, setNewSubtask] = useState("")
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("")

  // Comment input
  const [newComment, setNewComment] = useState<Record<string, unknown> | null>(null)

  // Assignee picker
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState("")

  // Image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Tags (mock - would need tag API)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [collapseEmpty, setCollapseEmpty] = useState(false)
  const [customFieldsExpanded, setCustomFieldsExpanded] = useState(true)

  // Custom fields dialog
  const [isCustomFieldDialogOpen, setIsCustomFieldDialogOpen] = useState(false)
  const [newFieldName, setNewFieldName] = useState("")
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text")
  const [newFieldOptions, setNewFieldOptions] = useState<string>("")

  // Custom fields
  const { data: customFields = [], isLoading: customFieldsLoading } = useCustomFields(task?.listId)
  const createCustomFieldMutation = useCreateCustomField()
  const deleteCustomFieldMutation = useDeleteCustomField()

  // Sprint hooks
  const { data: sprints = [] } = useSprints(workspaceId)
  const { data: currentSprint, isLoading: sprintLoading } = useTaskSprint(task?.id)
  const assignToSprintMutation = useAssignTaskToSprint()
  const removeFromSprintMutation = useRemoveTaskFromAllSprints()

  // Attachment hooks
  const { data: attachments = [], isLoading: attachmentsLoading } = useTaskAttachments(task?.id)
  const uploadAttachmentMutation = useUploadAttachment()
  const deleteAttachmentMutation = useDeleteAttachment()

  // Dependencies hooks
  const { data: dependencies, isLoading: dependenciesLoading } = useTaskDependencies(task?.id)
  const addDependencyMutation = useAddTaskDependency()
  const removeDependencyMutation = useRemoveTaskDependency()
  const searchTasksMutation = useSearchWorkspaceTasks()

  // Dependencies state
  const [depSearchOpen, setDepSearchOpen] = useState(false)
  const [depSearchQuery, setDepSearchQuery] = useState("")
  const [depSearchResults, setDepSearchResults] = useState<TaskResponse[]>([])
  const [depSearching, setDepSearching] = useState(false)
  const depSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Attachment state
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !task) return
    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        await uploadAttachmentMutation.mutateAsync({ taskId: task?.id, file })
      }
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileUpload(e.dataTransfer.files)
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Check if file is image
  const isImageFile = (mimeType: string): boolean => {
    return mimeType.startsWith("image/")
  }

  // Handle delete attachment
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!task) return
    try {
      await deleteAttachmentMutation.mutateAsync({ taskId: task?.id, attachmentId })
    } catch (error) {
      console.error("Delete failed:", error)
    }
  }

  // Dependency search with debounce
  const handleDepSearch = useCallback((query: string) => {
    setDepSearchQuery(query)
    if (depSearchTimeout.current) clearTimeout(depSearchTimeout.current)
    if (!query.trim() || query.trim().length < 2 || !workspaceId) {
      setDepSearchResults([])
      setDepSearching(false)
      return
    }
    setDepSearching(true)
    depSearchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchTasksMutation.mutateAsync({ query, workspaceId })
        // Filter out current task and tasks already linked
        const blockedByIds = dependencies?.blockedBy ?? []
        const blocksIds = dependencies?.blocks ?? []
        const excludeIds = new Set([task?.id, ...blockedByIds, ...blocksIds])
        setDepSearchResults(results.filter((t) => !excludeIds.has(t.id)))
      } catch {
        setDepSearchResults([])
      } finally {
        setDepSearching(false)
      }
    }, 300)
  }, [workspaceId, task?.id, dependencies, searchTasksMutation])

  // Add dependency: current task is blocked by selectedTask
  const handleAddBlockedBy = async (blockingTaskId: string) => {
    if (!task) return
    try {
      await addDependencyMutation.mutateAsync({ taskId: task.id, blockedTaskId: blockingTaskId })
    } catch (error) {
      console.error("Add dependency failed:", error)
    }
    setDepSearchOpen(false)
    setDepSearchQuery("")
    setDepSearchResults([])
  }

  // Remove dependency
  const handleRemoveBlockedBy = async (blockingTaskId: string) => {
    if (!task) return
    try {
      await removeDependencyMutation.mutateAsync({ taskId: task.id, blockedTaskId: blockingTaskId })
    } catch (error) {
      console.error("Remove dependency failed:", error)
    }
  }

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setTitle(currentTask?.title || "")
      setDescription(task.description as Record<string, unknown> | null)
      setStatus(task.status || "todo")
      setPriority((task.priority as Priority) || "none")
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined)
      // Start date would come from task if available
      setTimeEstimate(task.timeEstimate)
      setTimerSeconds(task.timeSpent || 0)
      setIsTimerRunning(false)
    }
  }, [task])

  // Timer cleanup
  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval)
    }
  }, [timerInterval])

  // URL management — update URL when panel opens/closes (only from list view context)
  const prevPathRef = useRef<string>("")
  
  useEffect(() => {
    if (!workspaceId || typeof window === "undefined") return
    
    if (open && taskId) {
      const taskUrl = `/dashboard/workspaces/${workspaceId}/tasks/${taskId}`
      // Only push if we're not already on a task URL
      if (!window.location.pathname.includes("/tasks/")) {
        prevPathRef.current = window.location.pathname + window.location.search
        window.history.pushState({ taskId }, "", taskUrl)
      }
    }
  }, [open, taskId, workspaceId])

  const handleSave = useCallback(() => {
    if (!task) return
    updateTaskMutation.mutate({
      taskId: task?.id,
      title,
      description: (description ?? undefined) as string | Record<string, unknown> | undefined,
      status,
      priority,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      timeEstimate: timeEstimate ?? undefined,
    })
  }, [task, title, description, status, priority, dueDate, timeEstimate, updateTaskMutation])

  const handleDelete = useCallback(() => {
    if (!task) return
    deleteTaskMutation.mutate(task?.id)
    setIsDeleteDialogOpen(false)
    onClose()
  }, [task, deleteTaskMutation, onClose])

  // Timer controls
  const handleStartTimer = () => {
    setIsTimerRunning(true)
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1)
    }, 1000)
    setTimerInterval(interval)
  }

  const handlePauseTimer = () => {
    setIsTimerRunning(false)
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }
  }

  const handleStopTimer = () => {
    handlePauseTimer()
    // Could save timeSpent here
  }

  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  // Subtask handlers
  const handleAddSubtask = () => {
    if (!newSubtask.trim() || !task) return
    createSubtaskMutation.mutate({
      taskId: task?.id,
      title: newSubtask.trim(),
    })
    setNewSubtask("")
  }

  const handleToggleSubtask = (subtask: SubtaskResponse) => {
    if (!task) return
    // Subtasks are full tasks - toggle between todo and done
    const newStatus = subtask.status === "done" ? "todo" : "done"
    updateTaskMutation.mutate({
      taskId: subtask?.id,
      status: newStatus,
    })
  }

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!task) return
    deleteSubtaskMutation.mutate({
      taskId: task?.id,
      subtaskId,
    })
  }

  const handleStartEditSubtask = (subtask: SubtaskResponse) => {
    setEditingSubtaskId(subtask?.id)
    setEditingSubtaskTitle(subtask.title)
  }

  const handleSaveEditSubtask = () => {
    // Would need an update subtask mutation
    setEditingSubtaskId(null)
    setEditingSubtaskTitle("")
  }

  // Comment handlers
  const handleAddComment = () => {
    if (!newComment || !task) return
    const text = extractTextFromTiptap(newComment)
    if (!text.trim()) return
    createCommentMutation.mutate({
      taskId: task?.id,
      content: JSON.stringify(newComment),
    })
    setNewComment(null)
  }

  // Assignee handlers
  const handleAddAssignee = (member: WorkspaceMemberResponse) => {
    if (!task) return
    addAssigneeMutation.mutate({
      taskId: task?.id,
      userId: member.id,
    })
    setAssigneeSearch("")
  }

  const handleRemoveAssignee = (userId: string) => {
    if (!task) return
    removeAssigneeMutation.mutate({
      taskId: task?.id,
      userId,
    })
  }

  const filteredMembers = useMemo(() => {
    if (!assigneeSearch) return workspaceMembers
    const search = assigneeSearch.toLowerCase()
    return workspaceMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search)
    )
  }, [workspaceMembers, assigneeSearch])

  const completedSubtasks = subtasks.filter((s) => s.status === "done").length
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0

  if (!open || !task) return null

  // Find matching status object for current task
  const currentStatus = statuses.find((s) => normalizeStatusName(s.name) === status)
  const priorityConfig = PRIORITIES.find((p) => p.value === priority)

  // Build breadcrumb from task's list/space data
  const taskWithRelations = currentTask as (typeof currentTask & { list?: { name: string; space?: { name: string } } }) | undefined
  const breadcrumb = [
    ...(taskWithRelations?.list?.space?.name ? [{ label: "Space", value: taskWithRelations.list.space.name }] : []),
    ...(taskWithRelations?.list?.name ? [{ label: "List", value: taskWithRelations.list.name }] : []),
    { label: "Task", value: currentTask?.title || "" },
  ]

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-background rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] overflow-hidden flex animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT SIDE - Main Content (~60%) */}
        <div className="w-[60%] flex flex-col border-r overflow-hidden">
          {/* Breadcrumb Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 flex-shrink-0">
            <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
              {breadcrumb.map((item, idx) => (
                <div key={idx} className="flex items-center">
                  <span className="truncate max-w-[100px]">{item.value}</span>
                  {idx < breadcrumb.length - 1 && (
                    <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this task? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Task Title */}
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                className="text-2xl font-bold border-0 px-0 focus-visible:ring-0 bg-transparent"
                placeholder="Task title"
              />

              {/* Property Fields - Two Column Grid Layout */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                {/* Column 1: Status */}
                <div className="flex items-center py-2.5 border-b border-border/30">
                  <span className="w-24 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
                    <CircleCheckBig className="h-4 w-4" />
                    Status
                  </span>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value)
                      if (task) {
                        updateTaskMutation.mutate({
                          taskId: task?.id,
                          status: value,
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue placeholder="Select status">
                        {currentStatus && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: currentStatus.color || "#6366f1" }}
                            />
                            {currentStatus.name}
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={normalizeStatusName(s.name)}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: s.color || "#6366f1" }}
                            />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Column 2: Priority */}
                <div className="flex items-center py-2.5 border-b border-border/30">
                  <span className="w-24 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Priority
                  </span>
                  <Select
                    value={priority}
                    onValueChange={(value) => {
                      const newPriority = value as Priority
                      setPriority(newPriority)
                      if (task) {
                        updateTaskMutation.mutate({
                          taskId: task?.id,
                          priority: newPriority,
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue placeholder="Select priority">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: priorityConfig?.dotColor }}
                          />
                          {priorityConfig?.label}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: p.dotColor }}
                            />
                            {p.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dates - Start & Due */}
                <div className="flex items-center py-2.5 border-b border-border/30">
                  <span className="w-24 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Dates
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "h-8 flex-1 justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {startDate ? startDate.toLocaleDateString() : "Start"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            setStartDate(date)
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground">→</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "h-8 flex-1 justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {dueDate ? dueDate.toLocaleDateString() : "Due"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dueDate}
                          onSelect={(date) => {
                            setDueDate(date)
                            if (task && date) {
                              updateTaskMutation.mutate({
                                taskId: task?.id,
                                dueDate: date.toISOString(),
                              })
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Assignees */}
                <PropertyRow label="Assignees" icon={<Users className="h-4 w-4" />}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {assigneesLoading ? (
                      <Skeleton className="h-6 w-20" />
                    ) : (
                      <>
                        <TooltipProvider delayDuration={200}>
                          {assignees.map((assignee) => (
                            <Tooltip key={assignee.id}>
                              <TooltipTrigger asChild>
                                <div className="relative group cursor-pointer">
                                  <Avatar className="h-8 w-8 border-2 border-background hover:ring-2 hover:ring-primary/50 transition-all">
                                    <AvatarImage src={assignee.user.avatarUrl || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(assignee.user.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <button
                                    onClick={() => handleRemoveAssignee(assignee.userId)}
                                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>{assignee.user.name || assignee.user.email}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </>
                    )}
                    <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[240px]" align="start">
                        <Command>
                          <div className="flex items-center border-b px-2">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <input
                              className="flex h-9 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Search members..."
                              value={assigneeSearch}
                              onChange={(e) => setAssigneeSearch(e.target.value)}
                            />
                          </div>
                          <CommandList>
                            <CommandEmpty>No members found.</CommandEmpty>
                            <CommandGroup>
                              {filteredMembers.map((member) => (
                                <CommandItem
                                  key={member.id}
                                  value={member.id}
                                  onSelect={() => {
                                    handleAddAssignee(member)
                                    setAssigneePopoverOpen(false)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={member.avatarUrl || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(member.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-sm">{member.name}</span>
                                    <span className="text-xs text-muted-foreground">{member.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </PropertyRow>

                {/* Track time + Estimate */}
                <div className="flex items-center py-2.5 border-b border-border/30">
                  <span className="w-24 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Track
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-sm font-mono min-w-[70px] justify-center">
                      <span className={cn("text-base", isTimerRunning && "text-green-500")}>
                        {formatTimer(timerSeconds)}
                      </span>
                    </div>
                    {isTimerRunning ? (
                      <Button variant="outline" size="icon" onClick={handlePauseTimer} className="h-8 w-8">
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="icon" onClick={handleStartTimer} className="h-8 w-8">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={handleStopTimer} className="h-8 w-8">
                      <Square className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <PropertyRow label="Tags" icon={<Tag className="h-4 w-4" />}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {tags.map((tag, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {tag}
                        <button
                          onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Add tag
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px]" align="start">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Tag name"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTag.trim()) {
                              setTags([...tags, newTag.trim()])
                              setNewTag("")
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </PropertyRow>

                {/* Sprint Property Row */}
                <div className="flex items-center py-2.5 border-b border-border/30">
                  <span className="w-24 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
                    <FolderKanban className="h-4 w-4" />
                    Sprint
                  </span>
                  <Select
                    value={currentSprint?.id || "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        removeFromSprintMutation.mutate({ taskId: task?.id })
                      } else {
                        assignToSprintMutation.mutate({ taskId: task?.id, sprintId: value })
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue placeholder="No sprint">
                        {currentSprint ? currentSprint.name : "No sprint"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">No sprint</span>
                      </SelectItem>
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Collapse empty fields toggle (spans both columns) */}
                <button
                  onClick={() => setCollapseEmpty(!collapseEmpty)}
                  className="col-span-2 flex items-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={cn("h-3 w-3 transition-transform", collapseEmpty && "-rotate-90")} />
                  {collapseEmpty ? "Show empty fields" : "Collapse empty fields"}
                </button>
              </div>

              {/* Custom Fields — Full-width collapsible section */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setCustomFieldsExpanded(!customFieldsExpanded)}
                  className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    Custom Fields
                    {customFields.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5 ml-1">
                        {customFields.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    !customFieldsExpanded && "-rotate-90"
                  )} />
                </button>

                {customFieldsExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {customFieldsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : customFields.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {customFields.map((field) => {
                          // Get current value from task.customFields
                          const fieldValue = task?.customFields?.[field.id]
                          
                          return (
                          <div
                            key={field.id}
                            className="group flex flex-col gap-1.5 p-2.5 rounded-md border border-border/50 bg-muted/20 relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate">{field.name}</span>
                              <button
                                onClick={() => {
                                  if (task) {
                                    deleteCustomFieldMutation.mutate({
                                      listId: task.listId,
                                      fieldId: field.id,
                                    })
                                  }
                                }}
                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            
                            {/* Render appropriate input based on field type */}
                            {field.type === "text" && (
                              <Input
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  if (task) {
                                    const newCustomFields = { ...task.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: task?.id,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="Enter value..."
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "textarea" && (
                              <Textarea
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  if (task) {
                                    const newCustomFields = { ...task.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: task?.id,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="Enter value..."
                                className="h-16 text-sm resize-none"
                              />
                            )}
                            {field.type === "number" && (
                              <Input
                                type="number"
                                value={fieldValue as number || ""}
                                onChange={(e) => {
                                  if (task) {
                                    const newCustomFields = { ...task.customFields, [field.id]: e.target.value ? parseFloat(e.target.value) : null }
                                    updateTaskMutation.mutate({
                                      taskId: task?.id,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="0"
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "checkbox" && (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={fieldValue as boolean || false}
                                  onCheckedChange={(checked) => {
                                    if (task) {
                                      const newCustomFields = { ...task.customFields, [field.id]: checked }
                                      updateTaskMutation.mutate({
                                        taskId: task?.id,
                                        customFields: newCustomFields,
                                      })
                                    }
                                  }}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {fieldValue ? "Yes" : "No"}
                                </span>
                              </div>
                            )}
                            {field.type === "date" && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "h-8 justify-start text-left font-normal text-sm",
                                      !fieldValue && "text-muted-foreground"
                                    )}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {fieldValue ? new Date(fieldValue as string).toLocaleDateString() : "Select date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={fieldValue ? new Date(fieldValue as string) : undefined}
                                    onSelect={(date) => {
                                      if (task && date) {
                                        const newCustomFields = { ...task.customFields, [field.id]: date.toISOString() }
                                        updateTaskMutation.mutate({
                                          taskId: task?.id,
                                          customFields: newCustomFields,
                                        })
                                      }
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                            {field.type === "select" && (
                              <Select
                                value={fieldValue as string || ""}
                                onValueChange={(value) => {
                                  if (task) {
                                    const newCustomFields = { ...task.customFields, [field.id]: value }
                                    updateTaskMutation.mutate({
                                      taskId: task?.id,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {(field.options?.choices as string[] | undefined)?.map((choice: string) => (
                                    <SelectItem key={choice} value={choice}>{choice}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {field.type === "url" && (
                              <Input
                                type="url"
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  if (task) {
                                    const newCustomFields = { ...task.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: task?.id,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="https://..."
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "email" && (
                              <Input
                                type="email"
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  if (task) {
                                    const newCustomFields = { ...task.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: task?.id,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="email@example.com"
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "phone" && (
                              <Input
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  if (task) {
                                    const newCustomFields = { ...task.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: task?.id,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="+1 234 567 8900"
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "currency" && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-sm">$</span>
                                <Input
                                  type="number"
                                  value={fieldValue as number || ""}
                                  onChange={(e) => {
                                    if (task) {
                                      const newCustomFields = { ...task.customFields, [field.id]: e.target.value ? parseFloat(e.target.value) : null }
                                      updateTaskMutation.mutate({
                                        taskId: task?.id,
                                        customFields: newCustomFields,
                                      })
                                    }
                                  }}
                                  placeholder="0.00"
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}
                            {field.type === "percentage" && (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={fieldValue as number || ""}
                                  onChange={(e) => {
                                    if (task) {
                                      const newCustomFields = { ...task.customFields, [field.id]: e.target.value ? parseFloat(e.target.value) : null }
                                      updateTaskMutation.mutate({
                                        taskId: task?.id,
                                        customFields: newCustomFields,
                                      })
                                    }
                                  }}
                                  placeholder="0"
                                  className="h-8 text-sm"
                                />
                                <span className="text-muted-foreground text-sm">%</span>
                              </div>
                            )}
                            {field.type === "time" && (
                              <Input
                                type="time"
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  if (task) {
                                    const newCustomFields = { ...task.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: task?.id,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "datetime" && (
                              <Input
                                type="datetime-local"
                                value={fieldValue ? (fieldValue as string).slice(0, 16) : ""}
                                onChange={(e) => {
                                  if (task) {
                                    const newCustomFields = { ...task.customFields, [field.id]: e.target.value ? new Date(e.target.value).toISOString() : null }
                                    updateTaskMutation.mutate({
                                      taskId: task?.id,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                className="h-8 text-sm"
                              />
                            )}
                            {/* Fallback for unsupported types */}
                            {!["text", "textarea", "number", "checkbox", "date", "select", "url", "email", "phone", "currency", "percentage", "time", "datetime", "multiSelect", "user"].includes(field.type) && (
                              <Input
                                value={String(fieldValue || "")}
                                onChange={(e) => {
                                  if (task) {
                                    const newCustomFields = { ...task.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: task?.id,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder={`Enter ${field.type}...`}
                                className="h-8 text-sm"
                              />
                            )}
                          </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-1">No custom fields yet. Add one to track extra information.</p>
                    )}

                    {/* Add Custom Field Dialog */}
                    <Dialog open={isCustomFieldDialogOpen} onOpenChange={setIsCustomFieldDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add Field
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Custom Field</DialogTitle>
                          <DialogDescription>
                            Create a new custom field for this list.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Field Name</label>
                            <Input
                              value={newFieldName}
                              onChange={(e) => setNewFieldName(e.target.value)}
                              placeholder="e.g., Story Points, Sprint, Budget"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Field Type</label>
                            <Select
                              value={newFieldType}
                              onValueChange={(value) => setNewFieldType(value as CustomFieldType)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CUSTOM_FIELD_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div className="flex flex-col">
                                      <span>{type.label}</span>
                                      <span className="text-xs text-muted-foreground">{type.description}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {(newFieldType === "select" || newFieldType === "multiSelect") && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Options (one per line)</label>
                              <textarea
                                value={newFieldOptions}
                                onChange={(e) => setNewFieldOptions(e.target.value)}
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                className="w-full h-24 px-3 py-2 text-sm border rounded-md resize-none"
                              />
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCustomFieldDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              if (task && newFieldName.trim()) {
                                const options: Record<string, unknown> = {}
                                if ((newFieldType === "select" || newFieldType === "multiSelect") && newFieldOptions.trim()) {
                                  options.choices = newFieldOptions.split("\n").map(o => o.trim()).filter(Boolean)
                                }
                                createCustomFieldMutation.mutate({
                                  listId: task.listId,
                                  name: newFieldName.trim(),
                                  type: newFieldType,
                                  options,
                                })
                                setNewFieldName("")
                                setNewFieldType("text")
                                setNewFieldOptions("")
                                setIsCustomFieldDialogOpen(false)
                              }
                            }}
                            disabled={!newFieldName.trim()}
                          >
                            Add Field
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>

              <Separator />

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Description
                </label>
                <RichTextEditor
                  content={description}
                  onChange={(json) => { setDescription(json); }}
                  placeholder="Add a description..."
                  minHeight="120px"
                />
              </div>

              <Separator />

              {/* Subtasks - ClickUp Style */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Subtasks</span>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {completedSubtasks}/{subtasks.length}
                    </Badge>
                  </div>
                  {subtasks.length > 0 && (
                    <Progress value={subtaskProgress} className="h-1.5 w-24" />
                  )}
                </div>

                {/* Rich Subtask Rows */}
                {subtasksLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="space-y-1 mb-3">
                    {subtasks.map((subtask) => (
                      <SubtaskRow
                        key={subtask?.id}
                        subtask={subtask}
                        onClick={() => onTaskSelect?.(subtask?.id)}
                        statuses={statuses}
                      />
                    ))}
                  </div>
                )}
                
                {/* Add subtask input */}
                <div className="flex items-center gap-2 mt-3">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSubtask.trim()) {
                        handleAddSubtask()
                      }
                    }}
                    placeholder="Add a subtask..."
                    className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <Separator />

              {/* Dependencies */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Dependencies</span>
                    {!dependenciesLoading && ((dependencies?.blockedBy?.length ?? 0) + (dependencies?.blocks?.length ?? 0)) > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {(dependencies?.blockedBy?.length ?? 0) + (dependencies?.blocks?.length ?? 0)}
                      </Badge>
                    )}
                  </div>
                </div>

                {dependenciesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Blocked by */}
                    {dependencies?.blockedBy && dependencies.blockedBy.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Lock className="h-3 w-3 text-orange-500" />
                          <span className="text-xs font-medium text-muted-foreground">Blocked by</span>
                        </div>
                        <div className="space-y-1">
                          {dependencies.blockedBy.map((depId) => (
                            <DependencyChip
                              key={depId}
                              taskId={depId}
                              onRemove={() => handleRemoveBlockedBy(depId)}
                              onClick={() => onTaskSelect?.(depId)}
                              variant="blockedBy"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blocks */}
                    {dependencies?.blocks && dependencies.blocks.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <ExternalLink className="h-3 w-3 text-blue-500" />
                          <span className="text-xs font-medium text-muted-foreground">Blocking</span>
                        </div>
                        <div className="space-y-1">
                          {dependencies.blocks.map((depId) => (
                            <DependencyChip
                              key={depId}
                              taskId={depId}
                              onRemove={() => {/* remove from the other side would need reverse API call */}}
                              onClick={() => onTaskSelect?.(depId)}
                              variant="blocks"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {(!dependencies?.blockedBy?.length && !dependencies?.blocks?.length) && (
                      <p className="text-xs text-muted-foreground">No dependencies set</p>
                    )}
                  </div>
                )}

                {/* Add dependency */}
                <Popover open={depSearchOpen} onOpenChange={(open) => {
                  setDepSearchOpen(open)
                  if (!open) {
                    setDepSearchQuery("")
                    setDepSearchResults([])
                  }
                }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs mt-3">
                      <Plus className="h-3 w-3 mr-1" />
                      Add dependency
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="flex items-center gap-2 px-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1"
                          placeholder="Search tasks to add as blocker..."
                          value={depSearchQuery}
                          onChange={(e) => handleDepSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {depSearching ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">Searching…</div>
                      ) : depSearchResults.length > 0 ? (
                        <div className="py-1">
                          {depSearchResults.map((r) => (
                            <button
                              key={r.id}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                              onClick={() => handleAddBlockedBy(r.id)}
                            >
                              <Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{r.title}</span>
                            </button>
                          ))}
                        </div>
                      ) : depSearchQuery.length >= 2 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">No tasks found</div>
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">Type at least 2 characters</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Separator />

              {/* Attachments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Attachments</span>
                  {attachments.length > 0 && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      {attachments.length}
                    </Badge>
                  )}
                </div>

                {/* Drop zone */}
                <div
                  className={cn(
                    "border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors",
                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50",
                    isUploading && "opacity-50 pointer-events-none"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                  />
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Drop files here or click to upload
                    </div>
                  )}
                </div>

                {/* Attachment list */}
                {attachmentsLoading ? (
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : attachments.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group transition-colors"
                      >
                        {/* Thumbnail or icon */}
                        {isImageFile(attachment.mimeType) ? (
                          <div 
                            className="h-10 w-10 rounded overflow-hidden flex-shrink-0 bg-muted cursor-pointer hover:ring-2 hover:ring-primary"
                            onClick={() => setPreviewImage(attachment.url)}
                          >
                            <img
                              src={attachment.url}
                              alt={attachment.filename}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded flex-shrink-0 bg-muted flex items-center justify-center">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => {
                              if (isImageFile(attachment.mimeType)) {
                                setPreviewImage(attachment.url)
                              } else {
                                window.open(attachment.url, "_blank")
                              }
                            }}
                            className="text-sm font-medium hover:underline truncate block text-left"
                          >
                            {attachment.filename}
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)}
                          </span>
                        </div>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteAttachment(attachment.id)
                          }}
                          disabled={deleteAttachmentMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-muted-foreground text-center">
                    No attachments yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Activity Panel (~40%) */}
        <div className="w-[40%] flex flex-col bg-muted/10">
          {/* Activity Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
            <h3 className="font-semibold">Activity</h3>
            <Tabs value={activityTab} onValueChange={(v) => setActivityTab(v as any)} className="h-8">
              <TabsList className="h-7 bg-transparent">
                <TabsTrigger value="all" className="h-6 text-xs px-2">All</TabsTrigger>
                <TabsTrigger value="comments" className="h-6 text-xs px-2">Comments</TabsTrigger>
                <TabsTrigger value="history" className="h-6 text-xs px-2">History</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Activity Feed - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Real Activity History - newest first */}
            {activityTab === "all" || activityTab === "history" ? (
              currentTask?.activities && currentTask.activities.length > 0 ? (
                [...currentTask.activities].reverse().map((activity) => {
                  const actionText = getActivityActionText(activity)
                  return (
                    <ActivityItem
                      key={activity.id}
                      avatar={null}
                      name={activity.user?.name || "Unknown"}
                      action={actionText}
                      timestamp={activity.createdAt}
                      icon={getActivityIcon(activity.action)}
                    />
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-4">No activity yet</p>
              )
            ) : null}

            {/* Comments */}
            {activityTab === "all" || activityTab === "comments" ? (
              comments.length > 0 ? (
                comments.map((comment) => {
                  // Check if content is JSON (TipTap format)
                  let contentToRender = comment.content
                  try {
                    const parsed = JSON.parse(comment.content)
                    if (parsed && parsed.type === "doc") {
                      contentToRender = parsed
                    }
                  } catch {
                    // Not JSON, use as plain text
                  }
                  return (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarImage src={comment.user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(comment.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{comment.user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <div className="text-sm mt-1">
                          {typeof contentToRender === "object" ? (
                            <RichTextEditor
                              content={contentToRender as Record<string, unknown>}
                              onChange={() => {}}
                              editable={false}
                              minHeight="auto"
                            />
                          ) : (
                            <MarkdownRenderer content={contentToRender as string} />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-4">No comments yet</p>
              )
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-4">No history available</p>
            )}
          </div>

          {/* Comment Input - Fixed at Bottom */}
          <div className="border-t p-3 bg-background flex-shrink-0">
            <div className="flex gap-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs">You</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <RichTextEditor
                  content={newComment}
                  onChange={(json) => setNewComment(json)}
                  placeholder="Write a comment... Use @ to mention someone"
                  minHeight="60px"
                  mentions={workspaceMembers.map(m => ({ id: m.id, name: m.name || m.email, email: m.email }))}
                />
                <div className="flex items-center justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment}
                    className="h-7"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Image Preview Dialog */}
    <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
      <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
        <div className="relative flex items-center justify-center">
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[80vh] max-w-full rounded-lg shadow-2xl"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

// Helper Components

/** Renders a single dependency link with task title lookup */
function DependencyChip({
  taskId,
  variant,
  onRemove,
  onClick,
}: {
  taskId: string
  variant: "blockedBy" | "blocks"
  onRemove: () => void
  onClick: () => void
}) {
  // Use the task query to get the title
  const { data: depTask } = useTask(taskId)

  return (
    <div className="group flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5 hover:bg-muted/40 transition-colors">
      <button onClick={onClick} className="flex items-center gap-2 min-w-0 flex-1 text-left">
        {variant === "blockedBy" ? (
          <Lock className="h-3 w-3 text-orange-500 flex-shrink-0" />
        ) : (
          <ExternalLink className="h-3 w-3 text-blue-500 flex-shrink-0" />
        )}
        <span className="text-sm truncate">{depTask?.title ?? `Task ${taskId.slice(0, 8)}…`}</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-destructive transition-all flex-shrink-0"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

function PropertyRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center py-2.5 border-b border-border/30">
      <span className="w-28 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
        {icon}
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function ActivityItem({
  avatar,
  name,
  action,
  timestamp,
  icon,
}: {
  avatar: string | null
  name: string
  action: string
  timestamp?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex gap-2">
      {avatar ? (
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarImage src={avatar} />
          <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(timestamp)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{action}</p>
      </div>
    </div>
  )
}

