"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { FileNode, CodeRange } from "../types"

interface EditorState {
  files: FileNode[]
  activeFileId: string | null
  editorContent: string
  selectedRange: CodeRange | null
  language: string

  // Actions
  setFiles: (files: FileNode[]) => void
  setActiveFile: (fileId: string | null) => void
  setEditorContent: (content: string) => void
  setSelectedRange: (range: CodeRange | null) => void
  setLanguage: (language: string) => void
  updateFileContent: (fileId: string, content: string) => void
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      files: [
        {
          id: "example-ts",
          name: "example.ts",
          type: "file",
          language: "typescript",
          content: `// Welcome to CodeMark
// Select code and right-click to start an AI review thread

interface User {
  id: string
  name: string
  email: string
}

async function fetchUser(userId: string): Promise<User> {
  const response = await fetch(\`/api/users/\${userId}\`)
  return response.json()
}

export { fetchUser }`,
        },
        {
          id: "example-jsx",
          name: "component.jsx",
          type: "file",
          language: "javascript",
          content: `import React from 'react'

function UserProfile({ userId }) {
  const [user, setUser] = React.useState(null)
  
  React.useEffect(() => {
    fetch('/api/user/' + userId)
      .then(res => res.json())
      .then(setUser)
  }, [userId])
  
  return (
    <div>
      {user ? <h1>{user.name}</h1> : <p>Loading...</p>}
    </div>
  )
}

export default UserProfile`,
        },
      ],
      activeFileId: "example-ts",
      editorContent: "",
      selectedRange: null,
      language: "typescript",

      setFiles: (files) => set({ files }),

      setActiveFile: (fileId) => {
        const file = get().files.find((f) => f.id === fileId)
        if (file && file.type === "file") {
          set({
            activeFileId: fileId,
            editorContent: file.content || "",
            language: file.language || "typescript",
          })
        }
      },

      setEditorContent: (content) => set({ editorContent: content }),

      setSelectedRange: (range) => set({ selectedRange: range }),

      setLanguage: (language) => set({ language }),

      updateFileContent: (fileId, content) => {
        const files = get().files.map((file) => (file.id === fileId ? { ...file, content } : file))
        set({ files, editorContent: content })
      },
    }),
    {
      name: "codemark-editor-storage",
      partialize: (state) => ({
        files: state.files,
        activeFileId: state.activeFileId,
      }),
    },
  ),
)
