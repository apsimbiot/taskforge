"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Calendar, Clock, CheckSquare, MessageSquare, Play, Pause, Square, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
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
import { useUpdateTask, useDeleteTask } from "@/hooks/useQueries"
import { cn } from "@/lib/utils"
import { extractTextFromTiptap } from "@/lib/tiptap"
import type { TaskResponse, StatusResponse } from "@/lib/api"

interface TaskDetailPanelProps {
  task: TaskResponse | null | undefined
  open: boolean
  onClose: () => void
  statuses: StatusResponse[]
}

type Priority = "none" | "low" | "medium" | "high" | "urgent"

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "none", label: "None", color: "bg-muted" },
  { value: "low", label: "Low", color: "bg-green-500" },
  { value: "medium", label: "Medium", color: "bg-blue-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "urgent", label: "Urgent", color: "bg-red-500" },
]

function normalizeStatusName(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, "_")
  const aliases: Record<string, string> = {
    "to_do": "todo",
    "in_review": "review",
  }
  return aliases[slug] ?? slug
}

export function TaskDetailPanel({ task, open, onClose, statuses }: TaskDetailPanelProps) {
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()

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

  // Subtasks state (local, persisted in future)
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([])
  const [newSubtask, setNewSubtask] = useState("")

  // Comments state (local, persisted in future)
  const [comments, setComments] = useState<{ id: string; author: string; text: string; createdAt: string }[]>([])
  const [newComment, setNewComment] = useState("")

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

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return
    setSubtasks([
      ...subtasks,
      { id: Date.now().toString(), title: newSubtask.trim(), completed: false },
    ])
    setNewSubtask("")
  }

  const handleToggleSubtask = (id: string) => {
    setSubtasks(subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st)))
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return
    setComments([
      ...comments,
      {
        id: Date.now().toString(),
        author: "You",
        text: newComment.trim(),
        createdAt: new Date().toISOString(),
      },
    ])
    setNewComment("")
  }

  if (!open || !task) return null

  // Find matching status object for current task
  const currentStatus = statuses.find((s) => normalizeStatusName(s.name) === status)

  return (
    <div
      className="fixed inset-y-0 right-0 w-[480px] bg-background border-l shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200"
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
        <div className="p-4 space-y-6">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            className="text-lg font-semibold border-0 px-0 focus-visible:ring-0"
            placeholder="Task title"
          />

          {/* Status & Priority Row */}
          <div className="flex gap-4">
            <div className="flex-1">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={normalizeStatusName(s.name)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
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

          {/* Time Estimate */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Time Estimate (minutes)
            </label>
            <Input
              type="number"
              value={timeEstimate ?? ""}
              onChange={(e) => setTimeEstimate(e.target.value ? parseInt(e.target.value) : null)}
              onBlur={handleSave}
              placeholder="Enter estimate"
              className="w-full"
            />
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
              className="w-full min-h-[120px] resize-none"
            />
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

          {/* Subtasks */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              Subtasks
              <Badge variant="secondary" className="ml-1">
                {subtasks.filter((s) => s.completed).length}/{subtasks.length}
              </Badge>
            </label>

            <div className="space-y-2 mb-3">
              {subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => handleToggleSubtask(subtask.id)}
                    className={cn(
                      "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                      subtask.completed
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground hover:border-primary"
                    )}
                  >
                    {subtask.completed && (
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                  <span className={cn(subtask.completed && "line-through text-muted-foreground")}>
                    {subtask.title}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add subtask..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
              />
              <Button size="sm" onClick={handleAddSubtask}>
                Add
              </Button>
            </div>
          </div>

          <Separator />

          {/* Comments */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Comments
            </label>

            <div className="space-y-3 mb-3">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No comments yet.</p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">{comment.author[0]}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              />
              <Button size="sm" onClick={handleAddComment}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Created {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "N/A"}</span>
          <span>Updated {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : "N/A"}</span>
        </div>
      </div>
    </div>
  )
}
