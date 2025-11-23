"use client"

import { useEffect, useRef, useState } from "react"
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react"
import { useEditorStore } from "@/lib/stores/editor-store"
import { useThreadStore } from "@/lib/stores/thread-store"
import { iRangeToCodeRange, isCursorOnly } from "@/lib/selection"
import type { editor } from "monaco-editor"

export function MonacoEditorWrapper() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const [decorations, setDecorations] = useState<string[]>([])
  const [hasError, setHasError] = useState(false)

  const {
    editorContent,
    language,
    setEditorContent,
    activeFileId,
    updateFileContent,
    setSelectedRange,
  } = useEditorStore()
  const { threads, activeThreadId, getThreadsByFile, createThread, openThread } = useThreadStore()

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

            // Create a new thread
            createThread(
              activeFileId,
              {
                startLine: selection.startLineNumber,
                endLine: selection.endLineNumber,
                startColumn: selection.startColumn,
                endColumn: selection.endColumn,
              },
              "Can you review this code?",
              selectedText,
              language,
            )
          }
        }
      },
    })

    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber
        if (lineNumber && activeFileId) {
          // Find thread at this line
          const thread = getThreadsByFile(activeFileId).find((t) => t.range?.startLine === lineNumber)
          if (thread) {
            openThread(thread.id)
          }
        }
      }
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
          createThread(
            activeFileId,
            codeRange,
            "Can you review this code?",
            selectedText,
            language,
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

    // Add gutter icons for threads
    updateGutterDecorations()
  }

  // Update decorations when threads change
  useEffect(() => {
    updateGutterDecorations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, activeFileId, activeThreadId])

  const updateGutterDecorations = () => {
    if (!editorRef.current || !monacoRef.current || !activeFileId) return

    const fileThreads = getThreadsByFile(activeFileId)
    const decorationsArray: editor.IModelDeltaDecoration[] = []

    fileThreads.forEach((thread) => {
      if (!thread.range) return

      const isActive = thread.id === activeThreadId

      // Add line decoration for the thread range
      decorationsArray.push({
        range: new monacoRef.current!.Range(thread.range.startLine, 1, thread.range.endLine, 1),
        options: {
          isWholeLine: true,
          className: isActive ? "thread-line-active" : "thread-line",
          glyphMarginClassName: isActive ? "thread-glyph-active" : "thread-glyph",
          glyphMarginHoverMessage: { value: `**Thread** (${thread.messages.length} messages)` },
        },
      })
    })

    const newDecorations = editorRef.current.deltaDecorations(decorations, decorationsArray)
    setDecorations(newDecorations)
  }

  // Handle editor content changes
  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || ""
    setEditorContent(newContent)
    if (activeFileId) {
      updateFileContent(activeFileId, newContent)
    }
  }

  // Add CSS for thread decorations
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `
      .thread-line {
        background: rgba(91, 158, 255, 0.1);
      }
      .thread-line-active {
        background: rgba(91, 158, 255, 0.2);
        border-left: 2px solid #5B9EFF;
      }
      .thread-glyph {
        background: #2a5a8a !important;
        width: 16px !important;
        height: 16px !important;
        border-radius: 3px;
        margin-left: 4px;
        margin-top: 4px;
        cursor: pointer;
      }
      .thread-glyph-active {
        background: #5B9EFF !important;
        width: 16px !important;
        height: 16px !important;
        border-radius: 3px;
        margin-left: 4px;
        margin-top: 4px;
        cursor: pointer;
      }
      .thread-glyph::before,
      .thread-glyph-active::before {
        content: "💬";
        font-size: 10px;
        position: absolute;
        top: 1px;
        left: 2px;
      }
    `
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
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
        }}
      />
    </div>
  )
}
