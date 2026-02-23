"use client"

import { useCallback, useRef, useState } from "react"
import MDEditor from "@uiw/react-md-editor"
import { Image as ImageIcon, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  minHeight = "150px",
  className,
}: MarkdownEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleImageUpload = useCallback(async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      // Insert markdown image syntax
      const imageMarkdown = `![${file.name}](${data.url})`
      
      // Append the image markdown to current value
      const newValue = value + "\n" + imageMarkdown
      onChange(newValue)
      
      return data.url
    } catch (error) {
      console.error("Error uploading image:", error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [value, onChange])

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    await handleImageUpload(file)
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [handleImageUpload])

  const height = parseInt(minHeight) || 150

  return (
    <div data-color-mode="dark" className={className}>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        onBlur={onBlur}
        preview="edit"
        height={height}
        enableScroll={true}
      />
      {/* Image upload button below editor */}
      <div className="flex items-center gap-2 mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleFileSelect}
          disabled={isUploading}
        >
          {isUploading ? (
            <Upload className="h-3.5 w-3.5 animate-pulse" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" />
          )}
          {isUploading ? "Uploading..." : "Add Image"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
