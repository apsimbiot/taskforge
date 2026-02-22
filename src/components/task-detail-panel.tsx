"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { X, Calendar, Clock, CheckSquare, MessageSquare, Play, Pause, Square, Trash2, Plus, Check, Search, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
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
  const [timeEstimate, setTimeEstimate] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

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

  // Assignee picker
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState("")

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(extractTextFromTiptap(task.description))
      setStatus(task.status || "todo")
      setPriority((task.priority as Priority) || "none")
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined)
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
    setTimerSeconds(0)
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
    toggleSubtaskMutation.mutate({
      taskId: task.id,
      subtaskId: subtask.id,
      completed: subtask.status !== "done",
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
    if (!task || !editingSubtaskId || !editingSubtaskTitle.trim()) return
    // Note: Would need an update subtask mutation - for now just close
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

  return (
    <div
      className="fixed inset-y-0 right-0 w-[560px] bg-background border-l shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          {currentStatus && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentStatus.color || "#6366f1" }}
            />
          )}
          <span className="text-sm text-muted-foreground">
            {currentStatus?.name || "No Status"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
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
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
            placeholder="Task title"
          />

          {/* Properties Row */}
          <div className="flex flex-wrap gap-3">
            {/* Assignees */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Assignees
              </label>
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
            </div>

            {/* Status */}
            <div className="w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Status
              </label>
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
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select status" />
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

            {/* Priority */}
            <div className="w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Priority
              </label>
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
                <SelectTrigger className="h-8">
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
          </div>

          {/* Due Date & Time Estimate Row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-8",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dueDate ? dueDate.toLocaleDateString() : "Select date"}
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
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Time Estimate
              </label>
              <Input
                type="number"
                value={timeEstimate ?? ""}
                onChange={(e) => setTimeEstimate(e.target.value ? parseInt(e.target.value) : null)}
                onBlur={handleSave}
                placeholder="minutes"
                className="h-8"
              />
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              placeholder="Add a description..."
              className="w-full min-h-[100px] resize-none text-sm"
            />
          </div>

          <Separator />

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                Subtasks
                <Badge variant="secondary" className="ml-1 text-[10px] h-4">
                  {completedSubtasks}/{subtasks.length}
                </Badge>
              </label>
              {subtasks.length > 0 && (
                <Progress value={subtaskProgress} className="h-1.5 w-20" />
              )}
            </div>

            {subtasksLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-1.5 mb-3">
                {subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 group text-sm p-1.5 rounded hover:bg-muted/50"
                  >
                    <button
                      onClick={() => handleToggleSubtask(subtask)}
                      className={cn(
                        "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                        subtask.status === "done"
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40 hover:border-primary"
                      )}
                    >
                      {subtask.status === "done" && (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                    {editingSubtaskId === subtask.id ? (
                      <Input
                        value={editingSubtaskTitle}
                        onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                        onBlur={handleSaveEditSubtask}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveEditSubtask()}
                        className="h-6 flex-1"
                        autoFocus
                      />
                    ) : (
                      <span
                        className={cn(
                          "flex-1 cursor-pointer",
                          subtask.status === "done" && "line-through text-muted-foreground"
                        )}
                        onClick={() => handleStartEditSubtask(subtask)}
                      >
                        {subtask.title}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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

          {/* Activity - Comments & History */}
          <div>
            <Tabs defaultValue="comments" className="w-full">
              <TabsList className="w-full justify-start h-8 bg-transparent border-b rounded-none px-0">
                <TabsTrigger
                  value="comments"
                  className="flex items-center gap-1.5 text-xs px-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <MessageSquare className="h-3 w-3" />
                  Comments
                  <Badge variant="secondary" className="ml-1 text-[10px] h-4">
                    {comments.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-1.5 text-xs px-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Clock className="h-3 w-3" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comments" className="mt-3 space-y-3">
                {commentsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No comments yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="h-7 w-7">
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
                            {comment.updatedAt && (
                              <span className="text-[10px] text-muted-foreground">(edited)</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="h-8"
                  >
                    Send
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-3">
                <p className="text-xs text-muted-foreground italic py-2">
                  Activity log coming soon...
                </p>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Time Tracker */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Time Tracker
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-sm font-mono min-w-[80px] justify-center">
                <span className={cn("text-lg", isTimerRunning && "text-green-500")}>
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

              <span className="text-xs text-muted-foreground ml-2">
                {task.timeSpent ? `Total: ${Math.round(task.timeSpent / 60)}m` : ""}
              </span>
            </div>
          </div>

          <Separator />

          {/* Details Section */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Details
            </label>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-muted-foreground">
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="text-muted-foreground">
                  {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
              {/* Dependencies would go here - requires blockedBy/blocks from task */}
              {(task as any).blockedBy && (task as any).blockedBy.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blocked by</span>
                  <span className="text-muted-foreground">{(task as any).blockedBy.length} task(s)</span>
                </div>
              )}
              {(task as any).blocks && (task as any).blocks.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blocks</span>
                  <span className="text-muted-foreground">{(task as any).blocks.length} task(s)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
