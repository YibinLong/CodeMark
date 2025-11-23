"use client"

import { useEffect, useRef, useState } from "react"
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react"
import { useEditorStore } from "@/lib/stores/editor-store"
import { useThreadStore } from "@/lib/stores/thread-store"
import type { editor } from "monaco-editor"

export function MonacoEditorWrapper() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const [decorations, setDecorations] = useState<string[]>([])

  const {
    editorContent,
    language,
    setEditorContent,
    activeFileId,
    updateFileContent,
    selectedRange,
    setSelectedRange,
  } = useEditorStore()
  const { threads, activeThreadId, setActiveThread, getThreadsByFile, createThread, openThread } = useThreadStore()

  // Handle editor mount
  const handleEditorMount: OnMount = (editor, monaco) => {
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
          const thread = getThreadsByFile(activeFileId).find((t) => t.range.startLine === lineNumber)
          if (thread) {
            openThread(thread.id)
          }
        }
      }
    })

    // Add gutter icons for threads
    updateGutterDecorations()
  }

  // Update decorations when threads change
  useEffect(() => {
    updateGutterDecorations()
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

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={language}
        value={editorContent}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
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
