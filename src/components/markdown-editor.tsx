"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MarkdownRenderer } from "./markdown-renderer"
import {
  Bold,
  Italic,
  Code,
  Link,
  List,
  ListOrdered,
  Eye,
  Edit3,
  Heading2,
  Quote,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  minHeight?: string
  className?: string
}

export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Write something...",
  minHeight = "150px",
  className,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertMarkdown = useCallback(
    (before: string, after: string = "", placeholder: string = "") => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = value.substring(start, end) || placeholder

      const newText =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end)

      onChange(newText)

      // Reset cursor position after the inserted text
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = start + before.length + selectedText.length + after.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    },
    [value, onChange]
  )

  const handleBold = () => insertMarkdown("**", "**", "bold text")
  const handleItalic = () => insertMarkdown("*", "*", "italic text")
  const handleCode = () => insertMarkdown("`", "`", "code")
  const handleCodeBlock = () => insertMarkdown("\n```\n", "\n```\n", "code block")
  const handleLink = () => insertMarkdown("[", "](url)", "link text")
  const handleList = () => insertMarkdown("\n- ", "", "list item")
  const handleOrderedList = () => insertMarkdown("\n1. ", "", "list item")
  const handleHeading = () => insertMarkdown("\n## ", "", "heading")
  const handleQuote = () => insertMarkdown("\n> ", "", "quote")

  const toolbarButtons = [
    { icon: Bold, action: handleBold, title: "Bold (Ctrl+B)" },
    { icon: Italic, action: handleItalic, title: "Italic (Ctrl+I)" },
    { icon: Code, action: handleCode, title: "Inline Code" },
    { icon: Heading2, action: handleHeading, title: "Heading" },
    { icon: List, action: handleList, title: "Bullet List" },
    { icon: ListOrdered, action: handleOrderedList, title: "Numbered List" },
    { icon: Link, action: handleLink, title: "Link" },
    { icon: Quote, action: handleQuote, title: "Quote" },
  ]

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-2 py-1">
        <div className="flex items-center gap-0.5">
          {toolbarButtons.map((btn, idx) => (
            <Button
              key={idx}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={btn.action}
              title={btn.title}
            >
              <btn.icon className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
        <Tabs
          value={showPreview ? "preview" : "edit"}
          onValueChange={(v) => setShowPreview(v === "preview")}
          className="h-7"
        >
          <TabsList className="h-6 bg-transparent">
            <TabsTrigger
              value="edit"
              className="h-6 px-2 text-xs gap-1 data-[state=active]:bg-background"
            >
              <Edit3 className="h-3 w-3" />
              Edit
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="h-6 px-2 text-xs gap-1 data-[state=active]:bg-background"
            >
              <Eye className="h-3 w-3" />
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div
          className="p-3 overflow-auto"
          style={{ minHeight }}
        >
          <MarkdownRenderer content={value} />
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="border-0 resize-none focus-visible:ring-0 text-sm"
          style={{ minHeight }}
        />
      )}
    </div>
  )
}
