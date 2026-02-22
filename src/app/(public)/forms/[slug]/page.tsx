"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface FormField {
  id: string
  label: string
  type: "text" | "textarea" | "select" | "number"
  required: boolean
  options?: string[]
}

interface FormData {
  id: string
  name: string
  description: string | null
  fields: FormField[]
}

export default function PublicFormPage() {
  const params = useParams()
  const slug = params.slug as string

  const [form, setForm] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadForm() {
      try {
        const res = await fetch(`/api/forms/${slug}`)
        if (!res.ok) throw new Error("Form not found")
        const data = await res.json()
        setForm(data.form)
        // Initialize values
        const initial: Record<string, string> = {}
        ;(data.form.fields || []).forEach((f: FormField) => {
          initial[f.id] = ""
        })
        setValues(initial)
      } catch {
        setError("Form not found or no longer available")
      } finally {
        setLoading(false)
      }
    }
    loadForm()
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      })
      if (!res.ok) throw new Error("Submission failed")
      setSubmitted(true)
    } catch {
      setError("Failed to submit form. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Thank you!</h2>
            <p className="text-muted-foreground">
              Your submission has been received.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false)
                const initial: Record<string, string> = {}
                ;(form?.fields || []).forEach((f) => {
                  initial[f.id] = ""
                })
                setValues(initial)
              }}
            >
              Submit another response
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>{form?.name}</CardTitle>
          {form?.description && (
            <CardDescription>{form.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(form?.fields || []).map((field) => (
              <div key={field.id} className="grid gap-1.5">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.id}
                    value={values[field.id] || ""}
                    onChange={(e) =>
                      setValues({ ...values, [field.id]: e.target.value })
                    }
                    required={field.required}
                    rows={3}
                  />
                ) : field.type === "select" ? (
                  <select
                    id={field.id}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={values[field.id] || ""}
                    onChange={(e) =>
                      setValues({ ...values, [field.id]: e.target.value })
                    }
                    required={field.required}
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.id}
                    type={field.type === "number" ? "number" : "text"}
                    value={values[field.id] || ""}
                    onChange={(e) =>
                      setValues({ ...values, [field.id]: e.target.value })
                    }
                    required={field.required}
                  />
                )}
              </div>
            ))}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
