"use client"

import { ChatInterface } from "../chat/chat-interface"
import { useThreadStore } from "@/lib/stores/thread-store"
import { PlusIcon, ClockIcon, MoreHorizontalIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export function ChatPanel() {
  const { openThreadIds, threads, activeThreadId, setActiveThread, createChat, closeThread } = useThreadStore()

  return (
    <div className="flex h-full flex-col bg-[#0d0d0d] border-l border-[#2a2a2a]">
      <div className="flex items-center border-b border-[#2a2a2a] bg-[#0d0d0d] pt-1 px-1">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex items-center gap-1 pb-1">
            {openThreadIds.map((threadId) => {
              const thread = threads.get(threadId)
              if (!thread) return null
              const isActive = threadId === activeThreadId

              return (
                <div
                  key={threadId}
                  className={cn(
                    "group flex items-center gap-2 rounded-t-md px-3 py-2 text-sm cursor-pointer border-t border-x border-transparent select-none max-w-[150px]",
                    isActive
                      ? "bg-[#1e1e1e] border-[#2a2a2a] text-[#e0e0e0]"
                      : "text-[#808080] hover:bg-[#1a1a1a] hover:text-[#b4b4b4]",
                  )}
                  onClick={() => setActiveThread(threadId)}
                >
                  <span className="truncate">{thread.title || "New Chat"}</span>
                  <button
                    className={cn(
                      "opacity-0 group-hover:opacity-100 hover:text-white transition-opacity",
                      isActive && "opacity-100",
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      closeThread(threadId)
                    }}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>

        <div className="flex items-center pl-2 shrink-0 border-l border-[#2a2a2a] py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#808080] hover:text-white"
            onClick={() => createChat()}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#808080] hover:text-white">
            <ClockIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#808080] hover:text-white">
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
        {activeThreadId ? (
          <ChatInterface />
        ) : (
          <div className="flex h-full items-center justify-center text-[#606060]">
            <div className="text-center">
              <p>No chat open</p>
              <Button variant="link" className="text-[#5B9EFF]" onClick={() => createChat()}>
                Start a new chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
