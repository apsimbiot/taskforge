"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ClipboardList,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"

interface FormField {
  id: string
  label: string
  type: "text" | "textarea" | "select" | "number"
  required: boolean
  options?: string[]
}

interface FormResponse {
  id: string
  workspaceId: string
  listId: string | null
  name: string
  description: string | null
  fields: FormField[]
  isPublic: boolean
  slug: string
  createdAt: string
}

export default function FormsPage() {
  const params = useParams()
  const workspaceId = params.id as string
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [fields, setFields] = useState<FormField[]>([
    { id: "1", label: "Title", type: "text", required: true },
    { id: "2", label: "Description", type: "textarea", required: false },
  ])

  const { data, isLoading } = useQuery<{ forms: FormResponse[] }>({
    queryKey: ["forms", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/forms`)
      return res.json()
    },
    enabled: !!workspaceId,
  })

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string
      description: string
      fields: FormField[]
    }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", workspaceId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (formId: string) => {
      await fetch(`/api/forms/${formId}`, { method: "DELETE" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", workspaceId] })
    },
  })

  const forms = data?.forms || []

  const handleCreate = () => {
    createMutation.mutate({
      name: formName,
      description: formDescription,
      fields,
    })
    setCreateOpen(false)
    setFormName("")
    setFormDescription("")
    setFields([
      { id: "1", label: "Title", type: "text", required: true },
      { id: "2", label: "Description", type: "textarea", required: false },
    ])
  }

  const handleDelete = (formId: string) => {
    if (confirm("Delete this form?")) {
      deleteMutation.mutate(formId)
    }
  }

  const addField = () => {
    setFields([
      ...fields,
      {
        id: String(Date.now()),
        label: "",
        type: "text",
        required: false,
      },
    ])
  }

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id))
  }

  const copyPublicUrl = (slug: string) => {
    const url = `${window.location.origin}/forms/${slug}`
    navigator.clipboard.writeText(url)
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
            <ClipboardList className="h-6 w-6" />
            Forms
          </h1>
          <p className="text-muted-foreground">
            Create public forms to collect tasks from anyone
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create Form</DialogTitle>
              <DialogDescription>
                Create a public form that creates tasks when submitted
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="form-name">Form Name</Label>
                <Input
                  id="form-name"
                  placeholder="Bug Report"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="form-desc">Description</Label>
                <Input
                  id="form-desc"
                  placeholder="Submit a bug report"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fields</Label>
                  <Button variant="outline" size="sm" onClick={addField}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Field
                  </Button>
                </div>
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 p-2 border rounded-md"
                  >
                    <Input
                      placeholder="Field label"
                      value={field.label}
                      onChange={(e) =>
                        updateField(field.id, { label: e.target.value })
                      }
                      className="flex-1"
                    />
                    <select
                      className="h-9 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                      value={field.type}
                      onChange={(e) =>
                        updateField(field.id, {
                          type: e.target.value as FormField["type"],
                        })
                      }
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="number">Number</option>
                      <option value="select">Select</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateField(field.id, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeField(field.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {forms.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create a form to collect tasks from anyone with a public link
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{form.name}</CardTitle>
                    {form.description && (
                      <CardDescription className="text-xs mt-1">
                        {form.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant={form.isPublic ? "default" : "secondary"}>
                    <Globe className="h-3 w-3 mr-1" />
                    {form.isPublic ? "Public" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3">
                  {(form.fields as FormField[])?.length || 0} fields
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => copyPublicUrl(form.slug)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`/forms/${form.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(form.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
