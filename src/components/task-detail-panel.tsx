"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Calendar, Clock, CheckSquare, MessageSquare, Play, Pause, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useUpdateTask } from "@/hooks/useQueries"
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

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState<Priority>("none")
  const [dueDate, setDueDate] = useState("")
  const [timeEstimate, setTimeEstimate] = useState<number | null>(null)

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
      setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "")
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
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      timeEstimate: timeEstimate ?? undefined,
    })
  }, [task, title, description, status, priority, dueDate, timeEstimate, updateTaskMutation])

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
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
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
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  if (task) {
                    updateTaskMutation.mutate({
                      taskId: task.id,
                      status: e.target.value,
                    })
                  }
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={normalizeStatusName(s.name)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  const newPriority = e.target.value as Priority
                  setPriority(newPriority)
                  if (task) {
                    updateTaskMutation.mutate({
                      taskId: task.id,
                      priority: newPriority,
                    })
                  }
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due Date
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={handleSave}
              className="w-full"
            />
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
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              placeholder="Add a description..."
              className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
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
