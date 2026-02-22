"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { X, Calendar, Clock, CheckSquare, MessageSquare, Play, Pause, Square, Trash2, Plus, Check, Search, Link2, ChevronRight, Tag, Paperclip, AlertCircle, ArrowUpRight, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { MarkdownEditor } from "./markdown-editor"
import { MarkdownRenderer } from "./markdown-renderer"
import {
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
} from "@/hooks/useQueries"
import { cn } from "@/lib/utils"
import { extractTextFromTiptap } from "@/lib/tiptap"
import type { TaskResponse, StatusResponse, WorkspaceMemberResponse, SubtaskResponse, CommentResponse } from "@/lib/api"

interface TaskDetailPanelProps {
  task: TaskResponse | null | undefined
  open: boolean
  onClose: () => void
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

export function TaskDetailPanel({ task, open, onClose, statuses, workspaceId }: TaskDetailPanelProps) {
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
  const [description, setDescription] = useState("")
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
  const [newComment, setNewComment] = useState("")
  const [isCommentPreview, setIsCommentPreview] = useState(false)

  // Assignee picker
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState("")

  // Tags (mock - would need tag API)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(extractTextFromTiptap(task.description))
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

  const handleSave = useCallback(() => {
    if (!task) return
    updateTaskMutation.mutate({
      taskId: task.id,
      title,
      description,
      status,
      priority,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      timeEstimate: timeEstimate ?? undefined,
    })
  }, [task, title, description, status, priority, dueDate, timeEstimate, updateTaskMutation])

  const handleDelete = useCallback(() => {
    if (!task) return
    deleteTaskMutation.mutate(task.id)
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
      taskId: task.id,
      title: newSubtask.trim(),
    })
    setNewSubtask("")
  }

