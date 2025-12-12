"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useThreadStore } from "@/lib/stores/thread-store"
import { useEditorStore } from "@/lib/stores/editor-store"
import { useUIStore } from "@/lib/stores/ui-store"
import { MessageBubble } from "./message-bubble"
import { CodeCitation } from "./code-citation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SendIcon, Loader2Icon } from "lucide-react"

export function ChatInterface() {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  // Track threads that have already had their input pre-filled
  const prefilledThreads = useRef<Set<string>>(new Set())

  const { threads, activeThreadId, addMessage, updateMessage, clearPendingCodeContext } = useThreadStore()
  const { language } = useEditorStore()
  const { isLoading, setIsLoading } = useUIStore()

  const activeThread = activeThreadId ? threads.get(activeThreadId) : null

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeThread?.messages])

  // Pre-fill input when thread has pending code context
  useEffect(() => {
    if (!activeThread) return
    if (prefilledThreads.current.has(activeThread.id)) return

    if (activeThread.pendingCodeContext?.defaultPrompt) {
      setInput(activeThread.pendingCodeContext.defaultPrompt)
      prefilledThreads.current.add(activeThread.id)
    }
  }, [activeThread?.id, activeThread?.pendingCodeContext])

  // Core function to send a message to the AI API
  const sendToAI = useCallback(async (threadId: string, message: string, codeContext?: { code: string; language: string; range?: { startLine: number; endLine: number; startColumn: number; endColumn: number } }) => {
    // Use getState() for latest state instead of closure
    const currentThreads = useThreadStore.getState().threads
    const thread = currentThreads.get(threadId)
    if (!thread) return

    setIsLoading(true)

    // Store the ID of the AI message we're about to create
    let aiMessageId: string | null = null

    try {
      // Add placeholder for AI response and capture its ID
      addMessage(threadId, {
        role: "assistant",
        content: "",
        isStreaming: true,
      })

      // Get the ID of the message we just added (it's the last one)
      // Use getState() to get the fresh state after addMessage
      const freshThreads = useThreadStore.getState().threads
      const freshThread = freshThreads.get(threadId)
      if (freshThread && freshThread.messages.length > 0) {
        aiMessageId = freshThread.messages[freshThread.messages.length - 1].id
      }

      // Get conversation history (exclude the streaming AI placeholder we just added)
      const threadForHistory = useThreadStore.getState().threads.get(threadId)
      const messageHistory = threadForHistory?.messages
        .filter(m => !m.isStreaming) // Exclude the placeholder
        .map(m => ({
          role: m.role,
          content: m.content,
        })) || []

      // Call AI API with conversation history
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          message,
          codeContext,
          messageHistory, // Include previous messages for context
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
                if (parsed.content && aiMessageId) {
                  aiResponse += parsed.content
                  // Update the AI message by its ID (not the last message)
                  updateMessage(threadId, aiMessageId, {
                    content: aiResponse,
                    isStreaming: true,
                  })
                }
              } catch (e) {
                console.error("[v0] Error parsing chunk:", e)
              }
            }
          }
        }
      }

      // Mark streaming as complete
      if (aiMessageId) {
        updateMessage(threadId, aiMessageId, {
          isStreaming: false,
        })
      }
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      addMessage(threadId, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [addMessage, updateMessage, setIsLoading])

  const handleSend = async () => {
    if (!input.trim() || !activeThread || isLoading) return

    const userMessage = input.trim()
    setInput("")

    // Get code context from pending context or first message
    const pendingContext = activeThread.pendingCodeContext
    const codeContext = pendingContext
      ? {
          code: pendingContext.code,
          language: pendingContext.language,
          range: pendingContext.range,
        }
      : activeThread.messages[0]?.codeContext ||
        (activeThread.range
          ? {
              code: activeThread.messages[0]?.codeContext?.code || "",
              language: language,
              range: activeThread.range,
            }
          : undefined)

    // Add user message with code context if this is the first message
    addMessage(activeThread.id, {
      role: "user",
      content: userMessage,
      ...(pendingContext && activeThread.messages.length === 0
        ? { codeContext }
        : {}),
    })

    // Clear pending context after sending
    if (pendingContext) {
      clearPendingCodeContext(activeThread.id)
    }

    await sendToAI(activeThread.id, userMessage, codeContext)
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

      <div className="flex-1 overflow-y-auto bg-[#1e1e1e]" ref={scrollRef}>
        <div className="flex flex-col">
          {/* Show pending code context before any messages are sent */}
          {activeThread.pendingCodeContext && activeThread.messages.length === 0 && (
            <div className="px-4 py-3">
              <div className="mb-2 text-xs text-[#808080]">Selected code to review:</div>
              <CodeCitation
                codeContext={{
                  code: activeThread.pendingCodeContext.code,
                  language: activeThread.pendingCodeContext.language,
                  range: activeThread.pendingCodeContext.range,
                }}
              />
              <div className="mt-3 text-sm text-[#606060]">
                Edit your prompt below and press send to start the review.
              </div>
            </div>
          )}
          {activeThread.messages.length === 0 && !activeThread.pendingCodeContext ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[#606060] mt-20">
              <p className="mb-2">Start a new conversation</p>
            </div>
          ) : (
            activeThread.messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </div>
      </div>

      <div className="border-t border-[#2a2a2a] p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={activeThread.pendingCodeContext ? "Enter your prompt..." : "Ask a follow-up question..."}
            disabled={isLoading}
            rows={1}
            className="flex-1 min-h-[40px] max-h-[200px] resize-none bg-[#1a1a1a] border-[#2a2a2a] text-[#b4b4b4] placeholder:text-[#606060]"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-[#5B9EFF] hover:bg-[#4a8eef] text-white self-end"
          >
            {isLoading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
