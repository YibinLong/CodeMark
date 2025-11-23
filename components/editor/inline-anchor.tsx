"use client"

import { useEffect, useCallback, useRef } from "react"
import type { editor } from "monaco-editor"
import type { Monaco } from "@monaco-editor/react"
import type { Thread } from "@/lib/types"

export interface InlineAnchorProps {
  editor: editor.IStandaloneCodeEditor | null
  monaco: Monaco | null
  threads: Thread[]
  activeThreadId: string | null
  activeFileId: string | null
  onThreadClick: (threadId: string) => void
}

export function useInlineAnchors({
  editor,
  monaco,
  threads,
  activeThreadId,
  activeFileId,
  onThreadClick,
}: InlineAnchorProps) {
  const decorationsRef = useRef<string[]>([])
  const scrollListenerRef = useRef<any>(null)

  const updateDecorations = useCallback(() => {
    if (!editor || !monaco || !activeFileId) return

    const fileThreads = threads.filter((thread) => thread.fileId === activeFileId)
    const decorationsArray: editor.IModelDeltaDecoration[] = []

    fileThreads.forEach((thread) => {
      if (!thread.range) return

      const isActive = thread.id === activeThreadId
      const isResolved = thread.status === "resolved"
      const messageCount = thread.messages.length

      // Determine decoration class based on status
      let glyphClass = "thread-glyph"
      let lineClass = "thread-line"

      if (isActive) {
        glyphClass = "thread-glyph-active"
        lineClass = "thread-line-active"
      } else if (isResolved) {
        glyphClass = "thread-glyph-resolved"
        lineClass = "thread-line-resolved"
      } else if (messageCount > 1) {
        glyphClass = "thread-glyph-has-replies"
      }

      // Add line decoration for the thread range
      decorationsArray.push({
        range: new monaco.Range(thread.range.startLine, 1, thread.range.endLine, 1),
        options: {
          isWholeLine: true,
          className: lineClass,
          glyphMarginClassName: glyphClass,
          glyphMarginHoverMessage: {
            value: `**${thread.title || "Thread"}**\n\n${messageCount} message${messageCount !== 1 ? "s" : ""}\n\nStatus: ${thread.status}\n\nClick to open`,
          },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      })

      // Add hover highlight decoration
      decorationsArray.push({
        range: new monaco.Range(thread.range.startLine, 1, thread.range.endLine, 1),
        options: {
          isWholeLine: false,
          className: `thread-code-highlight ${isActive ? "active" : ""}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      })
    })

    const newDecorations = editor.deltaDecorations(decorationsRef.current, decorationsArray)
    decorationsRef.current = newDecorations
  }, [editor, monaco, threads, activeThreadId, activeFileId])

  // Set up glyph margin click handler
  useEffect(() => {
    if (!editor || !monaco || !activeFileId) return

    const clickListener = editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber
        if (lineNumber) {
          // Find thread at this line
          const thread = threads.find(
            (t) =>
              t.fileId === activeFileId &&
              t.range &&
              lineNumber >= t.range.startLine &&
              lineNumber <= t.range.endLine,
          )
          if (thread) {
            onThreadClick(thread.id)
          }
        }
      }
    })

    return () => {
      clickListener.dispose()
    }
  }, [editor, monaco, threads, activeFileId, onThreadClick])

  // Update decorations on scroll and viewport changes for performance
  useEffect(() => {
    if (!editor) return

    // Update decorations initially
    updateDecorations()

    // Listen to scroll events for performance optimizations
    const onScroll = editor.onDidScrollChange(() => {
      // Decorations automatically adjust with scrolling in Monaco
      // This is here for potential future optimizations
    })

    scrollListenerRef.current = onScroll

    return () => {
      if (scrollListenerRef.current) {
        scrollListenerRef.current.dispose()
      }
    }
  }, [editor, updateDecorations])

  // Update decorations when dependencies change
  useEffect(() => {
    updateDecorations()
  }, [updateDecorations])

  // Clean up decorations on unmount
  useEffect(() => {
    return () => {
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, [])
        decorationsRef.current = []
      }
    }
  }, [editor])

  return {
    updateDecorations,
  }
}

// CSS styles for thread decorations
export const inlineAnchorStyles = `
  /* Base thread line styles */
  .thread-line {
    background: rgba(91, 158, 255, 0.08);
    border-left: 2px solid rgba(91, 158, 255, 0.3);
  }

  .thread-line-active {
    background: rgba(91, 158, 255, 0.15);
    border-left: 3px solid #5B9EFF;
  }

  .thread-line-resolved {
    background: rgba(74, 222, 128, 0.05);
    border-left: 2px solid rgba(74, 222, 128, 0.3);
  }

  /* Code highlight on hover */
  .thread-code-highlight {
    background: rgba(91, 158, 255, 0.05);
  }

  .thread-code-highlight.active {
    background: rgba(91, 158, 255, 0.1);
  }

  /* Glyph margin icons */
  .thread-glyph,
  .thread-glyph-active,
  .thread-glyph-resolved,
  .thread-glyph-has-replies {
    width: 16px !important;
    height: 16px !important;
    border-radius: 3px;
    margin-left: 4px;
    margin-top: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .thread-glyph {
    background: rgba(91, 158, 255, 0.3) !important;
  }

  .thread-glyph:hover {
    background: rgba(91, 158, 255, 0.5) !important;
    transform: scale(1.1);
  }

  .thread-glyph-active {
    background: #5B9EFF !important;
    box-shadow: 0 0 8px rgba(91, 158, 255, 0.5);
  }

  .thread-glyph-active:hover {
    background: #7FB3FF !important;
  }

  .thread-glyph-resolved {
    background: rgba(74, 222, 128, 0.3) !important;
  }

  .thread-glyph-resolved:hover {
    background: rgba(74, 222, 128, 0.5) !important;
    transform: scale(1.1);
  }

  .thread-glyph-has-replies {
    background: rgba(91, 158, 255, 0.5) !important;
  }

  .thread-glyph-has-replies:hover {
    background: rgba(91, 158, 255, 0.7) !important;
    transform: scale(1.1);
  }

  /* Icon indicators */
  .thread-glyph::before,
  .thread-glyph-has-replies::before {
    content: "💬";
    font-size: 10px;
    position: absolute;
    top: 1px;
    left: 2px;
  }

  .thread-glyph-active::before {
    content: "💬";
    font-size: 10px;
    position: absolute;
    top: 1px;
    left: 2px;
    filter: brightness(1.2);
  }

  .thread-glyph-resolved::before {
    content: "✓";
    font-size: 12px;
    font-weight: bold;
    position: absolute;
    top: 0px;
    left: 3px;
    color: #4ADE80;
  }
`
