"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import Typography from "@tiptap/extension-typography"
import Mention from "@tiptap/extension-mention"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableHeader from "@tiptap/extension-table-header"
import TableCell from "@tiptap/extension-table-cell"
import { useCallback, useRef } from "react"
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Quote, List, ListOrdered, Image as ImageIcon, Link as LinkIcon, Table as TableIcon, Heading1, Heading2, Heading3, Undo, Redo } from "lucide-react"
import { cn } from "@/lib/utils"
import suggestion from "./mention-suggestion"

interface RichTextEditorProps {
  content: string | Record<string, unknown> | null
  onChange: (content: Record<string, unknown>) => void
  placeholder?: string
  minHeight?: string
  className?: string
  editable?: boolean
  mentions?: { id: string; name: string; email: string }[]
  showToolbar?: boolean
}

async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData()
  formData.append("file", file)
  try {
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) throw new Error("Upload failed")
    const data = await res.json()
    return data.url
  } catch (e) {
    console.error("Image upload failed:", e)
    return null
  }
}

export function RichTextEditor({ content, onChange, placeholder, minHeight = "150px", className, editable = true, mentions, showToolbar = false }: RichTextEditorProps) {
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  // Build extensions array
  const extensions: any[] = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Placeholder.configure({ placeholder: placeholder || "Type something..." }),
    Image.configure({ inline: false, allowBase64: false }),
    Link.configure({ openOnClick: false, autolink: true }),
    Underline,
    Typography,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
  ]

  // Always add Mention extension (works with empty array too)
  extensions.push(
    Mention.configure({
      HTMLAttributes: {
        class: "mention",
      },
      suggestion: {
        char: "@",
        ...suggestion(mentions || []),
      },
    })
  )

  const editor = useEditor({
    extensions,
    content: typeof content === "string" ? content : (content || ""),
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none focus:outline-none p-3",
        style: `min-height: ${minHeight}`,
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith("image/")) {
            event.preventDefault()
            uploadImage(file).then((url) => {
              if (url && editorRef.current) {
                editorRef.current.chain().focus().setImage({ src: url }).run()
              }
            })
            return true
          }
        }
        return false
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items
        if (items) {
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile()
              if (file) {
                event.preventDefault()
                uploadImage(file).then((url) => {
                  if (url && editorRef.current) {
                    editorRef.current.chain().focus().setImage({ src: url }).run()
                  }
                })
                return true
              }
            }
          }
        }
        return false
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getJSON())
    },
  })

  // Keep ref in sync
  editorRef.current = editor

  const addImage = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const url = await uploadImage(file)
        if (url && editorRef.current) {
          editorRef.current.chain().focus().setImage({ src: url }).run()
        }
      }
    }
    input.click()
  }, [])

  const addLink = useCallback(() => {
    const url = window.prompt("Enter URL")
    if (url && editorRef.current) {
      editorRef.current.chain().focus().setLink({ href: url }).run()
    }
  }, [])

  const insertTable = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }
  }, [])

  if (!editor) return null

  // Toolbar component
  const Toolbar = () => (
    <div className="flex items-center gap-0.5 flex-wrap border-b p-2 bg-muted/30 rounded-t-md">
      <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 rounded hover:bg-muted disabled:opacity-50"><Undo className="h-4 w-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 rounded hover:bg-muted disabled:opacity-50"><Redo className="h-4 w-4" /></button>
      <div className="w-px h-6 bg-border mx-1" />
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bold") && "bg-muted text-primary")}><Bold className="h-4 w-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("italic") && "bg-muted text-primary")}><Italic className="h-4 w-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("underline") && "bg-muted text-primary")}><UnderlineIcon className="h-4 w-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("strike") && "bg-muted text-primary")}><Strikethrough className="h-4 w-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("code") && "bg-muted text-primary")}><Code className="h-4 w-4" /></button>
      <div className="w-px h-6 bg-border mx-1" />
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-sm font-bold", editor.isActive("heading", { level: 1 }) && "bg-muted text-primary")}><Heading1 className="h-4 w-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-sm font-bold", editor.isActive("heading", { level: 2 }) && "bg-muted text-primary")}><Heading2 className="h-4 w-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-sm font-bold", editor.isActive("heading", { level: 3 }) && "bg-muted text-primary")}><Heading3 className="h-4 w-4" /></button>
      <div className="w-px h-6 bg-border mx-1" />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bulletList") && "bg-muted text-primary")}><List className="h-4 w-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("orderedList") && "bg-muted text-primary")}><ListOrdered className="h-4 w-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("blockquote") && "bg-muted text-primary")}><Quote className="h-4 w-4" /></button>
      <div className="w-px h-6 bg-border mx-1" />
      <button type="button" onClick={addLink} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("link") && "bg-muted text-primary")}><LinkIcon className="h-4 w-4" /></button>
      <button type="button" onClick={addImage} className="p-1.5 rounded hover:bg-muted"><ImageIcon className="h-4 w-4" /></button>
      <button type="button" onClick={insertTable} className="p-1.5 rounded hover:bg-muted"><TableIcon className="h-4 w-4" /></button>
    </div>
  )

  if (!editor) return null

  return (
    <div className={cn("relative border rounded-md bg-background", className)}>
      {showToolbar && editable && <Toolbar />}
      {editor && editable && (
        <BubbleMenu editor={editor}>
          <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bold") && "bg-muted text-primary")}><Bold className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("italic") && "bg-muted text-primary")}><Italic className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("underline") && "bg-muted text-primary")}><UnderlineIcon className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("strike") && "bg-muted text-primary")}><Strikethrough className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("code") && "bg-muted text-primary")}><Code className="h-3.5 w-3.5" /></button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-xs font-bold", editor.isActive("heading", { level: 1 }) && "bg-muted text-primary")}>H1</button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-xs font-bold", editor.isActive("heading", { level: 2 }) && "bg-muted text-primary")}>H2</button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("blockquote") && "bg-muted text-primary")}><Quote className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bulletList") && "bg-muted text-primary")}><List className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("orderedList") && "bg-muted text-primary")}><ListOrdered className="h-3.5 w-3.5" /></button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button type="button" onClick={addImage} className="p-1.5 rounded hover:bg-muted"><ImageIcon className="h-3.5 w-3.5" /></button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
