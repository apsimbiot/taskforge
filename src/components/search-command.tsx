"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, FileText, CheckSquare, Loader2 } from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"

interface SearchResult {
  id: string
  title: string
  type: "task" | "doc"
  url: string
}

export function SearchCommand() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  // Keyboard shortcut: Cmd+K / Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Debounced search
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
        }
      } catch (err) {
        console.error("Search error:", err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (url: string) => {
    setOpen(false)
    setQuery("")
    router.push(url)
  }

  const taskResults = results.filter((r) => r.type === "task")
  const docResults = results.filter((r) => r.type === "doc")

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md transition-colors w-full"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search tasks and docs..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {taskResults.length > 0 && (
            <CommandGroup heading="Tasks">
              {taskResults.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result.url)}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  <span>{result.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {taskResults.length > 0 && docResults.length > 0 && (
            <CommandSeparator />
          )}

          {docResults.length > 0 && (
            <CommandGroup heading="Docs">
              {docResults.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result.url)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{result.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!query && !loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type to search tasks and docs...
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
