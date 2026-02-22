export default function ListLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <div className="h-4 w-48 bg-muted rounded animate-pulse mb-3" />
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex-1 p-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 border-b border-border/50"
          >
            <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
            <div className="w-16 h-5 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
