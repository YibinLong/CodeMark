"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { createPortal } from "react-dom"
import type { editor } from "monaco-editor"
import type { Monaco } from "@monaco-editor/react"
import { useQuickEditStore } from "@/lib/stores/quick-edit-store"
import { EditSelectionView } from "./edit-selection-view"
import { QuickQuestionView } from "./quick-question-view"

interface QuickEditPopupProps {
  editor: editor.IStandaloneCodeEditor | null
  monaco: Monaco | null
}

export function QuickEditPopup({ editor, monaco }: QuickEditPopupProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetRef = useRef<editor.IContentWidget | null>(null)
  const [mounted, setMounted] = useState(false)

  const {
    isOpen,
    mode,
    selection,
    selectedText,
    language,
    setMode,
    closePopup,
    showDiff,
  } = useQuickEditStore()

  // Create widget container
  useEffect(() => {
    if (!containerRef.current) {
      const container = document.createElement("div")
      container.className = "quick-edit-widget-container"
      containerRef.current = container
    }
  }, [])

  // Manage content widget lifecycle
  useEffect(() => {
    if (!editor || !monaco || !isOpen || !selection || !containerRef.current) {
      // Remove widget if conditions aren't met
      if (widgetRef.current && editor) {
        editor.removeContentWidget(widgetRef.current)
        widgetRef.current = null
      }
      setMounted(false)
      return
    }

    // Create and add the content widget
    const widget: editor.IContentWidget = {
      getId: () => "quick-edit-widget",
      getDomNode: () => containerRef.current!,
      getPosition: () => ({
        position: {
          lineNumber: selection.endLine + 1,
          column: 1,
        },
        preference: [
          monaco.editor.ContentWidgetPositionPreference.BELOW,
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
        ],
      }),
    }

    editor.addContentWidget(widget)
    widgetRef.current = widget
    setMounted(true)

    return () => {
      if (widgetRef.current && editor) {
        editor.removeContentWidget(widgetRef.current)
        widgetRef.current = null
      }
      setMounted(false)
    }
  }, [editor, monaco, isOpen, selection])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showDiff) {
        e.preventDefault()
        e.stopPropagation()
        closePopup()
      }
    }

    document.addEventListener("keydown", handleKeyDown, true)
    return () => document.removeEventListener("keydown", handleKeyDown, true)
  }, [isOpen, showDiff, closePopup])

  // Handle click outside
  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        // Don't close if showing diff
        if (!showDiff) {
          closePopup()
        }
      }
    }

    // Delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, showDiff, closePopup])

  if (!isOpen || !mounted || !containerRef.current) {
    return null
  }

  return createPortal(
    <div className="quick-edit-popup">
      <div className="quick-edit-header">
        <div className="quick-edit-tabs">
          <button
            className={`quick-edit-tab ${mode === "edit" ? "active" : ""}`}
            onClick={() => setMode("edit")}
          >
            Edit Selection
          </button>
          <button
            className={`quick-edit-tab ${mode === "question" ? "active" : ""}`}
            onClick={() => setMode("question")}
          >
            Quick Question
          </button>
        </div>
        <button className="quick-edit-close" onClick={closePopup}>
          &times;
        </button>
      </div>

      <div className="quick-edit-model">
        Sonnet 4.5
      </div>

      <div className="quick-edit-content">
        {mode === "edit" ? (
          <EditSelectionView
            editor={editor}
            monaco={monaco}
            selectedText={selectedText}
            selection={selection}
            language={language}
          />
        ) : (
          <QuickQuestionView
            editor={editor}
            selection={selection}
            selectedText={selectedText}
            language={language}
          />
        )}
      </div>
    </div>,
    containerRef.current
  )
}
