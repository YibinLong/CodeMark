"use client"

import { useThreadStore } from "@/lib/stores/thread-store"
import { useEditorStore } from "@/lib/stores/editor-store"
import { MessageSquareIcon, CheckCircleIcon, TrashIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function ThreadList() {
  const { threads, activeThreadId, setActiveThread, resolveThread, deleteThread } = useThreadStore()
  const { activeFileId } = useEditorStore()

  const fileThreads = Array.from(threads.values())
    .filter((thread) => thread.fileId === activeFileId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  if (fileThreads.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <MessageSquareIcon className="mx-auto h-12 w-12 text-[#4a4a4a]" />
          <p className="text-sm text-[#808080]">No threads yet</p>
          <p className="text-xs text-[#606060]">Select code and right-click to start a review</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm font-medium text-[#b4b4b4]">THREADS ({fileThreads.length})</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {fileThreads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => setActiveThread(thread.id)}
            className={cn(
              "flex w-full flex-col gap-2 border-b border-[#2a2a2a] p-4 text-left transition-colors",
              "hover:bg-[#1a1a1a]",
              activeThreadId === thread.id && "bg-[#1a1a1a] border-l-2 border-l-[#5B9EFF]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquareIcon className="h-4 w-4 text-[#5B9EFF]" />
                <span className="text-xs text-[#808080]">
                  {thread.range ? `Lines ${thread.range.startLine}-${thread.range.endLine}` : "General Chat"}
                </span>
              </div>

              <div className="flex gap-1">
                {thread.status === "resolved" ? (
                  <CheckCircleIcon className="h-4 w-4 text-[#4ADE80]" />
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      resolveThread(thread.id)
                    }}
                  >
                    <CheckCircleIcon className="h-3 w-3 text-[#808080] hover:text-[#4ADE80]" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteThread(thread.id)
                  }}
                >
                  <TrashIcon className="h-3 w-3 text-[#808080] hover:text-red-500" />
                </Button>
              </div>
            </div>

            <p className="line-clamp-2 text-sm text-[#b4b4b4]">{thread.messages[0]?.content || "No messages"}</p>

            <span className="text-xs text-[#606060]">
              {thread.messages.length} message{thread.messages.length !== 1 ? "s" : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
