"use client"

import { use, useState } from "react"
import { Plus, ListTodo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Breadcrumb } from "@/components/breadcrumb"
import { CreateListDialog } from "@/components/create-list-dialog"
import { useFolderLists, useCreateList } from "@/hooks/useQueries"
import { useRouter } from "next/navigation"

export default function FolderPage({
  params,
}: {
  params: Promise<{ id: string; spaceId: string; folderId: string }>
}) {
  const { id: workspaceId, spaceId, folderId } = use(params)
  const router = useRouter()
  const { data: lists, isLoading } = useFolderLists(folderId)
  const [showCreateList, setShowCreateList] = useState(false)
  const createListMutation = useCreateList()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <Breadcrumb
          items={[
            { label: "Workspace", href: `/dashboard/workspaces/${workspaceId}` },
            {
              label: "Space",
              href: `/dashboard/workspaces/${workspaceId}/spaces/${spaceId}`,
            },
            { label: "Folder" },
          ]}
          className="mb-2"
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Folder</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lists in this folder
            </p>
          </div>
          <Button onClick={() => setShowCreateList(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New List
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-8 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : lists && lists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <Card
                key={list.id}
                className="cursor-pointer hover:shadow-md transition-all duration-150"
                onClick={() =>
                  router.push(
                    `/dashboard/workspaces/${workspaceId}/spaces/${spaceId}/lists/${list.id}`
                  )
                }
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <ListTodo className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">{list.name}</h3>
                      {list.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {list.description}
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
              <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No lists yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first list to start tracking tasks.
              </p>
              <Button onClick={() => setShowCreateList(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create List
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateListDialog
        open={showCreateList}
        onOpenChange={setShowCreateList}
        folderId={folderId}
        onSubmit={(data) => {
          createListMutation.mutate({
            folderId,
            name: data.name,
            spaceId,
          })
        }}
      />
    </div>
  )
}
