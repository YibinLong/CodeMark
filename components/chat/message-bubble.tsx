"use client"

import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"
import { UserIcon, BotIcon } from "lucide-react"
import { CodeCitation } from "./code-citation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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

      <div className="flex-1 space-y-2 min-w-0">
        {message.codeContext && <CodeCitation codeContext={message.codeContext} />}

        <div className="text-sm leading-relaxed">
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 text-[#e0e0e0]">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2 text-[#e0e0e0]">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 text-[#e0e0e0]">{children}</h3>,
                p: ({ children }) => <p className="mb-2 text-[#b4b4b4]">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-[#b4b4b4]">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-[#b4b4b4]">{children}</ol>,
                li: ({ children }) => <li className="ml-2">{children}</li>,
                code: ({ className, children, ...props }) => {
                  const isInline = !className
                  if (isInline) {
                    return (
                      <code className="bg-[#2a2a2a] text-[#e0e0e0] px-1 py-0.5 rounded text-xs font-mono" {...props}>
                        {children}
                      </code>
                    )
                  }
                  return (
                    <code className="block bg-[#1a1a1a] text-[#e0e0e0] p-3 rounded-md overflow-x-auto text-xs font-mono my-2" {...props}>
                      {children}
                    </code>
                  )
                },
                pre: ({ children }) => <pre className="bg-[#1a1a1a] rounded-md overflow-x-auto my-2">{children}</pre>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[#5B9EFF] pl-3 italic text-[#808080] my-2">
                    {children}
                  </blockquote>
                ),
                strong: ({ children }) => <strong className="font-bold text-[#e0e0e0]">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                a: ({ href, children }) => (
                  <a href={href} className="text-[#5B9EFF] hover:underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="min-w-full border-collapse border border-[#2a2a2a]">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="border border-[#2a2a2a] px-2 py-1 bg-[#1a1a1a] text-[#e0e0e0] text-left">{children}</th>,
                td: ({ children }) => <td className="border border-[#2a2a2a] px-2 py-1 text-[#b4b4b4]">{children}</td>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        <div className="text-xs text-[#808080]">{new Date(message.timestamp).toLocaleTimeString()}</div>
      </div>
    </div>
  )
}
