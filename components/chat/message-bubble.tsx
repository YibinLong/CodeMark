"use client"

import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"
import { UserIcon, BotIcon } from "lucide-react"
import { CodeCitation } from "./code-citation"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-3 px-4 py-3", isUser && "bg-[#0d0d0d]")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          isUser ? "bg-[#2a4a6a]" : "bg-[#1a3a2a]",
        )}
      >
        {isUser ? <UserIcon className="h-4 w-4 text-[#5B9EFF]" /> : <BotIcon className="h-4 w-4 text-[#4ADE80]" />}
      </div>

      <div className="flex-1 space-y-2">
        {message.codeContext && <CodeCitation codeContext={message.codeContext} />}

        <div className={cn("text-sm leading-relaxed", message.isStreaming && "animate-pulse")}>{message.content}</div>

        <div className="text-xs text-[#808080]">{new Date(message.timestamp).toLocaleTimeString()}</div>
      </div>
    </div>
  )
}
