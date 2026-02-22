"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Users, TrendingUp, AlertTriangle, CheckCircle, MinusCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface WorkloadEntry {
  user: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }
  tasks: {
    total: number
    byStatus: Record<string, number>
  }
  time: {
    totalMinutes: number
  }
}

interface WorkloadMember {
  userId: string
  name: string
  avatarUrl: string | null
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  timeSpentMinutes: number
  capacityHours: number
}

function getCapacityStatus(total: number, completed: number) {
  const active = total - completed
  if (active > 10) return { label: "Overloaded", color: "destructive" as const, icon: AlertTriangle }
  if (active > 5) return { label: "Balanced", color: "default" as const, icon: CheckCircle }
  return { label: "Underutilized", color: "secondary" as const, icon: MinusCircle }
}

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={`h-2 w-full bg-muted rounded-full overflow-hidden ${className || ""}`}>
      <div
        className="h-full bg-primary rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function WorkloadPage() {
  const params = useParams()
  const workspaceId = params.id as string

  const { data, isLoading } = useQuery<{ workload: WorkloadEntry[] }>({
    queryKey: ["workload", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/reports/workload`)
      return res.json()
    },
    enabled: !!workspaceId,
  })

  // Transform API data to member format
  const members: WorkloadMember[] = (data?.workload || []).map((entry) => ({
    userId: entry.user.id,
    name: entry.user.name,
    avatarUrl: entry.user.avatarUrl,
    totalTasks: entry.tasks.total,
    completedTasks: entry.tasks.byStatus["done"] || entry.tasks.byStatus["completed"] || 0,
    inProgressTasks: entry.tasks.byStatus["in_progress"] || entry.tasks.byStatus["in progress"] || 0,
    overdueTasks: 0, // Would need due date check
    timeSpentMinutes: entry.time.totalMinutes,
    capacityHours: 40,
  }))

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Workload
        </h1>
        <p className="text-muted-foreground">
          View team member task distribution and capacity
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Members</CardDescription>
            <CardTitle className="text-3xl">{members.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tasks</CardDescription>
            <CardTitle className="text-3xl">
              {members.reduce((sum, m) => sum + m.totalTasks, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">
              {members.reduce((sum, m) => sum + m.completedTasks, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Member Workload List */}
      {members.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No team data yet</h3>
            <p className="text-muted-foreground text-center">
              Assign tasks to team members to see workload distribution
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {members.map((member) => {
            const status = getCapacityStatus(member.totalTasks, member.completedTasks)
            const StatusIcon = status.icon
            const hours = Math.round(member.timeSpentMinutes / 60)

            return (
              <Card key={member.userId}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{member.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {member.totalTasks} tasks &middot; {hours}h tracked
                          </p>
                        </div>
                        <Badge variant={status.color} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Task Progress</span>
                          <span>
                            {member.completedTasks}/{member.totalTasks}
                          </span>
                        </div>
                        <ProgressBar
                          value={member.completedTasks}
                          max={member.totalTasks}
                        />
                      </div>

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>In Progress: {member.inProgressTasks}</span>
                        <span>Overdue: {member.overdueTasks}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
