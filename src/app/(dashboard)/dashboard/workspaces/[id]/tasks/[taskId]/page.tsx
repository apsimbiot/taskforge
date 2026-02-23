"use client"

import { use } from "react"
import { useTask } from "@/hooks/useQueries"
import { TaskDetailPanel } from "@/components/task-detail-panel"
import { useStatuses } from "@/hooks/useQueries"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Task not found</h2>
          <p className="text-muted-foreground mt-2">This task may have been deleted.</p>
          <Button className="mt-4" onClick={() => router.back()}>Go back</Button>
        </div>
      </div>
    )
  }

  return (
    <TaskDetailPanel
      task={task}
      taskId={taskId}
      open={true}
      onClose={() => router.back()}
      onTaskSelect={(id) => router.push(`/dashboard/workspaces/${workspaceId}/tasks/${id}`)}
      statuses={statuses}
      workspaceId={workspaceId}
    />
  )
}
