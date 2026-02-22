"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

const shortcuts = [
  { category: "Global", items: [
    { keys: ["⌘", "K"], description: "Open search" },
    { keys: ["?"], description: "Show keyboard shortcuts" },
  ]},
  { category: "Tasks", items: [
    { keys: ["N"], description: "New task (in list view)" },
    { keys: ["⌘", "S"], description: "Save document" },
  ]},
  { category: "Navigation", items: [
    { keys: ["G", "H"], description: "Go to Home" },
    { keys: ["G", "D"], description: "Go to Docs" },
    { keys: ["G", "S"], description: "Go to Sprints" },
  ]},
]

export function KeyboardShortcuts() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === "?") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Quick actions to speed up your workflow
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {shortcuts.map((group, i) => (
            <div key={group.category}>
              {i > 0 && <Separator className="mb-4" />}
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {group.category}
              </h4>
              <div className="space-y-2">
                {group.items.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && (
                            <span className="text-xs text-muted-foreground">+</span>
                          )}
                          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
