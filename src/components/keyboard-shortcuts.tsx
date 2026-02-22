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
import { useTaskPanel } from "@/store/useTaskPanel"

const shortcuts = [
  { category: "Global", items: [
    { keys: ["⌘", "K"], description: "Open search" },
    { keys: ["?"], description: "Show keyboard shortcuts" },
    { keys: ["Esc"], description: "Close panel / dialog" },
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
  const taskPanel = useTaskPanel()

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable

      // Escape — close any open panel/dialog (always works, even in inputs)
      if (e.key === "Escape") {
        // Close shortcuts dialog first
        if (open) {
          e.preventDefault()
          setOpen(false)
          return
        }
        // Close task detail panel
        if (taskPanel.isOpen) {
          e.preventDefault()
          taskPanel.close()
          return
        }
        return
      }

      // Skip remaining shortcuts when in an input
      if (isInput) return

      // ? — toggle keyboard shortcuts dialog
      if (e.key === "?") {
        e.preventDefault()
        setOpen((prev) => !prev)
        return
      }

      // N — focus the "new task" input in the current list view
      if (e.key === "n" || e.key === "N") {
        e.preventDefault()
        // Look for the quick-add input in the kanban or list view
        const addBtn = document.querySelector<HTMLButtonElement>(
          '[data-new-task-trigger]'
        )
        if (addBtn) {
          addBtn.click()
          return
        }
        // Fallback: look for any "Add task" button in the current view
        const addBtns = document.querySelectorAll("button")
        for (const btn of addBtns) {
          if (btn.textContent?.trim().toLowerCase().includes("add task")) {
            btn.click()
            return
          }
        }
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, taskPanel])

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
