"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import Typography from "@tiptap/extension-typography"
import { useCallback } from "react"
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Quote, List, ListOrdered, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  content: string | Record<string, unknown> | null
  onChange: (content: Record<string, unknown>) => void
  placeholder?: string
  minHeight?: string
  className?: string
  editable?: boolean
}

export function RichTextEditor({ content, onChange, placeholder, minHeight = "150px", className, editable = true }: RichTextEditorProps) {
  const handleImageUpload = useCallback(async (file: File): Promise<string | null> => {
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
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: placeholder || "Type something..." }),
      Image.configure({ inline: true, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
      Typography,
    ],
    content: typeof content === "string" ? content : (content || ""),
    editable,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[150px]",
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith("image/")) {
            handleImageUpload(file).then((url) => {
              if (url && editor) {
                editor.chain().focus().setImage({ src: url }).run()
              }
            })
            return true
          }
        }
        return false
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (items) {
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile()
              if (file) {
                handleImageUpload(file).then((url) => {
                  if (url && editor) {
                    editor.chain().focus().setImage({ src: url }).run()
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
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })

  const addImage = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const url = await handleImageUpload(file)
        if (url && editor) {
          editor.chain().focus().setImage({ src: url }).run()
        }
      }
    }
    input.click()
  }, [editor, handleImageUpload])

  if (!editor) return null

  return (
    <div className={cn("relative border rounded-md bg-background", className)}>
      {editor && editable && (
        <BubbleMenu editor={editor} >
          <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bold") && "bg-muted text-primary")}><Bold className="h-3.5 w-3.5" /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("italic") && "bg-muted text-primary")}><Italic className="h-3.5 w-3.5" /></button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("underline") && "bg-muted text-primary")}><UnderlineIcon className="h-3.5 w-3.5" /></button>
            <button onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("strike") && "bg-muted text-primary")}><Strikethrough className="h-3.5 w-3.5" /></button>
            <button onClick={() => editor.chain().focus().toggleCode().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("code") && "bg-muted text-primary")}><Code className="h-3.5 w-3.5" /></button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-xs font-bold", editor.isActive("heading", { level: 1 }) && "bg-muted text-primary")}>H1</button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("p-1.5 rounded hover:bg-muted text-xs font-bold", editor.isActive("heading", { level: 2 }) && "bg-muted text-primary")}>H2</button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("blockquote") && "bg-muted text-primary")}><Quote className="h-3.5 w-3.5" /></button>
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("bulletList") && "bg-muted text-primary")}><List className="h-3.5 w-3.5" /></button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1.5 rounded hover:bg-muted", editor.isActive("orderedList") && "bg-muted text-primary")}><ListOrdered className="h-3.5 w-3.5" /></button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button onClick={addImage} className="p-1.5 rounded hover:bg-muted"><ImageIcon className="h-3.5 w-3.5" /></button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
