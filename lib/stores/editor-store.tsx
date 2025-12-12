"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { FileNode, CodeRange } from "../types"

interface EditorState {
  files: FileNode[]
  activeFileId: string | null
  selectedFolderId: string | null // Track which folder is selected for adding new items
  expandedFolders: Set<string> // Track which folders are expanded
  editorContent: string
  selectedRange: CodeRange | null
  language: string

  // Actions
  setFiles: (files: FileNode[]) => void
  setActiveFile: (fileId: string | null) => void
  setSelectedFolder: (folderId: string | null) => void
  toggleFolderExpanded: (folderId: string) => void
  setEditorContent: (content: string) => void
  setSelectedRange: (range: CodeRange | null) => void
  setLanguage: (language: string) => void
  updateFileContent: (fileId: string, content: string) => void
  addFile: (name: string, parentId: string | null, type: "file" | "folder", content?: string, language?: string) => void
  deleteFile: (fileId: string) => void
  moveFile: (fileId: string, targetFolderId: string | null) => void
  renameFile: (fileId: string, newName: string) => void
}

// Helper function to detect language from file extension
function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    vue: "vue",
    svelte: "svelte",
  }
  return languageMap[ext || ""] || "plaintext"
}

// Helper function to find a file/folder by ID in the tree
function findFileInTree(files: FileNode[], id: string): FileNode | null {
  for (const file of files) {
    if (file.id === id) return file
    if (file.children) {
      const found = findFileInTree(file.children, id)
      if (found) return found
    }
  }
  return null
}

// Helper function to add a file to a specific parent in the tree
function addFileToTree(files: FileNode[], parentId: string | null, newFile: FileNode): FileNode[] {
  if (parentId === null) {
    return [...files, newFile]
  }

  return files.map((file) => {
    if (file.id === parentId && file.type === "folder") {
      return {
        ...file,
        children: [...(file.children || []), newFile],
      }
    }
    if (file.children) {
      return {
        ...file,
        children: addFileToTree(file.children, parentId, newFile),
      }
    }
    return file
  })
}

// Helper function to delete a file from the tree
function deleteFileFromTree(files: FileNode[], fileId: string): FileNode[] {
  return files
    .filter((file) => file.id !== fileId)
    .map((file) => {
      if (file.children) {
        return {
          ...file,
          children: deleteFileFromTree(file.children, fileId),
        }
      }
      return file
    })
}

// Helper function to check if targetId is a descendant of sourceId
function isDescendant(files: FileNode[], sourceId: string, targetId: string): boolean {
  const source = findFileInTree(files, sourceId)
  if (!source || source.type !== "folder" || !source.children) return false

  function checkChildren(children: FileNode[]): boolean {
    for (const child of children) {
      if (child.id === targetId) return true
      if (child.children && checkChildren(child.children)) return true
    }
    return false
  }

  return checkChildren(source.children)
}

