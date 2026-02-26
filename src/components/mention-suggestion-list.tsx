import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { cn } from "@/lib/utils"
import { User } from "lucide-react"

export interface MentionSuggestionListProps {
  items: { id: string; name: string; email: string }[]
  command: (props: { id: string; name: string }) => void
}

interface MentionSuggestionListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const MentionSuggestionList = forwardRef<
  MentionSuggestionListHandle,
  MentionSuggestionListProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = items[index]
    if (item) {
      command({ id: item.id, name: item.name })
    }
  }

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length)
        return true
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % items.length)
        return true
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return null
  }

  return (
    <div className="bg-popover border rounded-md shadow-lg overflow-hidden z-50 min-w-[200px]">
      <div className="text-xs text-muted-foreground px-2 py-1 border-b bg-muted/50">
        Mention someone
      </div>
      <div className="max-h-[200px] overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
              index === selectedIndex && "bg-accent text-accent-foreground"
            )}
            onClick={() => selectItem(index)}
          >
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{item.name}</div>
              <div className="text-xs text-muted-foreground truncate">{item.email}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
})

MentionSuggestionList.displayName = "MentionSuggestionList"

export default MentionSuggestionList
