"use client"

import { use, useState } from "react"
import { Plus, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Breadcrumb } from "@/components/breadcrumb"
import { CreateSpaceDialog } from "@/components/create-space-dialog"
import { useSpaces, useCreateSpace } from "@/hooks/useQueries"
import { useRouter } from "next/navigation"

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: workspaceId } = use(params)
  const router = useRouter()
  const { data: spaces, isLoading } = useSpaces(workspaceId)
  const [showCreateSpace, setShowCreateSpace] = useState(false)
  const createSpaceMutation = useCreateSpace()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <Breadcrumb
          items={[{ label: "Workspace" }]}
          className="mb-2"
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workspace</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage spaces in this workspace
            </p>
          </div>
          <Button onClick={() => setShowCreateSpace(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Space
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-10 w-10 bg-muted rounded-lg animate-pulse mb-3" />
                  <div className="h-5 w-32 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : spaces && spaces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <Card
                key={space.id}
                className="cursor-pointer hover:shadow-md transition-all duration-150 hover:border-border"
                onClick={() =>
                  router.push(
                    `/dashboard/workspaces/${workspaceId}/spaces/${space.id}`
                  )
                }
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: (space.color || "#6366f1") + "30" }}
                    >
                      <div
                        className="h-4 w-4 rounded-sm"
                        style={{ backgroundColor: space.color || "#6366f1" }}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">{space.name}</h3>
                      {space.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {space.description}
                        </p>
                      )}
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
              <h3 className="text-lg font-semibold mb-2">No spaces yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first space to organize your work.
              </p>
              <Button onClick={() => setShowCreateSpace(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Space
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateSpaceDialog
        open={showCreateSpace}
        onOpenChange={setShowCreateSpace}
        workspaceId={workspaceId}
        onSubmit={(data) => {
          createSpaceMutation.mutate({
            workspaceId,
            name: data.name,
            color: data.color,
            icon: data.icon,
          })
        }}
      />
    </div>
  )
}
