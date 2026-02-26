"use client"

import React, { useState, useCallback } from "react"
import {
  X,
  Sparkles,
  Upload,
  Link2,
  FileText,
  Loader2,
  Plus,
  Check,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TaskPreviewCard, type GeneratedTask } from "./task-preview-card"

interface AIGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  listId: string
  onTasksCreated?: (count: number) => void
}

// Generate unique ID for preview tasks
const generateId = () => Math.random().toString(36).substring(2, 15)

export function AIGenerateModal({
  isOpen,
  onClose,
  listId,
  onTasksCreated,
}: AIGenerateModalProps) {
  const [inputType, setInputType] = useState<"text" | "file" | "url">("text")
  const [content, setContent] = useState("")
  const [url, setUrl] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([])
  const [isCreating, setIsCreating] = useState(false)

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setContent("")
    setUrl("")
    setError(null)
    setGeneratedTasks([])
    setIsGenerating(false)
    setIsCreating(false)
    onClose()
  }, [onClose])

  // Call AI to generate tasks
  const handleGenerate = async () => {
    if (!content.trim() && !url.trim()) {
      setError("Please provide some content to generate tasks from.")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/generate-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: inputType === "url" ? "url" : content.startsWith("data:image/") ? "image" : "text",
          content: inputType === "url" ? url : content,
          listId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to generate tasks")
      }

      const data = await response.json()

      // Convert AI response to our format with unique IDs
      const tasks: GeneratedTask[] = (data.tasks || []).map(
        (task: {
          title: string
          description: string
          priority: "urgent" | "high" | "medium" | "low"
        }) => ({
          id: generateId(),
          title: task.title,
          description: task.description || "",
          priority: task.priority || "medium",
        })
      )

      setGeneratedTasks(tasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  // Update a generated task
  const handleUpdateTask = useCallback(
    (id: string, updates: Partial<GeneratedTask>) => {
      setGeneratedTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
      )
    },
    []
  )

  // Delete a generated task
  const handleDeleteTask = useCallback((id: string) => {
    setGeneratedTasks((prev) => prev.filter((task) => task.id !== id))
  }, [])

  // Add a new empty task
  const handleAddTask = useCallback(() => {
    setGeneratedTasks((prev) => [
      ...prev,
      {
        id: generateId(),
        title: "",
        description: "",
        priority: "medium" as const,
      },
    ])
  }, [])

  // Create all tasks in the list
  const handleCreateAll = async () => {
    const validTasks = generatedTasks.filter((t) => t.title.trim())

    if (validTasks.length === 0) {
      setError("Please add at least one task with a title.")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      // Use bulk API for better performance
      const response = await fetch(`/api/lists/${listId}/tasks/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tasks: validTasks.map((task) => ({
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: "todo",
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create tasks")
      }

      // Success!
      onTasksCreated?.(validTasks.length)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tasks")
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-background rounded-lg shadow-2xl flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Task Generator</h2>
              <p className="text-sm text-muted-foreground">
                Generate tasks from text, files, or URLs
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={inputType === "text" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setInputType("text")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Text
            </Button>
            <Button
              variant={inputType === "file" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setInputType("file")}
            >
              <Upload className="h-4 w-4 mr-2" />
              File
            </Button>
            <Button
              variant={inputType === "url" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setInputType("url")}
            >
              <Link2 className="h-4 w-4 mr-2" />
              URL
            </Button>
          </div>

          {/* Input Area */}
          <div className="space-y-3">
            {inputType === "text" && (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your text here... Describe a project, paste meeting notes, or enter any content you want to break down into tasks."
                className="min-h-[150px] resize-none"
              />
            )}

            {inputType === "file" && (
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById("file-upload-input")?.click()}
              >
                {fileName ? (
                  <>
                    <FileText className="h-10 w-10 mx-auto text-primary mb-3" />
                    <p className="text-sm font-medium text-primary">{fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">Drop files here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports .txt, .md, .pdf, images (.png, .jpg, .jpeg, .webp)
                    </p>
                  </>
                )}
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setFileName(file.name)
                    
                    // For images, convert to base64
                    if (file.type.startsWith("image/")) {
                      const reader = new FileReader()
                      reader.onload = () => {
                        setContent(reader.result as string)
                      }
                      reader.readAsDataURL(file)
                    } else {
                      // For text files, read as text
                      const text = await file.text()
                      setContent(text)
                    }
                  }}
                />
              </div>
            )}

            {inputType === "url" && (
              <div className="space-y-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL to analyze and extract tasks from
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (!content.trim() && !url.trim())}
              size="lg"
              className="min-w-[200px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Tasks
                </>
              )}
            </Button>
          </div>

          {/* Preview Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                Generated Tasks ({generatedTasks.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddTask}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>

            {generatedTasks.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {generatedTasks.map((task) => (
                  <TaskPreviewCard
                    key={task.id}
                    task={task}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No tasks generated yet. Click &quot;Generate Tasks&quot; to create tasks from your input.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAddTask}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Button
              onClick={handleCreateAll}
              disabled={isCreating || generatedTasks.length === 0}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create All ({generatedTasks.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
