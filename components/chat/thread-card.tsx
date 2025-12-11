"use client"

import { useState, memo, useCallback, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  MessageSquareIcon,
  CheckCircleIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  BotIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TypingIndicator } from "./typing-indicator"
import type { Thread, Message } from "@/lib/types"

export interface ThreadCardProps {
  thread: Thread
  isActive: boolean
  onSelect: () => void
  onResolve: () => void
  onUnresolve: () => void
  onDelete: () => void
  className?: string
}

function ThreadCardComponent({
  thread,
  isActive,
  onSelect,
  onResolve,
  onUnresolve,
  onDelete,
  className,
}: ThreadCardProps) {
  const [isExpanded, setIsExpanded] = useState(isActive)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Memoize handlers
  const handleDelete = useCallback(() => {
    setShowDeleteDialog(true)
  }, [])

  const confirmDelete = useCallback(() => {
    onDelete()
    setShowDeleteDialog(false)
  }, [onDelete])

  // Memoize expensive computations
  const formatTimestamp = useCallback((date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return "recently"
    }
  }, [])

  const getMessageIcon = useCallback((role: Message["role"]) => {
    return role === "user" ? (
      <UserIcon className="h-4 w-4 text-[#5B9EFF]" />
    ) : (
      <BotIcon className="h-4 w-4 text-[#4ADE80]" />
    )
  }, [])

  return (
    <>
      <Card
        className={cn(
          "border-[#2a2a2a] bg-[#0d0d0d] transition-all",
          isActive && "border-l-2 border-l-[#5B9EFF]",
          className,
        )}
        role="article"
        aria-label={`Thread on ${
          thread.range ? `lines ${thread.range.startLine} to ${thread.range.endLine}` : "general chat"
        }`}
      >
        <CardHeader className="p-0">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div
              className={cn(
                "flex items-start justify-between gap-2 p-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors",
                isActive && "bg-[#1a1a1a]",
              )}
              onClick={onSelect}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 hover:bg-[#2a2a2a]"
                    aria-label={isExpanded ? "Collapse thread" : "Expand thread"}
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className="h-4 w-4 text-[#808080]" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-[#808080]" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquareIcon className="h-4 w-4 text-[#5B9EFF] flex-shrink-0" />
                    <span className="text-xs text-[#808080]">
                      {thread.range
                        ? `Lines ${thread.range.startLine}-${thread.range.endLine}`
                        : "General Chat"}
                    </span>
                    {thread.status === "resolved" && (
                      <Badge variant="secondary" className="h-4 text-[10px] bg-[#4ADE80]/10 text-[#4ADE80] border-0">
                        Resolved
                      </Badge>
                    )}
                  </div>

                  <p className="line-clamp-2 text-sm text-[#b4b4b4] mb-1">
                    {thread.messages[0]?.content || "No messages"}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-[#606060]">
                    <span>
                      {thread.messages.length} message{thread.messages.length !== 1 ? "s" : ""}
                    </span>
                    <span>•</span>
                    <span>{formatTimestamp(thread.updatedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()} role="group" aria-label="Thread actions">
                {thread.status === "resolved" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
                    onClick={onUnresolve}
                    title="Unresolve thread"
                    aria-label="Unresolve thread"
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
                  >
                    <CheckCircleIcon className="h-3 w-3 text-[#808080] hover:text-[#4ADE80]" aria-hidden="true" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 focus:outline-none focus:ring-2 focus:ring-red-500"
                  onClick={handleDelete}
                  title="Delete thread"
                  aria-label="Delete thread"
                >
                  <TrashIcon className="h-3 w-3 text-[#808080] hover:text-red-500" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <CollapsibleContent>
              <CardContent className="p-4 pt-0 space-y-3" role="list" aria-label="Thread messages">
                {thread.messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 p-3 rounded-lg",
                      message.role === "user" ? "bg-[#1a1a1a]" : "bg-[#0a2a1a]",
                    )}
                    role="listitem"
                    aria-label={`Message from ${message.role === "user" ? "you" : "AI assistant"}, ${formatTimestamp(message.timestamp)}`}
                  >
                    <div className="flex-shrink-0 mt-1">{getMessageIcon(message.role)}</div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#b4b4b4]">
                          {message.role === "user" ? "You" : "AI Assistant"}
                        </span>
                        <span className="text-xs text-[#606060]">{formatTimestamp(message.timestamp)}</span>
                        {message.isStreaming && (
                          <Badge variant="secondary" className="h-4 text-[10px] bg-[#5B9EFF]/10 text-[#5B9EFF] border-0">
                            Streaming...
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-[#d4d4d4] whitespace-pre-wrap break-words">{message.content}</p>

                      {message.codeContext && (
                        <div className="mt-2 p-2 bg-[#0d0d0d] rounded border border-[#2a2a2a]">
                          <div className="text-xs text-[#808080] mb-1">
                            Code Context ({message.codeContext.language})
                            {message.codeContext.range &&
                              ` - Lines ${message.codeContext.range.startLine}-${message.codeContext.range.endLine}`}
                          </div>
                          <pre className="text-xs text-[#b4b4b4] overflow-x-auto">
                            <code>{message.codeContext.code}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Show typing indicator if last message is streaming */}
                {thread.messages.length > 0 &&
                  thread.messages[thread.messages.length - 1]?.isStreaming &&
                  thread.messages[thread.messages.length - 1]?.role === "assistant" && <TypingIndicator />}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1a1a1a] border-[#2a2a2a]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#e4e4e4]">Delete Thread?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#808080]">
              This action cannot be undone. This thread and all its messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2a2a2a] text-[#e4e4e4] hover:bg-[#3a3a3a] border-[#3a3a3a]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Memoize ThreadCard component to prevent unnecessary re-renders
// Performance optimization: Only re-render when thread data or state changes
export const ThreadCard = memo(ThreadCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.thread.id === nextProps.thread.id &&
    prevProps.thread.updatedAt === nextProps.thread.updatedAt &&
    prevProps.thread.status === nextProps.thread.status &&
    prevProps.thread.messages.length === nextProps.thread.messages.length &&
    prevProps.isActive === nextProps.isActive
  )
})
ThreadCard.displayName = "ThreadCard"
