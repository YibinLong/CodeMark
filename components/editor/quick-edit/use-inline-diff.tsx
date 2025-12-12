"use client"

import { useCallback, useRef } from "react"
import type { editor } from "monaco-editor"
import type { Monaco } from "@monaco-editor/react"
import type { CodeRange, DiffLine } from "@/lib/types"

interface UseInlineDiffProps {
  editor: editor.IStandaloneCodeEditor | null
  monaco: Monaco | null
  selection: CodeRange | null
  originalCode: string
}

// Simple line-by-line diff computation
function computeDiff(original: string, modified: string): DiffLine[] {
  // Handle empty strings specially - "".split("\n") returns [""] not []
  const originalLines = original === "" ? [] : original.split("\n")
  const modifiedLines = modified === "" ? [] : modified.split("\n")
  const result: DiffLine[] = []

  let oldIdx = 0
  let newIdx = 0

  // Simple LCS-based approach for now
  while (oldIdx < originalLines.length || newIdx < modifiedLines.length) {
    const oldLine = originalLines[oldIdx]
    const newLine = modifiedLines[newIdx]

    if (oldIdx >= originalLines.length) {
      // Only new lines left - all additions
      result.push({
        type: "add",
        content: newLine,
        newLineNumber: newIdx + 1,
      })
      newIdx++
    } else if (newIdx >= modifiedLines.length) {
      // Only old lines left - all removals
      result.push({
        type: "remove",
        content: oldLine,
        oldLineNumber: oldIdx + 1,
      })
      oldIdx++
    } else if (oldLine === newLine) {
      // Lines match - unchanged
      result.push({
        type: "unchanged",
        content: oldLine,
        oldLineNumber: oldIdx + 1,
        newLineNumber: newIdx + 1,
      })
      oldIdx++
      newIdx++
    } else {
      // Lines differ - check if it's a modification or insertion/deletion
      // Look ahead to find matching lines
      const oldAhead = originalLines.slice(oldIdx + 1).indexOf(newLine)
      const newAhead = modifiedLines.slice(newIdx + 1).indexOf(oldLine)

      if (newAhead !== -1 && (oldAhead === -1 || newAhead <= oldAhead)) {
        // Old line appears later in new - current new line is an addition
        result.push({
          type: "add",
          content: newLine,
          newLineNumber: newIdx + 1,
        })
        newIdx++
      } else if (oldAhead !== -1 && (newAhead === -1 || oldAhead < newAhead)) {
        // New line appears later in old - current old line is a removal
        result.push({
          type: "remove",
          content: oldLine,
          oldLineNumber: oldIdx + 1,
        })
        oldIdx++
      } else {
        // Treat as modification (remove old, add new)
        result.push({
          type: "remove",
          content: oldLine,
          oldLineNumber: oldIdx + 1,
        })
        result.push({
          type: "add",
          content: newLine,
          newLineNumber: newIdx + 1,
        })
        oldIdx++
        newIdx++
      }
    }
  }

  return result
}

export function useInlineDiff({
  editor,
  monaco,
  selection,
  originalCode,
}: UseInlineDiffProps) {
  const decorationsRef = useRef<string[]>([])
  const newCodeRef = useRef<string | null>(null)

  const applyDiff = useCallback(
    (newCode: string) => {
      if (!editor || !monaco || !selection) return

      newCodeRef.current = newCode
      const model = editor.getModel()
      if (!model) return

      const diffLines = computeDiff(originalCode, newCode)
      const decorations: editor.IModelDeltaDecoration[] = []

      // Calculate the starting line in the editor
      const startLine = selection.startLine
      let currentLine = startLine

      // First, apply decorations to show the diff
      for (const diffLine of diffLines) {
        if (diffLine.type === "remove") {
          decorations.push({
            range: new monaco.Range(currentLine, 1, currentLine, 1),
            options: {
              isWholeLine: true,
              className: "diff-removed-line",
              glyphMarginClassName: "diff-removed-glyph",
              stickiness:
                monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
          })
          currentLine++
        } else if (diffLine.type === "add") {
          // For added lines, we'll use inline decorations after the content
          // Since we can't easily insert lines, we'll highlight differently
          decorations.push({
            range: new monaco.Range(
              Math.min(currentLine, selection.endLine),
              1,
              Math.min(currentLine, selection.endLine),
              1
            ),
            options: {
              isWholeLine: true,
              className: "diff-added-line",
              glyphMarginClassName: "diff-added-glyph",
              after: {
                content: ` + ${diffLine.content}`,
                inlineClassName: "diff-added-inline",
              },
              stickiness:
                monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
          })
        } else {
          // Unchanged lines
          currentLine++
        }
      }

      // Alternative approach: show new code as view zones (inline blocks)
      // For simplicity, we'll just apply line decorations and replace on accept

      const newDecorations = editor.deltaDecorations(
        decorationsRef.current,
        decorations
      )
      decorationsRef.current = newDecorations
    },
    [editor, monaco, selection, originalCode]
  )

  const clearDiff = useCallback(() => {
    if (!editor) return

    editor.deltaDecorations(decorationsRef.current, [])
    decorationsRef.current = []
  }, [editor])

  const acceptDiff = useCallback(() => {
    // Allow empty string for deletion (check for null, not falsy)
    const newCode = newCodeRef.current
    if (!editor || !monaco || !selection || newCode === null) return

    const model = editor.getModel()
    if (!model) return

    // Clear decorations first
    clearDiff()

    // Replace the selected range with the new code (empty string = deletion)
    const range = new monaco.Range(
      selection.startLine,
      selection.startColumn,
      selection.endLine,
      selection.endColumn
    )

    editor.executeEdits("quick-edit", [
      {
        range,
        text: newCode,
        forceMoveMarkers: true,
      },
    ])

    // Clear the stored new code
    newCodeRef.current = null
  }, [editor, monaco, selection, clearDiff])

  const rejectDiff = useCallback(() => {
    clearDiff()
    newCodeRef.current = null
  }, [clearDiff])

  return {
    applyDiff,
    acceptDiff,
    rejectDiff,
    clearDiff,
  }
}
