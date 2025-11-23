"use client"

import { BotIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TypingIndicatorProps {
  className?: string
  variant?: "default" | "compact"
}

export function TypingIndicator({ className, variant = "default" }: TypingIndicatorProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1 text-xs text-[#808080]", className)}>
        <span>AI is typing</span>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-[#4ADE80] rounded-full animate-bounce [animation-delay:0ms]" />
          <div className="w-1 h-1 bg-[#4ADE80] rounded-full animate-bounce [animation-delay:150ms]" />
          <div className="w-1 h-1 bg-[#4ADE80] rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg bg-[#0a2a1a] border border-[#1a4a2a] animate-pulse-subtle",
        className,
      )}
    >
      <div className="flex-shrink-0 mt-1">
        <BotIcon className="h-4 w-4 text-[#4ADE80]" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#b4b4b4]">AI Assistant</span>
          <div className="flex gap-1 items-center">
            <div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-bounce [animation-delay:0ms]" />
            <div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-3 bg-[#1a4a2a] rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-[#1a4a2a] rounded w-1/2 animate-pulse [animation-delay:150ms]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-subtle {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  )
}
