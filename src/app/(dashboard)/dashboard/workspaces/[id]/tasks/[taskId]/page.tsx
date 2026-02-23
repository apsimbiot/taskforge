"use client"

import { use } from "react"
import { useTask } from "@/hooks/useQueries"
import { TaskDetailPanel } from "@/components/task-detail-panel"
import { useStatuses } from "@/hooks/useQueries"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export default function TaskPage({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id: workspaceId, taskId } = use(params)
  const { data: task, isLoading } = useTask(taskId)
  const { data: statuses = [] } = useStatuses(task?.listId)
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Skeleton className="h-[80vh] w-full max-w-7xl" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Task not found</h2>
          <p className="text-muted-foreground mt-2">This task may have been deleted.</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/dashboard/workspaces/${workspaceId}`)}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Go to Workspace
        </Button>
      </div>
    )
  }

  // Build back URL - go to the task's list if we have it, otherwise workspace
  const backUrl = task.listId 
    ? `/dashboard/workspaces/${workspaceId}/spaces/${workspaceId}/lists/${task.listId}`
    : `/dashboard/workspaces/${workspaceId}`

  return (
    <>
      {/* Floating Back Button */}
      <div className="fixed top-4 left-4 z-[60]">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push(backUrl)}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to List
        </Button>
      </div>
      
      <TaskDetailPanel
        task={task}
        taskId={taskId}
        open={true}
        onClose={() => router.push(backUrl)}
        onTaskSelect={(id) => router.push(`/dashboard/workspaces/${workspaceId}/tasks/${id}`)}
        statuses={statuses}
        workspaceId={workspaceId}
      />
    </>
  )
}
