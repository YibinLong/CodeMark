import type { editor } from "monaco-editor"
import type { CodeRange } from "./types"

/**
 * Convert Monaco IRange to CodeRange (serializable format)
 */
export function iRangeToCodeRange(range: editor.IRange): CodeRange {
  return {
    startLine: range.startLineNumber,
    endLine: range.endLineNumber,
    startColumn: range.startColumn,
    endColumn: range.endColumn,
  }
}

/**
 * Convert CodeRange to Monaco IRange
 */
export function codeRangeToIRange(range: CodeRange): editor.IRange {
  return {
    startLineNumber: range.startLine,
    endLineNumber: range.endLine,
    startColumn: range.startColumn,
    endColumn: range.endColumn,
  }
}

/**
 * Validate if a range is valid (not empty and within bounds)
 */
export function isValidRange(range: CodeRange | editor.IRange): boolean {
  if ("startLine" in range) {
    // CodeRange
    return (
      range.startLine > 0 &&
      range.endLine >= range.startLine &&
      range.startColumn > 0 &&
      range.endColumn > 0 &&
      (range.startLine !== range.endLine || range.endColumn > range.startColumn)
    )
  } else {
    // IRange
    return (
      range.startLineNumber > 0 &&
      range.endLineNumber >= range.startLineNumber &&
      range.startColumn > 0 &&
      range.endColumn > 0 &&
      (range.startLineNumber !== range.endLineNumber || range.endColumn > range.startColumn)
    )
  }
}

/**
 * Get selected text from editor model within a range
 */
export function getTextFromRange(
  model: editor.ITextModel | null,
  range: CodeRange | editor.IRange,
): string {
  if (!model) return ""

  const iRange = "startLine" in range ? codeRangeToIRange(range) : range

  return model.getValueInRange(iRange)
}

/**
 * Check if a range is a single cursor position (no selection)
 */
export function isCursorOnly(range: CodeRange | editor.IRange): boolean {
  if ("startLine" in range) {
    return (
      range.startLine === range.endLine &&
      range.startColumn === range.endColumn
    )
  } else {
    return (
      range.startLineNumber === range.endLineNumber &&
      range.startColumn === range.endColumn
    )
  }
}

/**
 * Serialize CodeRange to JSON string
 */
export function serializeCodeRange(range: CodeRange): string {
  return JSON.stringify(range)
}

/**
 * Deserialize CodeRange from JSON string
 */
export function deserializeCodeRange(rangeStr: string): CodeRange | null {
  try {
    const range = JSON.parse(rangeStr)
    if (isValidRange(range)) {
      return range
    }
    return null
  } catch {
    return null
  }
}
