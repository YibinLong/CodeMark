export interface FileNode {
  id: string
  name: string
  type: "file" | "folder"
  content?: string
  language?: string
  children?: FileNode[]
}

export interface CodeRange {
  startLine: number
  endLine: number
  startColumn: number
  endColumn: number
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  codeContext?: {
    code: string
    language: string
    range?: CodeRange // Made range optional
  }
  timestamp: Date
  isStreaming?: boolean
}

export interface Thread {
  id: string
  fileId?: string // Made fileId optional for general chat
  range?: CodeRange // Made range optional for general chat
  messages: Message[]
  status: "active" | "resolved"
  createdAt: Date
  updatedAt: Date
  title?: string // Added title for tabs
  pendingCodeContext?: {
    code: string
    language: string
    range?: CodeRange
    defaultPrompt?: string // Pre-filled prompt for the input box
  }
}

// Quick Edit types
export interface DiffLine {
  type: "add" | "remove" | "unchanged"
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface DiffResult {
  lines: DiffLine[]
  hasChanges: boolean
}
