"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Target,
  Play,
  CheckCircle2,
  Clock,
  Trash2,
  MoreHorizontal,
  X,
  ArrowRight,
  FolderKanban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useSprint,
  useSprints,
  useUpdateSprint,
  useDeleteSprint,
  useRemoveTaskFromSprint,
  useMoveTaskBetweenSprints,
} from "@/hooks/useQueries"
import { cn } from "@/lib/utils"
import type { TaskResponse, SprintResponse } from "@/lib/api"
import { format, differenceInDays, eachDayOfInterval, isAfter, isBefore, isToday } from "date-fns"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

// ── Status Columns for Kanban ──────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { key: "todo", label: "To Do", color: "bg-gray-500" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { key: "in_review", label: "In Review", color: "bg-yellow-500" },
  { key: "done", label: "Done", color: "bg-green-500" },
]

// ── Burndown Chart ─────────────────────────────────────────────────────────

function BurndownChart({
  tasks,
  startDate,
  endDate,
}: {
  tasks: Array<{ id: string; status: string | null; createdAt: string; updatedAt: string }>
  startDate: Date
  endDate: Date
}) {
  const chartData = useMemo(() => {
    const totalTasks = tasks.length
    if (totalTasks === 0) return []

    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const totalDays = days.length

    return days.map((day, index) => {
      // Ideal burndown: linear from total to 0
      const idealRemaining = Math.round(totalTasks - (totalTasks * (index / (totalDays - 1 || 1))))

      // Actual: count tasks that were "done" by this day
      const completedByDay = tasks.filter((task) => {
        if (task.status !== "done" && task.status !== "closed" && task.status !== "complete") return false
        const updatedDate = new Date(task.updatedAt)
        return isBefore(updatedDate, day) || isToday(day)
      }).length

      const actualRemaining = isAfter(day, new Date()) ? null : totalTasks - completedByDay

      return {
        date: format(day, "MMM d"),
        ideal: idealRemaining,
        actual: actualRemaining,
      }
    })
  }, [tasks, startDate, endDate])

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
        No tasks in this sprint yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            fontSize: "12px",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="ideal"
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="5 5"
          dot={false}
          name="Ideal"
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          name="Actual"
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Sprint Task Card ───────────────────────────────────────────────────────

function SprintTaskCard({
  task,
  sprintId,
}: {
  task: {
    id: string
    title: string
    status: string | null
    priority: string | null
    dueDate: string | null
    spaceName?: string | null
    spaceColor?: string | null
  }
  sprintId: string
}) {
  const removeFromSprint = useRemoveTaskFromSprint()

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-green-100 text-green-700 border-green-200",
  }

  return (
    <div className="group rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => removeFromSprint.mutate({ sprintId, taskId: task.id })}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {task.priority && (
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0", priorityColors[task.priority])}
          >
            {task.priority}
          </Badge>
        )}
        {task.dueDate && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" />
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}
        {task.spaceColor && (
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: task.spaceColor }}
          />
        )}
      </div>
    </div>
  )
}

