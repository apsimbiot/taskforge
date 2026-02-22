"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  CommandDialog, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem,
  CommandSeparator 
} from "@/components/ui/command"
import { Search, FileText, CheckSquare } from "lucide-react"

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

  // Keyboard shortcut
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
        const data = await res.json()
        setResults(data.results || [])
      } catch (err) {
        console.error("Search error:", err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    router.push(result.url)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md transition-colors w-full"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search tasks and docs..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}
          
          {!loading && query && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {results.length > 0 && (
            <>
              <CommandGroup heading="Tasks">
                {results
                  .filter((r) => r.type === "task")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      <span>{result.title}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Docs">
                {results
                  .filter((r) => r.type === "doc")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>{result.title}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          )}

          {!query && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Start typing to search...
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
