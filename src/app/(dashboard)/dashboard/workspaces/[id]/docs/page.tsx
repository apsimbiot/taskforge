"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  FileText,
  Plus,
  ChevronRight,
  Trash2,
  File,
  FolderOpen,
} from "lucide-react"
import { useDocuments, useCreateDocument, useDeleteDocument } from "@/hooks/useDocuments"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { DocumentResponse } from "@/lib/api/documents"

function buildDocTree(docs: DocumentResponse[]): (DocumentResponse & { children: DocumentResponse[] })[] {
  const map = new Map<string, DocumentResponse & { children: DocumentResponse[] }>()
  const roots: (DocumentResponse & { children: DocumentResponse[] })[] = []

  docs.forEach((doc) => {
    map.set(doc.id, { ...doc, children: [] })
  })

  docs.forEach((doc) => {
    const node = map.get(doc.id)!
    if (doc.parentDocumentId && map.has(doc.parentDocumentId)) {
      map.get(doc.parentDocumentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function DocTreeItem({
  doc,
  workspaceId,
  depth = 0,
  onDelete,
}: {
  doc: DocumentResponse & { children: DocumentResponse[] }
  workspaceId: string
  depth?: number
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const hasChildren = doc.children && doc.children.length > 0

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors",
        )}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="p-0.5"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                expanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-5" />
        )}
        <button
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() =>
            router.push(`/dashboard/workspaces/${workspaceId}/docs/${doc.id}`)
          }
        >
          {hasChildren ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm truncate">{doc.title}</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(doc.id)
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      {expanded && hasChildren && (
        <div>
          {doc.children.map((child: any) => (
            <DocTreeItem
              key={child.id}
              doc={child}
              workspaceId={workspaceId}
              depth={depth + 1}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocsPage() {
  const params = useParams()
  const workspaceId = params.id as string
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [parentId, setParentId] = useState<string | undefined>()

  const { data: documents, isLoading } = useDocuments(workspaceId)
  const createMutation = useCreateDocument()
  const deleteMutation = useDeleteDocument()

  const handleCreate = () => {
    if (!title.trim()) return
    createMutation.mutate({
      workspaceId,
      data: {
        title: title.trim(),
        parentDocumentId: parentId,
      },
    })
    setCreateOpen(false)
    setTitle("")
    setParentId(undefined)
  }

  const handleDelete = (docId: string) => {
    if (confirm("Delete this document? This will also delete all child documents.")) {
      deleteMutation.mutate(docId)
    }
  }

  const tree = documents ? buildDocTree(documents) : []

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
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
            <FileText className="h-6 w-6" />
            Docs
          </h1>
          <p className="text-muted-foreground">
            Create and organize your workspace documents
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Document</DialogTitle>
              <DialogDescription>
                Create a new document in your workspace
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  placeholder="Untitled Document"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              {documents && documents.length > 0 && (
                <div className="grid gap-2">
                  <Label>Parent Document (optional)</Label>
                  <Select
                    value={parentId || ""}
                    onValueChange={(value) => setParentId(value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (root document)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (root document)</SelectItem>
                      {documents.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!title.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tree.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <File className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first document to get started
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2">
            {tree.map((doc) => (
              <DocTreeItem
                key={doc.id}
                doc={doc}
                workspaceId={workspaceId}
                onDelete={handleDelete}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