// ── Kanban Column ──────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  tasks,
  sprintId,
}: {
  column: { key: string; label: string; color: string }
  tasks: Array<{
    id: string
    title: string
    status: string | null
    priority: string | null
    dueDate: string | null
    spaceName?: string | null
    spaceColor?: string | null
  }>
  sprintId: string
}) {
  return (
    <div className="flex-1 min-w-[250px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn("h-2.5 w-2.5 rounded-full", column.color)} />
        <h3 className="text-sm font-semibold">{column.label}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
        {tasks.map((task) => (
          <SprintTaskCard key={task.id} task={task} sprintId={sprintId} />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-[80px] text-xs text-muted-foreground">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SprintDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string
  const sprintId = params.sprintId as string

  const { data, isLoading } = useSprint(sprintId)
  const updateSprintMutation = useUpdateSprint()
  const deleteSprintMutation = useDeleteSprint()

  const sprint = data?.sprint
  const tasks: TaskResponse[] = data?.tasks ?? []

  const startDate = sprint ? new Date(sprint.startDate) : new Date()
  const endDate = sprint ? new Date(sprint.endDate) : new Date()
  const now = new Date()
  const totalDays = differenceInDays(endDate, startDate)
  const daysRemaining = differenceInDays(endDate, now)
  const timeProgress = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100))

  const doneTasks = tasks.filter(
    (t: TaskResponse) => t.status === "done" || t.status === "closed" || t.status === "complete"
  )
  const taskProgress = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0

  // Group tasks by status for kanban
  const tasksByStatus = useMemo(() => {
    const groups: Record<string, typeof tasks> = {}
    KANBAN_COLUMNS.forEach((col) => {
      groups[col.key] = []
    })
    tasks.forEach((task) => {
      const status = task.status?.toLowerCase().replace(/\s+/g, "_") ?? "todo"
      if (groups[status]) {
        groups[status].push(task)
      } else {
        groups["todo"].push(task)
      }
    })
    return groups
  }, [tasks])

  const statusColors = {
    planned: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
  }

  const handleStartSprint = () => {
    updateSprintMutation.mutate({ sprintId, status: "active" })
  }

  // Close Sprint Dialog State
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [closeOption, setCloseOption] = useState<"move" | "backlog">("backlog")
  const [targetSprintId, setTargetSprintId] = useState<string>("")

  const { data: allSprints } = useSprints(workspaceId)
  
  // Get other sprints (not current one) that are not completed
  const availableTargetSprints = useMemo(() => {
    return (allSprints ?? []).filter(
      (s: SprintResponse) => s.id !== sprintId && s.status !== "completed"
    )
  }, [allSprints, sprintId])

  const incompleteTasks = tasks.filter(
    (t: TaskResponse) => t.status !== "done" && t.status !== "closed" && t.status !== "complete"
  )

  const handleCloseSprint = () => {
    setShowCloseDialog(true)
  }

  const confirmCloseSprint = () => {
    if (closeOption === "move" && targetSprintId && incompleteTasks.length > 0) {
      // Move incomplete tasks to target sprint
      incompleteTasks.forEach((task: TaskResponse) => {
        moveTaskBetweenSprintsMutation.mutate({
          fromSprintId: sprintId,
          toSprintId: targetSprintId,
          taskId: task.id,
        })
      })
    } else {
      // Just remove incomplete tasks from sprint (keep in backlog)
      incompleteTasks.forEach((task: TaskResponse) => {
        removeTaskFromSprintMutation.mutate({ sprintId, taskId: task.id })
      })
    }
    
    // Mark sprint as completed
    updateSprintMutation.mutate({ sprintId, status: "completed" })
    setShowCloseDialog(false)
  }

  const moveTaskBetweenSprintsMutation = useMoveTaskBetweenSprints()
  const removeTaskFromSprintMutation = useRemoveTaskFromSprint()

  const handleDeleteSprint = () => {
    deleteSprintMutation.mutate(sprintId, {
      onSuccess: () => {
        router.push(`/dashboard/workspaces/${workspaceId}/sprints`)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b px-6 py-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="p-6 space-y-4">
          <div className="h-32 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-lg font-semibold">Sprint not found</h2>
        <Button
          variant="link"
          onClick={() => router.push(`/dashboard/workspaces/${workspaceId}/sprints`)}
        >
          Back to sprints
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/dashboard/workspaces/${workspaceId}/sprints`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{sprint.name}</h1>
          <Badge className={cn(statusColors[sprint.status as keyof typeof statusColors])}>
            {sprint.status}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            {sprint.status === "planned" && (
              <Button size="sm" onClick={handleStartSprint}>
                <Play className="h-3.5 w-3.5 mr-1" />
                Start Sprint
              </Button>
            )}
            {sprint.status === "active" && (
              <Button size="sm" variant="outline" onClick={handleCloseSprint}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Complete Sprint
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDeleteSprint}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Sprint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground ml-11">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {format(startDate, "MMM d")} – {format(endDate, "MMM d, yyyy")}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Sprint ended"}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {doneTasks.length}/{tasks.length} tasks done
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto space-y-6">
        {/* Sprint Goal */}
        {sprint.goal && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Sprint Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{sprint.goal}</p>
            </CardContent>
          </Card>
        )}

        {/* Progress + Burndown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Tasks Completed</span>
                  <span className="font-medium">{taskProgress}%</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${taskProgress}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Time Elapsed</span>
                  <span className="font-medium">{Math.round(timeProgress)}%</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${timeProgress}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-xl font-bold">{tasks.length}</div>
                  <div className="text-[10px] text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">{doneTasks.length}</div>
                  <div className="text-[10px] text-muted-foreground">Done</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {tasks.length - doneTasks.length}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Remaining</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Burndown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Burndown Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <BurndownChart tasks={tasks} startDate={startDate} endDate={endDate} />
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Sprint Board</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.key}
                column={column}
                tasks={tasksByStatus[column.key] ?? []}
                sprintId={sprintId}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Close Sprint Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Sprint</DialogTitle>
            <DialogDescription>
              {incompleteTasks.length > 0
                ? `You have ${incompleteTasks.length} incomplete task${incompleteTasks.length > 1 ? "s" : ""} in this sprint. What would you like to do with them?`
                : "Are you sure you want to complete this sprint?"}
            </DialogDescription>
          </DialogHeader>
          
          {incompleteTasks.length > 0 && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="closeOption"
                    checked={closeOption === "backlog"}
                    onChange={() => setCloseOption("backlog")}
                    className="h-4 w-4"
                  />
                  <div>
                    <div className="font-medium text-sm">Keep in backlog</div>
                    <div className="text-xs text-muted-foreground">
                      Tasks will be removed from this sprint but remain in their original lists
                    </div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="closeOption"
                    checked={closeOption === "move"}
                    onChange={() => setCloseOption("move")}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Move to another sprint</div>
                    <div className="text-xs text-muted-foreground">
                      Transfer incomplete tasks to a different sprint
                    </div>
                  </div>
                </label>
                
                {closeOption === "move" && (
                  <div className="ml-7 mt-2">
                    <Select value={targetSprintId} onValueChange={setTargetSprintId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target sprint" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTargetSprints.length > 0 ? (
                          availableTargetSprints.map((s: SprintResponse) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <FolderKanban className="h-3.5 w-3.5" />
                                {s.name}
                                <Badge variant="outline" className="ml-1 text-[10px]">
                                  {s.status}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            No other sprints available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmCloseSprint}
              disabled={closeOption === "move" && !targetSprintId && incompleteTasks.length > 0}
            >
              {incompleteTasks.length > 0 && closeOption === "move" ? (
                <>
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Move & Complete
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Complete Sprint
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
