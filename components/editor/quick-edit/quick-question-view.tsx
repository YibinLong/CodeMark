"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useQuickEditStore } from "@/lib/stores/quick-edit-store"

interface QuickQuestionViewProps {
  selectedText: string
  language: string
}

export function QuickQuestionView({
  selectedText,
  language,
}: QuickQuestionViewProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    qaHistory,
    currentQuestion,
    setCurrentQuestion,
    addQAMessage,
    isAnswering,
    setIsAnswering,
    closePopup,
  } = useQuickEditStore()

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [qaHistory])

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion.trim() || isAnswering) return

    setError(null)
    const question = currentQuestion.trim()

    // Add user message
    addQAMessage({ role: "user", content: question })
    setCurrentQuestion("")
    setIsAnswering(true)

    try {
      // Build message history for context
      const messageHistory = qaHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          codeContext: {
            code: selectedText,
            language,
          },
          messageHistory,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let fullResponse = ""

      // Add placeholder for assistant message
      addQAMessage({ role: "assistant", content: "" })

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullResponse += parsed.content
                // Update the last message with streaming content
                // Note: We need to update via the store
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Update the assistant message with full response
      // For now, we'll handle this by removing and re-adding
      // This is a simplification - ideally we'd stream updates
      const updatedHistory = useQuickEditStore.getState().qaHistory.slice(0, -1)
      useQuickEditStore.setState({
        qaHistory: [
          ...updatedHistory,
          { role: "assistant", content: fullResponse },
        ],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      // Remove the placeholder assistant message on error
      const updatedHistory = useQuickEditStore.getState().qaHistory.slice(0, -1)
      useQuickEditStore.setState({ qaHistory: updatedHistory })
    } finally {
      setIsAnswering(false)
    }
  }, [
    currentQuestion,
    isAnswering,
    qaHistory,
    selectedText,
    language,
    addQAMessage,
    setCurrentQuestion,
    setIsAnswering,
  ])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div>
      {qaHistory.length > 0 && (
        <div className="quick-edit-qa" ref={scrollRef}>
          {qaHistory.map((msg, index) => (
            <div
              key={index}
              className={`quick-edit-qa-message quick-edit-qa-${msg.role}`}
            >
              <div className="quick-edit-qa-role">
                {msg.role === "user" ? "You" : "AI"}
              </div>
              <div className="quick-edit-qa-content">
                {msg.content || (isAnswering && index === qaHistory.length - 1 ? "Thinking..." : "")}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="quick-edit-input-wrapper" style={{ marginTop: qaHistory.length > 0 ? "12px" : 0 }}>
        <textarea
          ref={inputRef}
          className="quick-edit-input"
          placeholder={qaHistory.length > 0 ? "Ask a follow-up question..." : "Ask a question about this code..."}
          value={currentQuestion}
          onChange={(e) => setCurrentQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={isAnswering}
        />
      </div>

      {error && (
        <div style={{ color: "#f85149", fontSize: "12px", marginTop: "8px" }}>
          {error}
        </div>
      )}

      <div className="quick-edit-actions">
        <button
          className="quick-edit-btn quick-edit-btn-secondary"
          onClick={closePopup}
        >
          Close
        </button>
        <button
          className="quick-edit-btn quick-edit-btn-primary"
          onClick={handleSubmit}
          disabled={!currentQuestion.trim() || isAnswering}
        >
          {isAnswering ? "Asking..." : "Quick Question"}
        </button>
      </div>
    </div>
  )
}
