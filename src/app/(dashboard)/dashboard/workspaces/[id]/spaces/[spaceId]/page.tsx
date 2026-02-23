"use client"

import { use, useState } from "react"
import { Plus, FolderClosed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Breadcrumb } from "@/components/breadcrumb"
import { CreateFolderDialog } from "@/components/create-folder-dialog"
import { useFolders, useSpaceLists, useCreateFolder, useSpace } from "@/hooks/useQueries"
import { useRouter } from "next/navigation"

export default function SpacePage({
  params,
}: {
  params: Promise<{ id: string; spaceId: string }>
}) {
  const { id: workspaceId, spaceId } = use(params)
  const router = useRouter()
  const { data: space, isLoading: spaceLoading } = useSpace(spaceId)
  const { data: folders, isLoading: foldersLoading } = useFolders(spaceId)
  const { data: lists, isLoading: listsLoading } = useSpaceLists(spaceId)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const createFolderMutation = useCreateFolder()

  const isLoading = spaceLoading || foldersLoading || listsLoading

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <Breadcrumb
          items={[
            { label: "Workspace", href: `/dashboard/workspaces/${workspaceId}` },
            { label: "Space" },
          ]}
          className="mb-2"
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{spaceLoading ? "Loading..." : space?.name || "Space"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Folders and lists in this space
            </p>
          </div>
          <Button onClick={() => setShowCreateFolder(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Folders Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Folders</h2>
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
          ) : folders && folders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map((folder) => (
                <Card
                  key={folder.id}
                  className="cursor-pointer hover:shadow-md transition-all duration-150"
                  onClick={() =>
                    router.push(
                      `/dashboard/workspaces/${workspaceId}/spaces/${spaceId}/folders/${folder.id}`
                    )
                  }
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <FolderClosed className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">{folder.name}</h3>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FolderClosed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No folders yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first folder to organize your lists.
                </p>
                <Button onClick={() => setShowCreateFolder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first folder
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lists Section (lists not in folders) */}
        {lists && lists.filter((l) => !l.folderId).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Lists</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists
                .filter((l) => !l.folderId)
                .map((list) => (
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
                      <h3 className="font-semibold">{list.name}</h3>
                      {list.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {list.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>

      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        spaceId={spaceId}
        onSubmit={(data) => {
          createFolderMutation.mutate({
            spaceId,
            name: data.name,
          })
        }}
      />
    </div>
  )
}
