"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import {
  BarChart3,
  Calendar as CalendarIcon,
  Download,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface TimeReportEntry {
  userId: string
  userName: string
  totalMinutes: number
  entryCount: number
}

interface TimeReportResponse {
  byUser: TimeReportEntry[]
  summary: {
    totalMinutes: number
    entryCount: number
  }
}

export default function ReportsPage() {
  const params = useParams()
  const workspaceId = params.id as string

  const [startDate, setStartDate] = useState<Date | undefined>(
    subDays(new Date(), 30)
  )
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())

  const { data, isLoading } = useQuery<TimeReportResponse>({
    queryKey: ["time-reports", workspaceId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const start = startDate ? format(startDate, "yyyy-MM-dd") : ""
      const end = endDate ? format(endDate, "yyyy-MM-dd") : ""
      const res = await fetch(
        `/api/workspaces/${workspaceId}/reports/time?startDate=${start}&endDate=${end}`
      )
      return res.json()
    },
    enabled: !!workspaceId && !!startDate && !!endDate,
  })

  const entries = data?.byUser || []
  const totalMinutes = data?.summary?.totalMinutes || entries.reduce((sum, e) => sum + e.totalMinutes, 0)
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10

  const handleExport = () => {
    const headers = ["User", "Hours", "Tasks"]
    const rows = entries.map((e) => [
      e.userName,
      (e.totalMinutes / 60).toFixed(1),
      e.entryCount.toString(),
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `time-report-${startDate ? format(startDate, "yyyy-MM-dd") : "start"}-to-${endDate ? format(endDate, "yyyy-MM-dd") : "end"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Time Reports
          </h1>
          <p className="text-muted-foreground">
            Time tracking summary per user
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={entries.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-40 justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-40 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate(subDays(new Date(), 7))
                  setEndDate(new Date())
                }}
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate(subDays(new Date(), 30))
                  setEndDate(new Date())
                }}
              >
                Last 30 days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Hours</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {totalHours}h
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team Members</CardDescription>
            <CardTitle className="text-3xl">{entries.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg per Member</CardDescription>
            <CardTitle className="text-3xl">
              {entries.length > 0
                ? (totalHours / entries.length).toFixed(1)
                : 0}
              h
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Report Table */}
      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No time entries</h3>
            <p className="text-muted-foreground text-center">
              Track time on tasks to see reports here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                      Hours
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                      Tasks
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                      Avg/Task
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.userId} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">
                              {entry.userName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {entry.userName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-sm">
                        {(entry.totalMinutes / 60).toFixed(1)}h
                      </td>
                      <td className="p-3 text-right text-sm">
                        {entry.entryCount}
                      </td>
                      <td className="p-3 text-right text-sm text-muted-foreground">
                        {entry.entryCount > 0
                          ? (entry.totalMinutes / 60 / entry.entryCount).toFixed(
                              1
                            )
                          : 0}
                        h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
