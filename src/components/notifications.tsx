"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react"
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/useQueries"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

export function Notifications() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  
  const { data: notificationsData, isLoading } = useNotifications()
  const markReadMutation = useMarkNotificationRead()
  const markAllReadMutation = useMarkAllNotificationsRead()

  const notifications = notificationsData?.notifications ?? []
  const unreadCount = notificationsData?.unreadCount ?? 0

  const handleNotificationClick = (notification: {
    id: string
    read: boolean
    entityType?: string | null
    entityId?: string | null
    title: string
  }) => {
    // Mark as read if not already
    if (!notification.read) {
      markReadMutation.mutate(notification.id)
    }

    // Navigate if there's an entity
    if (notification.entityType && notification.entityId) {
      if (notification.entityType === "task") {
        router.push(`/dashboard/tasks/${notification.entityId}`)
      }
      // Add other entity types as needed
    }

    setIsOpen(false)
  }

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate()
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="mr-1 h-3 w-3" />
                  Mark all read
                </Button>
              )}
            </div>

            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                        !notification.read && "bg-accent/30"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={cn(
                        "mt-0.5 h-2 w-2 rounded-full flex-shrink-0",
                        notification.read ? "bg-transparent" : "bg-primary"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm",
                          !notification.read && "font-medium"
                        )}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {notification.entityType && notification.entityId && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  )
}