  const handleToggleSubtask = (subtask: SubtaskResponse) => {
    if (!task) return
    // Subtasks are full tasks - toggle between todo and done
    const newStatus = subtask.status === "done" ? "todo" : "done"
    updateTaskMutation.mutate({
      taskId: subtask.id,
      status: newStatus,
    })
  }

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!task) return
    deleteSubtaskMutation.mutate({
      taskId: task.id,
      subtaskId,
    })
  }

  const handleStartEditSubtask = (subtask: SubtaskResponse) => {
    setEditingSubtaskId(subtask.id)
    setEditingSubtaskTitle(subtask.title)
  }

  const handleSaveEditSubtask = () => {
    // Would need an update subtask mutation
    setEditingSubtaskId(null)
    setEditingSubtaskTitle("")
  }

  // Comment handlers
  const handleAddComment = () => {
    if (!newComment.trim() || !task) return
    createCommentMutation.mutate({
      taskId: task.id,
      content: newComment.trim(),
    })
    setNewComment("")
    setIsCommentPreview(false)
  }

  // Assignee handlers
  const handleAddAssignee = (member: WorkspaceMemberResponse) => {
    if (!task) return
    addAssigneeMutation.mutate({
      taskId: task.id,
      userId: member.id,
    })
    setAssigneeSearch("")
  }

  const handleRemoveAssignee = (userId: string) => {
    if (!task) return
    removeAssigneeMutation.mutate({
      taskId: task.id,
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

  // Mock breadcrumb - would need space/folder/list from task context
  const breadcrumb = [
    { label: "Space", value: "My Space" },
    { label: "Folder", value: "Projects" },
    { label: "List", value: "To Do" },
    { label: "Task", value: task.title },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-background rounded-lg shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex animate-in fade-in zoom-in-95 duration-200"
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

              {/* Property Fields - Vertical List */}
              <div className="space-y-0">
                {/* Status */}
                <PropertyRow label="Status">
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value)
                      if (task) {
                        updateTaskMutation.mutate({
                          taskId: task.id,
                          status: value,
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-[180px]">
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
                </PropertyRow>

                {/* Dates - Start & Due */}
                <PropertyRow label="Dates">
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "h-8 w-[130px] justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {startDate ? startDate.toLocaleDateString() : "Start date"}
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
                            "h-8 w-[130px] justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {dueDate ? dueDate.toLocaleDateString() : "Due date"}
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
                                taskId: task.id,
                                dueDate: date.toISOString(),
                              })
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </PropertyRow>

                {/* Time Tracker */}
                <PropertyRow label="Track time">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-sm font-mono min-w-[80px] justify-center">
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
                </PropertyRow>

                {/* Assignees */}
                <PropertyRow label="Assignees">
                  <div className="flex items-center gap-2 flex-wrap">
                    {assigneesLoading ? (
                      <Skeleton className="h-6 w-20" />
                    ) : (
                      <>
                        {assignees.map((assignee) => (
                          <div
                            key={assignee.id}
                            className="flex items-center gap-1.5 bg-muted rounded-full pr-2 pl-1 py-0.5 group"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={assignee.user.avatarUrl || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(assignee.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{assignee.user.name?.split(" ")[0]}</span>
                            <button
                              onClick={() => handleRemoveAssignee(assignee.userId)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
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

                {/* Priority */}
                <PropertyRow label="Priority">
                  <Select
                    value={priority}
                    onValueChange={(value) => {
                      const newPriority = value as Priority
                      setPriority(newPriority)
                      if (task) {
                        updateTaskMutation.mutate({
                          taskId: task.id,
                          priority: newPriority,
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px]">
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
                </PropertyRow>

                {/* Tags */}
                <PropertyRow label="Tags">
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

                {/* Time Estimate */}
                <PropertyRow label="Time Estimate">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={timeEstimate ?? ""}
                      onChange={(e) => setTimeEstimate(e.target.value ? parseInt(e.target.value) : null)}
                      onBlur={handleSave}
                      placeholder="minutes"
                      className="h-8 w-[100px]"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </PropertyRow>

                {/* + Add Custom Field */}
                <button className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                  <Plus className="h-4 w-4" />
                  Add Custom Field
                </button>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Description
                </label>
                <MarkdownEditor
                  value={description}
                  onChange={setDescription}
                  onBlur={handleSave}
                  placeholder="Add a description..."
                  minHeight="200px"
                />
              </div>

              <Separator />

              {/* Subtasks - Full Task Display */}
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

                {subtasksLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="space-y-1.5 mb-3">
                    {subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-2 group text-sm p-2 rounded hover:bg-muted/50 border border-transparent hover:border-border/50"
                      >
                        {/* Status indicator - clickable to cycle */}
                        <button
                          onClick={() => handleToggleSubtask(subtask)}
                          className="flex-shrink-0 hover:scale-110 transition-transform"
                          title={`Status: ${subtask.status || 'todo'}`}
                        >
                          <div
                            className="w-3.5 h-3.5 rounded-full border-2"
                            style={{
                              borderColor: STATUS_COLORS[subtask.status || "todo"] || STATUS_COLORS.todo,
                              backgroundColor: subtask.status === "done" ? STATUS_COLORS.done : "transparent",
                            }}
                          />
                        </button>

                        {/* Title - clickable */}
                        <button
                          onClick={() => {
                            // Would open subtask detail - for now just let it be
                          }}
                          className={cn(
                            "flex-1 text-left truncate cursor-pointer hover:text-primary transition-colors",
                            subtask.status === "done" && "line-through text-muted-foreground"
                          )}
                          title={subtask.title}
                        >
                          {subtask.title}
                        </button>

                        {/* Priority badge */}
                        {subtask.priority && subtask.priority !== "none" && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] h-5 px-1.5 flex-shrink-0",
                              subtask.priority === "urgent" && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                              subtask.priority === "high" && "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
                              subtask.priority === "medium" && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                              subtask.priority === "low" && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            )}
                          >
                            {subtask.priority}
                          </Badge>
                        )}

                        {/* Assignee avatars - max 2 */}
                        {subtask.assignees && subtask.assignees.length > 0 && (
                          <div className="flex -space-x-1 flex-shrink-0">
                            {subtask.assignees.slice(0, 2).map((assignee) => (
                              <Avatar key={assignee.id} className="h-5 w-5 border border-background">
                                <AvatarImage src={assignee.user.avatarUrl || undefined} />
                                <AvatarFallback className="text-[8px]">
                                  {getInitials(assignee.user.name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {subtask.assignees.length > 2 && (
                              <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px]">
                                +{subtask.assignees.length - 2}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Due date */}
                        {subtask.dueDate && (
                          <span className={cn(
                            "text-[10px] flex-shrink-0",
                            new Date(subtask.dueDate) < new Date() ? "text-red-500 font-medium" : "text-muted-foreground"
                          )}>
                            {new Date(subtask.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}

                        {/* Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteSubtask(subtask.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add subtask..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                  />
                  <Button size="sm" onClick={handleAddSubtask} className="h-8" disabled={!newSubtask.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Dependencies (placeholder) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Dependencies</span>
                </div>
                <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
                  No dependencies set
                </div>
              </div>

              <Separator />

              {/* Attachments (placeholder) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Attachments</span>
                </div>
                <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
                  Coming soon
                </div>
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
            {/* Task Created Event */}
            <ActivityItem
              avatar={null}
              name="System"
              action="created this task"
              timestamp={task.createdAt}
              icon={<Plus className="h-3 w-3" />}
            />

            {/* Status Change Event (mock - would come from activity log) */}
            {currentStatus && (
              <ActivityItem
                avatar={null}
                name="System"
                action={`changed status to ${currentStatus.name}`}
                timestamp={task.updatedAt}
                icon={<ArrowUpRight className="h-3 w-3" />}
              />
            )}

            {/* Comments */}
            {activityTab === "all" || activityTab === "comments" ? (
              comments.length > 0 ? (
                comments.map((comment) => (
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
                        <MarkdownRenderer content={comment.content} />
                      </div>
                    </div>
                  </div>
                ))
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
                {isCommentPreview ? (
                  <div className="border rounded-md p-2 min-h-[60px] max-h-[150px] overflow-auto bg-muted/30">
                    <MarkdownRenderer content={newComment} />
                  </div>
                ) : (
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="min-h-[60px] resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                        e.preventDefault()
                        handleAddComment()
                      }
                    }}
                  />
                )}
                <div className="flex items-center justify-between mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCommentPreview(!isCommentPreview)}
                    className="h-7 text-xs"
                  >
                    {isCommentPreview ? (
                      <>
                        <Edit3 className="h-3 w-3 mr-1" /> Edit
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" /> Preview
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
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
  )
}

// Helper Components
function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center py-2 border-b border-border/30">
      <span className="w-32 text-sm text-muted-foreground flex-shrink-0">{label}</span>
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

// Need to import Textarea and Edit3/Eye icons for comment input
import { Textarea } from "@/components/ui/textarea"
import { Eye, Edit3 } from "lucide-react"
