"use client"

import { memo } from "react"
import { MessageSquareIcon, CheckCircleIcon, TrashIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useIntersectionObserver } from "@/lib/hooks/use-intersection-observer"
import type { Thread } from "@/lib/types"

export interface ThreadListItemProps {
  thread: Thread
  isActive: boolean
  onSelect: () => void
  onResolve: () => void
  onUnresolve: () => void
  onDelete: () => void
  enableLazyLoad?: boolean
}

function ThreadListItemComponent({
  thread,
  isActive,
  onSelect,
  onResolve,
  onUnresolve,
  onDelete,
  enableLazyLoad = true,
}: ThreadListItemProps) {
  const [ref, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "100px", // Load items 100px before they enter viewport
  })

  // Don't render content if lazy loading is enabled and item is not intersecting
  const shouldRender = !enableLazyLoad || isIntersecting

  const threadLabel = `Thread on ${
    thread.range ? `lines ${thread.range.startLine} to ${thread.range.endLine}` : "general chat"
  }, ${thread.status}, ${thread.messages.length} messages`

  return (
    <div ref={ref} className="min-h-[100px]" role="listitem">
      {shouldRender ? (
        <button
          onClick={onSelect}
          className={cn(
            "flex w-full flex-col gap-2 border-b border-[#2a2a2a] p-4 text-left transition-colors",
            "hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#5B9EFF] focus:ring-inset",
            isActive && "bg-[#1a1a1a] border-l-2 border-l-[#5B9EFF]",
          )}
          aria-label={threadLabel}
          aria-current={isActive ? "true" : undefined}
          tabIndex={0}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquareIcon className="h-4 w-4 text-[#5B9EFF]" />
              <span className="text-xs text-[#808080]">
                {thread.range ? `Lines ${thread.range.startLine}-${thread.range.endLine}` : "General Chat"}
              </span>
              {thread.status === "resolved" && (
                <Badge variant="secondary" className="h-4 text-[10px] bg-[#4ADE80]/10 text-[#4ADE80] border-0">
                  Resolved
                </Badge>
              )}
            </div>

            <div className="flex gap-1" onClick={(e) => e.stopPropagation()} role="group" aria-label="Thread actions">
              {thread.status === "resolved" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
                  onClick={onUnresolve}
                  title="Unresolve thread"
                  aria-label="Unresolve thread"
                  tabIndex={0}
                >
                  <CheckCircleIcon className="h-4 w-4 text-[#4ADE80] hover:text-[#808080]" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
                  onClick={onResolve}
                  title="Resolve thread"
                  aria-label="Resolve thread"
                  tabIndex={0}
                >
                  <CheckCircleIcon className="h-3 w-3 text-[#808080] hover:text-[#4ADE80]" aria-hidden="true" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 focus:outline-none focus:ring-2 focus:ring-red-500"
                onClick={onDelete}
                title="Delete thread"
                aria-label="Delete thread"
                tabIndex={0}
              >
                <TrashIcon className="h-3 w-3 text-[#808080] hover:text-red-500" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <p className="line-clamp-2 text-sm text-[#b4b4b4]">{thread.messages[0]?.content || "No messages"}</p>

          <span className="text-xs text-[#606060]">
            {thread.messages.length} message{thread.messages.length !== 1 ? "s" : ""}
          </span>
        </button>
      ) : (
        // Placeholder when not in viewport
        <div className="h-[100px] bg-[#0d0d0d]" />
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const ThreadListItem = memo(ThreadListItemComponent, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.thread.id === nextProps.thread.id &&
    prevProps.thread.updatedAt === nextProps.thread.updatedAt &&
    prevProps.thread.status === nextProps.thread.status &&
    prevProps.thread.messages.length === nextProps.thread.messages.length &&
    prevProps.isActive === nextProps.isActive
  )
})

ThreadListItem.displayName = "ThreadListItem"
