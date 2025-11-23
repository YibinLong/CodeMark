"use client"

import { useState, useRef, useEffect } from "react"
import { useThreadStore } from "@/lib/stores/thread-store"
import { useEditorStore } from "@/lib/stores/editor-store"
import { useUIStore } from "@/lib/stores/ui-store"
import { MessageBubble } from "./message-bubble"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendIcon, Loader2Icon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ChatInterface() {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { threads, activeThreadId, addMessage, updateMessage } = useThreadStore()
  const { language } = useEditorStore()
  const { isLoading, setIsLoading } = useUIStore()

  const activeThread = activeThreadId ? threads.get(activeThreadId) : null

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeThread?.messages])

  const handleSend = async () => {
    if (!input.trim() || !activeThread || isLoading) return

    const userMessage = input.trim()
    setInput("")

    // Add user message
    addMessage(activeThread.id, {
      role: "user",
      content: userMessage,
    })

    setIsLoading(true)

    try {
      // Add placeholder for AI response
      const tempMessageId = `temp-${Date.now()}`
      addMessage(activeThread.id, {
        role: "assistant",
        content: "",
        isStreaming: true,
      })

      // Call AI API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: activeThread.id,
          message: userMessage,
          codeContext:
            activeThread.messages[0]?.codeContext ||
            (activeThread.range
              ? {
                  code: activeThread.messages[0]?.codeContext?.code || "", // This might need fix if no messages yet
                  language: language,
                  range: activeThread.range,
                }
              : undefined),
        }),
      })

      if (!response.ok) throw new Error("Failed to get AI response")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") break

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  aiResponse += parsed.content
                  // Update the last message with streamed content
                  const messages = threads.get(activeThread.id)?.messages || []
                  const lastMessage = messages[messages.length - 1]
                  if (lastMessage) {
                    updateMessage(activeThread.id, lastMessage.id, {
                      content: aiResponse,
                      isStreaming: true,
                    })
                  }
                }
              } catch (e) {
                console.error("[v0] Error parsing chunk:", e)
              }
            }
          }
        }
      }

      // Mark streaming as complete
      const messages = threads.get(activeThread.id)?.messages || []
      const lastMessage = messages[messages.length - 1]
      if (lastMessage) {
        updateMessage(activeThread.id, lastMessage.id, {
          isStreaming: false,
        })
      }
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      addMessage(activeThread.id, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!activeThread) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-sm text-[#808080]">No thread selected</p>
          <p className="text-xs text-[#606060]">Select a thread from the list or create a new one</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {activeThread.range && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#1e1e1e]">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-[#b4b4b4]">
              Lines {activeThread.range.startLine}-{activeThread.range.endLine}
            </h3>
            <p className="text-xs text-[#606060]">
              {activeThread.messages.length} message{activeThread.messages.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 bg-[#1e1e1e]">
        <div ref={scrollRef} className="flex flex-col">
          {activeThread.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[#606060] mt-20">
              <p className="mb-2">Start a new conversation</p>
            </div>
          ) : (
            activeThread.messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-[#2a2a2a] p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question..."
            disabled={isLoading}
            className="flex-1 bg-[#1a1a1a] border-[#2a2a2a] text-[#b4b4b4] placeholder:text-[#606060]"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-[#5B9EFF] hover:bg-[#4a8eef] text-white"
          >
            {isLoading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
