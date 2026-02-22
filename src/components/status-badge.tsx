import { Badge } from "@/components/ui/badge"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        todo: "bg-status-gray/20 text-status-gray border border-status-gray/30",
        in_progress: "bg-status-blue/20 text-status-blue border border-status-blue/30",
        review: "bg-status-yellow/20 text-status-yellow border border-status-yellow/30",
        done: "bg-status-green/20 text-status-green border border-status-green/30",
      },
      priority: {
        low: "bg-status-gray/20 text-status-gray border border-status-gray/30",
        medium: "bg-status-blue/20 text-status-blue border border-status-blue/30",
        high: "bg-status-orange/20 text-status-orange border border-status-orange/30",
        urgent: "bg-status-red/20 text-status-red border border-status-red/30",
      },
    },
    defaultVariants: {
      status: "todo",
      priority: "low",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  variant?: "status" | "priority"
}

const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
}

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

function StatusBadge({ 
  className, 
  variant = "status", 
  status, 
  priority, 
  ...props 
}: StatusBadgeProps) {
  const label = variant === "status" 
    ? (status ? statusLabels[status] : "") 
    : (priority ? priorityLabels[priority] : "")
  
  const badgeClasses = variant === "status"
    ? statusBadgeVariants({ status: status as "todo" | "in_progress" | "review" | "done" })
    : statusBadgeVariants({ priority: priority as "low" | "medium" | "high" | "urgent" })
  
  return (
    <Badge
      className={cn(badgeClasses, className)}
      {...props}
    >
      {label}
    </Badge>
  )
}

export { StatusBadge, statusBadgeVariants }