// Helper function to extract a file from the tree (remove and return it)
function extractFileFromTree(files: FileNode[], fileId: string): { tree: FileNode[]; extracted: FileNode | null } {
  let extracted: FileNode | null = null

  const tree = files
    .filter((file) => {
      if (file.id === fileId) {
        extracted = file
        return false
      }
      return true
    })
    .map((file) => {
      if (file.children && !extracted) {
        const result = extractFileFromTree(file.children, fileId)
        if (result.extracted) {
          extracted = result.extracted
          return { ...file, children: result.tree }
        }
      }
      return file
    })

  return { tree, extracted }
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
      selectedFolderId: null,
      expandedFolders: new Set<string>(),
      editorContent: `// Welcome to CodeMark
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
      selectedRange: null,
      language: "typescript",

      setFiles: (files) => set({ files }),

      setActiveFile: (fileId) => {
        if (!fileId) {
          set({ activeFileId: null })
          return
        }
        const files = get().files
        const file = findFileInTree(files, fileId)
        if (file && file.type === "file") {
          set({
            activeFileId: fileId,
            editorContent: file.content || "",
            language: file.language || "typescript",
          })
        }
      },

      setSelectedFolder: (folderId) => set({ selectedFolderId: folderId }),

      toggleFolderExpanded: (folderId) => {
        const expandedFolders = new Set(get().expandedFolders)
        if (expandedFolders.has(folderId)) {
          expandedFolders.delete(folderId)
        } else {
          expandedFolders.add(folderId)
        }
        set({ expandedFolders })
      },

      setEditorContent: (content) => set({ editorContent: content }),

      setSelectedRange: (range) => set({ selectedRange: range }),

      setLanguage: (language) => set({ language }),

      updateFileContent: (fileId, content) => {
        const updateContentInTree = (files: FileNode[]): FileNode[] =>
          files.map((file) => {
            if (file.id === fileId) {
              return { ...file, content }
            }
            if (file.children) {
              return { ...file, children: updateContentInTree(file.children) }
            }
            return file
          })

        const files = updateContentInTree(get().files)
        set({ files, editorContent: content })
      },

      addFile: (name, parentId, type, content = "", language) => {
        const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const detectedLanguage = language || (type === "file" ? detectLanguage(name) : undefined)

        const newFile: FileNode = {
          id,
          name,
          type,
          ...(type === "file" && { content, language: detectedLanguage }),
          ...(type === "folder" && { children: [] }),
        }

        const files = addFileToTree(get().files, parentId, newFile)
        set({ files })

        // If adding a folder, expand it and set it as selected
        if (type === "folder") {
          const expandedFolders = new Set(get().expandedFolders)
          expandedFolders.add(id)
          set({ expandedFolders, selectedFolderId: id })
        }

        // If adding a file, set it as active
        if (type === "file") {
          set({
            activeFileId: id,
            editorContent: content,
            language: detectedLanguage || "plaintext",
          })
        }

        // If parent is a folder, make sure it's expanded
        if (parentId) {
          const expandedFolders = new Set(get().expandedFolders)
          expandedFolders.add(parentId)
          set({ expandedFolders })
        }
      },

      deleteFile: (fileId) => {
        const files = deleteFileFromTree(get().files, fileId)
        const state: Partial<EditorState> = { files }

        // If the deleted file was active, clear the active file
        if (get().activeFileId === fileId) {
          state.activeFileId = null
          state.editorContent = ""
        }

        // If the deleted file was the selected folder, clear it
        if (get().selectedFolderId === fileId) {
          state.selectedFolderId = null
        }

        set(state as EditorState)
      },

      moveFile: (fileId, targetFolderId) => {
        const currentFiles = get().files

        // Can't move to itself
        if (fileId === targetFolderId) return

        // Can't move a folder into its own descendant
        if (targetFolderId && isDescendant(currentFiles, fileId, targetFolderId)) return

        // Extract the file from its current location
        const { tree, extracted } = extractFileFromTree(currentFiles, fileId)
        if (!extracted) return

        // Add to target location
        const files = addFileToTree(tree, targetFolderId, extracted)
        set({ files })

        // If moving to a folder, expand it
        if (targetFolderId) {
          const expandedFolders = new Set(get().expandedFolders)
          expandedFolders.add(targetFolderId)
          set({ expandedFolders })
        }
      },

      renameFile: (fileId, newName) => {
        const renameInTree = (files: FileNode[]): FileNode[] =>
          files.map((file) => {
            if (file.id === fileId) {
              const updatedFile = { ...file, name: newName }
              // Update language if it's a file
              if (file.type === "file") {
                updatedFile.language = detectLanguage(newName)
              }
              return updatedFile
            }
            if (file.children) {
              return { ...file, children: renameInTree(file.children) }
            }
            return file
          })

        const files = renameInTree(get().files)
        set({ files })

        // Update language in editor if the renamed file is active
        if (get().activeFileId === fileId) {
          const file = findFileInTree(files, fileId)
          if (file && file.type === "file") {
            set({ language: file.language || "plaintext" })
          }
        }
      },
    }),
    {
      name: "codemark-editor-storage",
      partialize: (state) => ({
        files: state.files,
        activeFileId: state.activeFileId,
        expandedFolders: Array.from(state.expandedFolders),
        selectedFolderId: state.selectedFolderId,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<EditorState> & { expandedFolders?: string[] }
        return {
          ...currentState,
          ...persisted,
          expandedFolders: new Set(persisted.expandedFolders || []),
        }
      },
      onRehydrateStorage: () => (state) => {
        // After hydration, load the active file's content into the editor
        if (state && state.activeFileId) {
          const file = findFileInTree(state.files, state.activeFileId)
          if (file && file.type === "file") {
            state.setEditorContent(file.content || "")
            state.setLanguage(file.language || "typescript")
          }
        } else if (state && state.files.length > 0) {
          // No active file, select the first one
          state.setActiveFile(state.files[0].id)
        }
      },
    },
  ),
)
