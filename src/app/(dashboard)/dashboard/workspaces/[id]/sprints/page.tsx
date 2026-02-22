"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Play,
  CheckCircle2,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useSprints, useCreateSprint } from "@/hooks/useQueries"
import { cn } from "@/lib/utils"
import { format, differenceInDays } from "date-fns"

// ── Create Sprint Dialog ──────────────────────────────────────────────────

function CreateSprintDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [goal, setGoal] = useState("")
  
  const createSprintMutation = useCreateSprint()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !startDate || !endDate) return

    createSprintMutation.mutate({
      workspaceId,
      name,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      goal: goal || undefined,
    }, {
      onSuccess: () => {
        setOpen(false)
        setName("")
        setStartDate(undefined)
        setEndDate(undefined)
        setGoal("")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Sprint
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Sprint</DialogTitle>
          <DialogDescription>
            Set up a new sprint for your team to work on.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Sprint Name</Label>
              <Input 
                id="name" 
                placeholder="e.g., Sprint 1" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
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
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Sprint Goal</Label>
              <Textarea 
                id="goal" 
                placeholder="What do you want to achieve this sprint?" 
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSprintMutation.isPending}>
              {createSprintMutation.isPending ? "Creating..." : "Create Sprint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Sprint Card ───────────────────────────────────────────────────────────

function SprintCard({ sprint, workspaceId }: { sprint: { id: string; name: string; startDate: string; endDate: string; status: string; goal: string | null }; workspaceId: string }) {
  const startDate = new Date(sprint.startDate)
  const endDate = new Date(sprint.endDate)
  const now = new Date()
  
  const totalDays = differenceInDays(endDate, startDate)
  const daysRemaining = differenceInDays(endDate, now)
  const progress = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100))
  
  const statusColors = {
    planned: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
  }

  const statusIcons = {
    planned: <Clock className="h-3 w-3" />,
    active: <Play className="h-3 w-3" />,
    completed: <CheckCircle2 className="h-3 w-3" />,
  }

  return (
    <Link href={`/dashboard/workspaces/${workspaceId}/sprints/${sprint.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{sprint.name}</CardTitle>
            <Badge className={cn("flex items-center gap-1", statusColors[sprint.status as keyof typeof statusColors])}>
              {statusIcons[sprint.status as keyof typeof statusIcons]}
              {sprint.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>{format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}</span>
          </div>
          
          {sprint.goal && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {sprint.goal}
            </p>
          )}
          
          {sprint.status === "active" && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{daysRemaining > 0 ? `${daysRemaining} days left` : "Ended"}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SprintsPage() {
  const params = useParams()
  const workspaceId = params.id as string
  
  const { data: sprints, isLoading } = useSprints(workspaceId)

  const plannedSprints = sprints?.filter(s => s.status === "planned") ?? []
  const activeSprints = sprints?.filter(s => s.status === "active") ?? []
  const completedSprints = sprints?.filter(s => s.status === "completed") ?? []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sprints</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your team's sprints and track progress.
            </p>
          </div>
          <CreateSprintDialog workspaceId={workspaceId} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
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
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Play className="h-3.5 w-3.5" />
                Active ({activeSprints.length})
              </TabsTrigger>
              <TabsTrigger value="planned" className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Planned ({plannedSprints.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed ({completedSprints.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeSprints.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No active sprints</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start a sprint to track your team's progress.
                    </p>
                    <CreateSprintDialog workspaceId={workspaceId} />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSprints.map((sprint) => (
                    <SprintCard key={sprint.id} sprint={sprint} workspaceId={workspaceId} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="planned">
              {plannedSprints.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No planned sprints</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Plan your next sprint to get started.
                    </p>
                    <CreateSprintDialog workspaceId={workspaceId} />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plannedSprints.map((sprint) => (
                    <SprintCard key={sprint.id} sprint={sprint} workspaceId={workspaceId} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {completedSprints.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No completed sprints</h3>
                    <p className="text-sm text-muted-foreground">
                      Completed sprints will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedSprints.map((sprint) => (
                    <SprintCard key={sprint.id} sprint={sprint} workspaceId={workspaceId} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
