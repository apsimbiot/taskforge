"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Rocket,
  Zap,
  Star,
  Heart,
  Globe,
  Code,
  BookOpen,
  Briefcase,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SPACE_COLORS = [
  "#3b82f6", "#22c55e", "#a855f7", "#f97316",
  "#ef4444", "#eab308", "#06b6d4", "#ec4899",
  "#14b8a6", "#8b5cf6", "#f43f5e", "#84cc16",
]

interface SpaceIcon {
  name: string
  icon: LucideIcon
}

const SPACE_ICONS: SpaceIcon[] = [
  { name: "rocket", icon: Rocket },
  { name: "zap", icon: Zap },
  { name: "star", icon: Star },
  { name: "heart", icon: Heart },
  { name: "globe", icon: Globe },
  { name: "code", icon: Code },
  { name: "book", icon: BookOpen },
  { name: "briefcase", icon: Briefcase },
]

export interface CreateSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; color: string; icon: string }) => void
  workspaceId: string
}

export function CreateSpaceDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateSpaceDialogProps) {
  const [name, setName] = useState("")
  const [color, setColor] = useState(SPACE_COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState("rocket")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      onSubmit({ name: name.trim(), color, icon: selectedIcon })
      setName("")
      setColor(SPACE_COLORS[0])
      setSelectedIcon("rocket")
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }, [name, color, selectedIcon, onSubmit, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Space</DialogTitle>
          <DialogDescription>
            Spaces help organize your work within a workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              placeholder="Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {SPACE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-md border-2 transition-all duration-150 hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "white" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label>Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {SPACE_ICONS.map(({ name: iconName, icon: Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setSelectedIcon(iconName)}
                  className={cn(
                    "w-9 h-9 rounded-md border flex items-center justify-center transition-all duration-150 hover:bg-accent",
                    selectedIcon === iconName
                      ? "border-primary bg-accent"
                      : "border-border"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Space"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
