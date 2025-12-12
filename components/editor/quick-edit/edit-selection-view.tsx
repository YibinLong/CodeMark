"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { editor } from "monaco-editor"
import type { Monaco } from "@monaco-editor/react"
import { useQuickEditStore } from "@/lib/stores/quick-edit-store"
import { useInlineDiff } from "./use-inline-diff"
import type { CodeRange } from "@/lib/types"

interface EditSelectionViewProps {
  editor: editor.IStandaloneCodeEditor | null
  monaco: Monaco | null
  selectedText: string
  selection: CodeRange | null
  language: string
}

export function EditSelectionView({
  editor,
  monaco,
  selectedText,
  selection,
  language,
}: EditSelectionViewProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    editPrompt,
    setEditPrompt,
    isGenerating,
    setIsGenerating,
    generatedCode,
    setGeneratedCode,
    showDiff,
    setShowDiff,
    closePopup,
  } = useQuickEditStore()

  const { applyDiff, acceptDiff, rejectDiff } = useInlineDiff({
    editor,
    monaco,
    selection,
    originalCode: selectedText,
  })

  // Store rejectDiff in a ref so cleanup always uses the latest version
  const rejectDiffRef = useRef(rejectDiff)
  rejectDiffRef.current = rejectDiff

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Clean up decorations when component unmounts (e.g., popup closes without accept/reject)
  useEffect(() => {
    return () => {
      // If there's a pending diff when unmounting, reject it to clear decorations
      rejectDiffRef.current()
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!editPrompt.trim() || isGenerating) return

    setError(null)
    setIsGenerating(true)

    try {
      // Extract surrounding context from the editor
      let contextBefore = ""
      let contextAfter = ""

      if (editor && selection) {
        const model = editor.getModel()
        if (model) {
          const fullContent = model.getValue()
          const lines = fullContent.split("\n")

          // Get up to 20 lines before the selection for context
          const startLineIdx = selection.startLine - 1 // 0-indexed
          const contextStartIdx = Math.max(0, startLineIdx - 20)
          if (contextStartIdx < startLineIdx) {
            contextBefore = lines.slice(contextStartIdx, startLineIdx).join("\n")
          }

          // Get up to 20 lines after the selection for context
          const endLineIdx = selection.endLine // 0-indexed would be endLine - 1, but we want the line after
          const contextEndIdx = Math.min(lines.length, endLineIdx + 20)
          if (endLineIdx < contextEndIdx) {
            contextAfter = lines.slice(endLineIdx, contextEndIdx).join("\n")
          }
        }
      }

      const response = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: selectedText,
          language,
          prompt: editPrompt,
          contextBefore,
          contextAfter,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate edit")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let fullCode = ""

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
                fullCode += parsed.content
              }
              if (parsed.fullCode) {
                fullCode = parsed.fullCode
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Handle __DELETE__ marker - convert to empty string for deletion
      if (fullCode.trim() === "__DELETE__") {
        fullCode = ""
      }

      // Always show diff, even if fullCode is empty (for deletion)
      setGeneratedCode(fullCode)
      applyDiff(fullCode)
      setShowDiff(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGenerating(false)
    }
  }, [
    editPrompt,
    isGenerating,
    selectedText,
    language,
    setIsGenerating,
    setGeneratedCode,
    applyDiff,
    setShowDiff,
    editor,
    selection,
  ])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleAccept = useCallback(() => {
    acceptDiff()
    closePopup()
  }, [acceptDiff, closePopup])

  const handleReject = useCallback(() => {
    rejectDiff()
    setShowDiff(false)
    setGeneratedCode(null)
  }, [rejectDiff, setShowDiff, setGeneratedCode])

  if (showDiff) {
    return (
      <div className="quick-edit-diff-view">
        <div className="quick-edit-diff-actions">
          <span className="quick-edit-diff-info">
            Review changes in editor
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="quick-edit-btn quick-edit-btn-reject"
              onClick={handleReject}
            >
              Reject
            </button>
            <button
              className="quick-edit-btn quick-edit-btn-accept"
              onClick={handleAccept}
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="quick-edit-loading">
        <div className="quick-edit-spinner" />
        <span>Generating edit...</span>
      </div>
    )
  }

  return (
    <div>
      <div className="quick-edit-input-wrapper">
        <textarea
          ref={inputRef}
          className="quick-edit-input"
          placeholder="Describe the changes you want to make..."
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
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
          Cancel
        </button>
        <button
          className="quick-edit-btn quick-edit-btn-primary"
          onClick={handleSubmit}
          disabled={!editPrompt.trim()}
        >
          Edit Selection
        </button>
      </div>
    </div>
  )
}
