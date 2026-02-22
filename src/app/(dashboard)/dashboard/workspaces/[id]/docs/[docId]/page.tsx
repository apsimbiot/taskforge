"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Save,
  Trash2,
} from "lucide-react"
import { useDocument, useUpdateDocument, useDeleteDocument } from "@/hooks/useDocuments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function DocDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string
  const docId = params.docId as string

  const { data, isLoading } = useDocument(docId)
  const updateMutation = useUpdateDocument()
  const deleteMutation = useDeleteDocument()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data?.document) {
      setTitle(data.document.title)
      const c = data.document.content
      if (typeof c === "string") {
        setContent(c)
      } else if (c && typeof c === "object" && "text" in c) {
        setContent(String((c as any).text || ""))
      } else {
        setContent("")
      }
      setDirty(false)
    }
  }, [data])

  const handleSave = useCallback(() => {
    updateMutation.mutate({
      documentId: docId,
      data: {
        title,
        content: { text: content },
      },
    })
    setDirty(false)
  }, [docId, title, content, updateMutation])

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [handleSave])

  const handleDelete = () => {
    if (confirm("Delete this document?")) {
      deleteMutation.mutate(docId, {
        onSuccess: () => {
          router.push(`/dashboard/workspaces/${workspaceId}/docs`)
        },
      })
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!data?.document) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Document not found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() =>
              router.push(`/dashboard/workspaces/${workspaceId}/docs`)
            }
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Docs
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {data.document.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!dirty}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto py-8 px-6 space-y-4">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setDirty(true)
            }}
            placeholder="Untitled Document"
            className="text-3xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40"
          />
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setDirty(true)
            }}
            placeholder="Start writing..."
            className="min-h-[500px] border-none shadow-none p-0 resize-none focus-visible:ring-0 text-base leading-relaxed placeholder:text-muted-foreground/40"
          />
        </div>
      </div>
    </div>
  )
}
