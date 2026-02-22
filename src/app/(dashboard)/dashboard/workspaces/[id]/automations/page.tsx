"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Zap, Plus, Trash2, ArrowRight, Settings, Users, Tag, Bell } from "lucide-react"
import { useAutomations, useCreateAutomation, useUpdateAutomation, useDeleteAutomation } from "@/hooks/useAutomations"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const TRIGGER_TYPES = [
  { value: "status_change", label: "Status Change" },
  { value: "task_created", label: "Task Created" },
  { value: "due_date", label: "Due Date" },
  { value: "assignment", label: "Assignment" },
]

const ACTION_TYPES = [
  { value: "change_status", label: "Change Status", icon: Settings },
  { value: "assign_user", label: "Assign User", icon: Users },
  { value: "add_label", label: "Add Label", icon: Tag },
  { value: "notify", label: "Send Notification", icon: Bell },
]

export default function AutomationsPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string

  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    triggerType: "",
    triggerValue: "",
    actionType: "",
    actionValue: "",
  })

  const { data: automations, isLoading } = useAutomations(workspaceId)
  const createMutation = useCreateAutomation()
  const updateMutation = useUpdateAutomation()
  const deleteMutation = useDeleteAutomation()

  const handleCreate = () => {
    createMutation.mutate({
      workspaceId,
      data: {
        name: formData.name,
        triggerType: formData.triggerType,
        triggerConfig: { value: formData.triggerValue },
        actionType: formData.actionType,
        actionConfig: { value: formData.actionValue },
      },
    })
    setOpen(false)
    setFormData({ name: "", triggerType: "", triggerValue: "", actionType: "", actionValue: "" })
  }

  const handleToggle = (automationId: string, enabled: boolean) => {
    updateMutation.mutate({ automationId, data: { enabled } })
  }

  const handleDelete = (automationId: string) => {
    if (confirm("Are you sure you want to delete this automation?")) {
      deleteMutation.mutate(automationId)
    }
  }

  const getTriggerLabel = (type: string) => {
    return TRIGGER_TYPES.find((t) => t.value === type)?.label || type
  }

  const getActionLabel = (type: string) => {
    return ACTION_TYPES.find((a) => a.value === type)?.label || type
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
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
            <Zap className="h-6 w-6" />
            Automations
          </h1>
          <p className="text-muted-foreground">Automate your workflow with triggers and actions</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Automation</DialogTitle>
              <DialogDescription>
                Set up a trigger and action to automate your tasks
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Automation Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Move to Done"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label>When this happens (Trigger)</Label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(value) => setFormData({ ...formData, triggerType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.triggerType === "status_change" && (
                <div className="grid gap-2">
                  <Label>When status changes to</Label>
                  <Select
                    value={formData.triggerValue}
                    onValueChange={(value) => setFormData({ ...formData, triggerValue: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-center py-2">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="grid gap-2">
                <Label>Do this (Action)</Label>
                <Select
                  value={formData.actionType}
                  onValueChange={(value) => setFormData({ ...formData, actionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        <div className="flex items-center gap-2">
                          <action.icon className="h-4 w-4" />
                          {action.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.actionType === "change_status" && (
                <div className="grid gap-2">
                  <Label>Change status to</Label>
                  <Select
                    value={formData.actionValue}
                    onValueChange={(value) => setFormData({ ...formData, actionValue: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name || !formData.triggerType || !formData.actionType}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(!automations || automations.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No automations yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first automation to streamline your workflow
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {automations.map((automation) => (
            <Card key={automation.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{automation.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {getTriggerLabel(automation.triggerType)}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={automation.enabled}
                    onCheckedChange={(checked) => handleToggle(automation.id, checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span>{getActionLabel(automation.actionType)}</span>
                  {(() => {
                    const cfg = automation.triggerConfig as Record<string, string> | null
                    return cfg?.value ? (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {cfg.value}
                      </Badge>
                    ) : null
                  })()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(automation.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
