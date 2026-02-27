"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTaskPanel } from "@/store/useTaskPanel"
import {
  LayoutGrid,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ListTodo,
  Activity,
  TrendingUp,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useWorkspaces, useDashboardStats, useCreateWorkspace, useTask, useStatuses } from "@/hooks/useQueries"
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog"
import { TaskDetailPanel } from "@/components/task-detail-panel"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// ── Status Donut Chart ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  open: "#94a3b8",
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  "in progress": "#3b82f6",
  in_review: "#f59e0b",
  "in review": "#f59e0b",
  done: "#22c55e",
  closed: "#6b7280",
  complete: "#22c55e",
}

function StatusDonutChart({
  data,
}: {
  data: { name: string; count: number }[]
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No data
      </div>
    )
  }

  const total = data.reduce((acc, d) => acc + d.count, 0)

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={2}
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={STATUS_COLORS[entry.name] || `hsl(${index * 60}, 50%, 50%)`}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#e5e7eb",
            }}
            labelStyle={{ color: "#e5e7eb" }}
            itemStyle={{ color: "#e5e7eb" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-1.5">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: STATUS_COLORS[item.name] || "#94a3b8",
                }}
              />
              <span className="text-muted-foreground capitalize">
                {item.name.replace(/_/g, " ")}
              </span>
            </div>
            <span className="font-medium">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Completed Over Time Chart ──────────────────────────────────────────────

function CompletedOverTimeChart({
  data,
}: {
  data: { date: string; count: number }[]
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No data
      </div>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    date: format(new Date(d.date), "MMM d"),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          interval={6}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#e5e7eb",
          }}
          labelStyle={{ color: "#e5e7eb" }}
          itemStyle={{ color: "#e5e7eb" }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          name="Completed"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Workload Chart ─────────────────────────────────────────────────────────

function WorkloadChart({ data }: { data: { name: string; tasks: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No team members
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip
          contentStyle={{
            background: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#e5e7eb",
          }}
          labelStyle={{ color: "#e5e7eb" }}
          itemStyle={{ color: "#e5e7eb" }}
        />
        <Bar dataKey="tasks" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Activity Item ──────────────────────────────────────────────────────────

function ActivityItem({
  item,
  onTaskClick,
}: {
  item: {
    id: string
    title: string
    status: string | null
    updatedAt: string
    creatorName: string
  }
  onTaskClick?: (taskId: string) => void
}) {
  const statusBadge: Record<string, string> = {
    open: "bg-gray-100 text-gray-700",
    todo: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    "in progress": "bg-blue-100 text-blue-700",
    in_review: "bg-yellow-100 text-yellow-700",
    "in review": "bg-yellow-100 text-yellow-700",
    done: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-700",
    complete: "bg-green-100 text-green-700",
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <Activity className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          <span className="font-medium">{item.creatorName}</span>{" "}
          <span className="text-muted-foreground">updated</span>{" "}
          <button
            onClick={() => onTaskClick?.(item.id)}
            className="font-medium hover:text-primary hover:underline cursor-pointer"
          >
            {item.title}
          </button>
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
        </p>
      </div>
      {item.status && (
        <Badge
          className={cn(
            "text-[10px] px-1.5",
            statusBadge[item.status] || "bg-gray-100 text-gray-700"
          )}
        >
          {item.status.replace(/_/g, " ")}
        </Badge>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [createWsOpen, setCreateWsOpen] = useState(false)
  const createWorkspaceMutation = useCreateWorkspace()
  const { setSelectedTask, selectedTaskId, isOpen, close } = useTaskPanel()
  const { data: selectedTask, isLoading: taskLoading } = useTask(selectedTaskId ?? undefined)
  const { data: statuses = [] } = useStatuses(selectedTask?.listId)

  // Auto-select first workspace once loaded
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id)
    }
  }, [workspaces, selectedWorkspaceId])

  const { data: stats, isLoading: statsLoading } = useDashboardStats(
    selectedWorkspaceId ?? undefined
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your workspace activity and progress.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Tasks
              </CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "—" : (stats?.stats?.totalTasks ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all spaces
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? "—" : (stats?.stats?.completed ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats && stats.stats && stats.stats.totalTasks > 0
                  ? `${Math.round((stats.stats.completed / stats.stats.totalTasks) * 100)}% completion rate`
                  : "No tasks yet"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statsLoading ? "—" : (stats?.stats?.inProgress ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Being worked on
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overdue
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? "—" : (stats?.stats?.overdue ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Need attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Tasks by Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Tasks by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-[200px] bg-muted rounded animate-pulse" />
              ) : (
                <StatusDonutChart data={Object.entries(stats?.tasksByStatus ?? {}).map(([name, count]) => ({ name, count }))} />
              )}
            </CardContent>
          </Card>

          {/* Completed Over Time */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tasks Completed (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-[200px] bg-muted rounded animate-pulse" />
              ) : (
                <CompletedOverTimeChart data={stats?.tasksCompletedPerDay ?? []} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workload + Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Workload per member */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Workload by Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-[200px] bg-muted rounded animate-pulse" />
              ) : (
                <WorkloadChart data={(stats?.workloadPerAssignee ?? []).map(w => ({ name: w.name || "Unassigned", tasks: w.total }))} />
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Overdue Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : stats?.overdueTasks && stats.overdueTasks.length > 0 ? (
                <div className="divide-y max-h-[250px] overflow-auto">
                  {stats.overdueTasks.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => setSelectedTask(item.id)}
                          className="text-sm truncate font-medium hover:text-primary hover:underline cursor-pointer text-left w-full"
                        >
                          {item.title}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {item.status?.replace(/_/g, " ")} • {item.priority}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                  No overdue tasks
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workspace Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Workspaces</h2>
          {workspacesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : workspaces && workspaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <Card
                  key={workspace.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() =>
                    router.push(`/dashboard/workspaces/${workspace.id}`)
                  }
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span className="text-lg font-bold">
                          {workspace.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{workspace.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {workspace.role}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No workspaces yet
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first workspace to get started.
                </p>
                <Button onClick={() => setCreateWsOpen(true)}>
                  Create your first workspace
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreateWorkspaceDialog
        open={createWsOpen}
        onOpenChange={setCreateWsOpen}
        onSubmit={(data) => {
          createWorkspaceMutation.mutate(
            { name: data.name, slug: data.name.toLowerCase().replace(/\s+/g, "-") },
            {
              onSuccess: () => {
                toast.success("Workspace created!")
                setCreateWsOpen(false)
              },
              onError: () => {
                toast.error("Failed to create workspace")
              },
            }
          )
        }}
      />

      <TaskDetailPanel
        task={selectedTask}
        open={isOpen}
        onClose={close}
        statuses={statuses}
        workspaceId={selectedWorkspaceId ?? undefined}
      />
    </div>
  )
}
