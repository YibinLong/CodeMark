"use client"

import { useEffect, useRef, useState } from "react"
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react"
import { useEditorStore } from "@/lib/stores/editor-store"
import { useThreadStore } from "@/lib/stores/thread-store"
import { useQuickEditStore } from "@/lib/stores/quick-edit-store"
import { iRangeToCodeRange, isCursorOnly } from "@/lib/selection"
import { useInlineAnchors, inlineAnchorStyles } from "./inline-anchor"
import { QuickEditPopup } from "./quick-edit/quick-edit-popup"
import { quickEditStyles } from "./quick-edit/quick-edit-styles"
import type { editor } from "monaco-editor"

export function MonacoEditorWrapper() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const [hasError, setHasError] = useState(false)

  const {
    editorContent,
    language,
    setEditorContent,
    activeFileId,
    updateFileContent,
    setSelectedRange,
  } = useEditorStore()
  const { threads, activeThreadId, getThreadsByFile, createThreadWithPendingCode, openThread } = useThreadStore()
  const { openPopup } = useQuickEditStore()

  // Use inline anchors hook for thread decorations
  useInlineAnchors({
    editor: editorRef.current,
    monaco: monacoRef.current,
    threads: Array.from(threads.values()),
    activeThreadId,
    activeFileId,
    onThreadClick: openThread,
  })

  // Handle editor mount
  const handleEditorMount: OnMount = (editor, monaco) => {
    try {
      editorRef.current = editor
      monacoRef.current = monaco

      // Custom theme
      monaco.editor.defineTheme("codemark-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": "#0d0d0d",
          "editor.lineHighlightBackground": "#1a1a1a",
          "editorLineNumber.foreground": "#4a4a4a",
          "editorLineNumber.activeForeground": "#808080",
          "editor.selectionBackground": "#2a4a6a",
          "editor.inactiveSelectionBackground": "#1a3a5a",
        },
      })
      monaco.editor.setTheme("codemark-dark")
    } catch (error) {
      console.error("Monaco Editor initialization failed:", error)
      setHasError(true)
      return
    }

    // Context menu for creating threads
    editor.addAction({
      id: "ask-ai",
      label: "Ask AI about this",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1.5,
      run: (ed) => {
        const selection = ed.getSelection()
        if (selection && activeFileId) {
          const selectedText = ed.getModel()?.getValueInRange(selection) || ""
          if (selectedText) {
            setSelectedRange({
              startLine: selection.startLineNumber,
              endLine: selection.endLineNumber,
              startColumn: selection.startColumn,
              endColumn: selection.endColumn,
            })

            // Create a new thread with pending code context (no auto-send)
            createThreadWithPendingCode(
              activeFileId,
              {
                startLine: selection.startLineNumber,
                endLine: selection.endLineNumber,
                startColumn: selection.startColumn,
                endColumn: selection.endColumn,
              },
              selectedText,
              language,
              "Can you review this code?",
            )
          }
        }
      },
    })

    // Context menu for Quick Edit
    editor.addAction({
      id: "quick-edit",
      label: "Quick Edit",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1.6,
      run: (ed) => {
        const selection = ed.getSelection()
        if (selection && activeFileId) {
          const selectedText = ed.getModel()?.getValueInRange(selection) || ""
          if (selectedText) {
            const codeRange = {
              startLine: selection.startLineNumber,
              endLine: selection.endLineNumber,
              startColumn: selection.startColumn,
              endColumn: selection.endColumn,
            }
            setSelectedRange(codeRange)
            openPopup(codeRange, selectedText, activeFileId, language)
          }
        }
      },
    })

    // Selection change listener
    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection
      if (selection && !isCursorOnly(selection)) {
        // User made a selection (not just cursor position)
        const codeRange = iRangeToCodeRange(selection)
        setSelectedRange(codeRange)
      } else {
        // No selection or just cursor position
        setSelectedRange(null)
      }
    })

    // Keyboard shortcuts
    // Cmd/Ctrl+Enter - Create thread from selection
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      const selection = editor.getSelection()
      if (selection && activeFileId && !isCursorOnly(selection)) {
        const selectedText = editor.getModel()?.getValueInRange(selection) || ""
        if (selectedText) {
          const codeRange = iRangeToCodeRange(selection)
          createThreadWithPendingCode(
            activeFileId,
            codeRange,
            selectedText,
            language,
            "Can you review this code?",
          )
        }
      }
    })

    // Esc - Clear selection
    editor.addCommand(monaco.KeyCode.Escape, () => {
      const selection = editor.getSelection()
      if (selection && !isCursorOnly(selection)) {
        // Clear selection by setting cursor to current position
        editor.setSelection({
          startLineNumber: selection.endLineNumber,
          startColumn: selection.endColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn,
        })
        setSelectedRange(null)
      }
    })
  }

  // Handle editor content changes
  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || ""
    setEditorContent(newContent)
    if (activeFileId) {
      updateFileContent(activeFileId, newContent)
    }
  }

  // Add CSS for thread decorations and quick edit
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = inlineAnchorStyles + quickEditStyles
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Fallback textarea component
  if (hasError) {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="bg-yellow-900/20 border border-yellow-600/50 text-yellow-200 px-4 py-2 text-sm">
          Monaco Editor failed to load. Using basic editor mode.
        </div>
        <textarea
          className="flex-1 w-full bg-[#0d0d0d] text-white font-mono text-sm p-4 resize-none focus:outline-none"
          value={editorContent}
          onChange={(e) => handleEditorChange(e.target.value)}
          spellCheck={false}
        />
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={language}
        value={editorContent}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        onValidate={(markers) => {
          // Handle validation errors
          if (markers.length > 0) {
            console.warn("Monaco validation errors:", markers)
          }
        }}
        loading={
          <div className="h-full w-full flex items-center justify-center bg-[#0d0d0d] text-gray-400">
            Loading editor...
          </div>
        }
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          fontFamily: "var(--font-mono)",
          lineNumbers: "on",
          glyphMargin: true,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: true,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
        }}
      />
      <QuickEditPopup editor={editorRef.current} monaco={monacoRef.current} />
    </div>
  )
}
