"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useEditorStore } from "@/lib/stores/editor-store"
import {
  FileIcon,
  FolderIcon,
  FilePlus,
  FolderPlus,
  Upload,
  ChevronRight,
  ChevronDown,
  Trash2,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { FileNode } from "@/lib/types"

type CreateMode = "file" | "folder" | null

interface FileTreeItemProps {
  file: FileNode
  depth: number
  activeFileId: string | null
  selectedFolderId: string | null
  expandedFolders: Set<string>
  createMode: CreateMode
  createParentId: string | null
  draggedFileId: string | null
  dropTargetId: string | null
  renamingFileId: string | null
  onSelect: (file: FileNode) => void
  onToggleExpand: (folderId: string) => void
  onCreateSubmit: (name: string) => void
  onCreateCancel: () => void
  onDragStart: (fileId: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, fileId: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, targetId: string | null) => void
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void
  onRenameSubmit: (fileId: string, newName: string) => void
  onRenameCancel: () => void
}

function FileTreeItem({
  file,
  depth,
  activeFileId,
  selectedFolderId,
  expandedFolders,
  createMode,
  createParentId,
  draggedFileId,
  dropTargetId,
  renamingFileId,
  onSelect,
  onToggleExpand,
  onCreateSubmit,
  onCreateCancel,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel,
}: FileTreeItemProps) {
  const isFolder = file.type === "folder"
  const isExpanded = expandedFolders.has(file.id)
  const isSelected = file.type === "file" ? activeFileId === file.id : selectedFolderId === file.id
  const showInlineInput = createMode && createParentId === file.id
  const isDragging = draggedFileId === file.id
  const isDropTarget = dropTargetId === file.id && isFolder && draggedFileId !== file.id
  const isRenaming = renamingFileId === file.id

  const handleClick = () => {
    if (isFolder) {
      onToggleExpand(file.id)
    }
    onSelect(file)
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", file.id)
    onDragStart(file.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isFolder && draggedFileId !== file.id) {
      e.dataTransfer.dropEffect = "move"
      onDragOver(e, file.id)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isFolder) {
      onDrop(e, file.id)
    }
  }

  return (
    <div>
      {isRenaming ? (
        <RenameInput
          file={file}
          depth={depth}
          onSubmit={(newName) => onRenameSubmit(file.id, newName)}
          onCancel={onRenameCancel}
        />
      ) : (
        <button
          onClick={handleClick}
          onContextMenu={(e) => onContextMenu(e, file)}
          draggable
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={onDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex w-full items-center gap-1 py-1.5 text-sm transition-colors",
            "hover:bg-[#1a1a1a]",
            isSelected && "bg-[#1a1a1a] text-[#5B9EFF]",
            isDragging && "opacity-50",
            isDropTarget && "bg-[#1e3a5f] border border-[#5B9EFF] border-dashed"
          )}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          {isFolder && (
            <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-[#808080]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[#808080]" />
              )}
            </span>
          )}
          {!isFolder && <span className="w-4" />}
          {isFolder ? (
            <FolderIcon className="h-4 w-4 text-[#808080] flex-shrink-0" />
          ) : (
            <FileIcon className="h-4 w-4 text-[#808080] flex-shrink-0" />
          )}
          <span
            className={cn(
              "truncate text-[#b4b4b4]",
              isSelected && "text-[#5B9EFF]"
            )}
          >
            {file.name}
          </span>
        </button>
      )}

      {/* Inline input for creating new file/folder inside this folder */}
      {showInlineInput && (
        <InlineInput
          mode={createMode!}
          depth={depth + 1}
          onSubmit={onCreateSubmit}
          onCancel={onCreateCancel}
        />
      )}

      {/* Render children if folder is expanded */}
      {isFolder && isExpanded && file.children && (
        <div>
          {file.children.map((child) => (
            <FileTreeItem
              key={child.id}
              file={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              createMode={createMode}
              createParentId={createParentId}
              draggedFileId={draggedFileId}
              dropTargetId={dropTargetId}
              renamingFileId={renamingFileId}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreateSubmit={onCreateSubmit}
              onCreateCancel={onCreateCancel}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onContextMenu={onContextMenu}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface InlineInputProps {
  mode: "file" | "folder"
  depth: number
  onSubmit: (name: string) => void
  onCancel: () => void
}

function InlineInput({ mode, depth, onSubmit, onCancel }: InlineInputProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      onSubmit(value.trim())
    } else if (e.key === "Escape") {
      onCancel()
    }
  }

  const handleBlur = () => {
    if (value.trim()) {
      onSubmit(value.trim())
    } else {
      onCancel()
    }
  }

  return (
    <div
      className="flex items-center gap-1 py-1"
      style={{ paddingLeft: `${depth * 12 + 12}px` }}
    >
      {mode === "folder" ? (
        <ChevronRight className="h-3.5 w-3.5 text-[#808080] flex-shrink-0" />
      ) : (
        <span className="w-4" />
      )}
      {mode === "folder" ? (
        <FolderIcon className="h-4 w-4 text-[#808080] flex-shrink-0" />
      ) : (
        <FileIcon className="h-4 w-4 text-[#808080] flex-shrink-0" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="flex-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1.5 py-0.5 text-sm text-[#b4b4b4] outline-none focus:border-[#5B9EFF] min-w-0"
        placeholder={mode === "folder" ? "folder name" : "file name"}
      />
    </div>
  )
}

interface RenameInputProps {
  file: FileNode
  depth: number
  onSubmit: (newName: string) => void
  onCancel: () => void
}

function RenameInput({ file, depth, onSubmit, onCancel }: RenameInputProps) {
  const [value, setValue] = useState(file.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      onSubmit(value.trim())
    } else if (e.key === "Escape") {
      onCancel()
    }
  }

  const handleBlur = () => {
    if (value.trim() && value.trim() !== file.name) {
      onSubmit(value.trim())
    } else {
      onCancel()
    }
  }

  const isFolder = file.type === "folder"

  return (
    <div
      className="flex items-center gap-1 py-1"
      style={{ paddingLeft: `${depth * 12 + 12}px` }}
    >
      {isFolder ? (
        <ChevronRight className="h-3.5 w-3.5 text-[#808080] flex-shrink-0" />
      ) : (
        <span className="w-4" />
      )}
      {isFolder ? (
        <FolderIcon className="h-4 w-4 text-[#808080] flex-shrink-0" />
      ) : (
        <FileIcon className="h-4 w-4 text-[#808080] flex-shrink-0" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="flex-1 bg-[#1a1a1a] border border-[#5B9EFF] rounded px-1.5 py-0.5 text-sm text-[#b4b4b4] outline-none min-w-0"
      />
    </div>
  )
}

interface ContextMenuState {
  x: number
  y: number
  file: FileNode
}

export function FileExplorer() {
  const {
    files,
    activeFileId,
    selectedFolderId,
    expandedFolders,
    setActiveFile,
    setSelectedFolder,
    toggleFolderExpanded,
    addFile,
    deleteFile,
    moveFile,
    renameFile,
  } = useEditorStore()

  const [createMode, setCreateMode] = useState<CreateMode>(null)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [contextMenu])

  // Delete key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't trigger if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return
        }
        // Delete the selected file or folder
        const selectedId = activeFileId || selectedFolderId
        if (selectedId) {
          e.preventDefault()
          deleteFile(selectedId)
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [activeFileId, selectedFolderId, deleteFile])

  const handleSelect = useCallback(
    (file: FileNode) => {
      if (file.type === "file") {
        setActiveFile(file.id)
        setSelectedFolder(null)
      } else {
        setSelectedFolder(file.id)
      }
    },
    [setActiveFile, setSelectedFolder]
  )

  const handleToggleExpand = useCallback(
    (folderId: string) => {
      toggleFolderExpanded(folderId)
    },
    [toggleFolderExpanded]
  )

  const startCreate = (mode: "file" | "folder") => {
    const parentId = selectedFolderId
    setCreateMode(mode)
    setCreateParentId(parentId)

    if (parentId) {
      const isExpanded = expandedFolders.has(parentId)
      if (!isExpanded) {
        toggleFolderExpanded(parentId)
      }
    }
  }

  const handleCreateSubmit = (name: string) => {
    if (createMode) {
      addFile(name, createParentId, createMode)
    }
    setCreateMode(null)
    setCreateParentId(null)
  }

  const handleCreateCancel = () => {
    setCreateMode(null)
    setCreateParentId(null)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const importedFiles = e.target.files
    if (!importedFiles) return

    for (const file of Array.from(importedFiles)) {
      const content = await file.text()
      addFile(file.name, selectedFolderId, "file", content)
    }

    e.target.value = ""
  }

  // Drag and drop handlers
  const handleDragStart = useCallback((fileId: string) => {
    setDraggedFileId(fileId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedFileId(null)
    setDropTargetId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, fileId: string) => {
    e.preventDefault()
    setDropTargetId(fileId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string | null) => {
      e.preventDefault()
      if (draggedFileId && draggedFileId !== targetId) {
        moveFile(draggedFileId, targetId)
      }
      setDraggedFileId(null)
      setDropTargetId(null)
    },
    [draggedFileId, moveFile]
  )

  // Handle drop on root (file tree container)
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedFileId) {
      setDropTargetId("root")
    }
  }

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedFileId) {
      moveFile(draggedFileId, null) // null = root level
    }
    setDraggedFileId(null)
    setDropTargetId(null)
  }

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileNode) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }, [])

  const handleDelete = useCallback(() => {
    if (contextMenu) {
      deleteFile(contextMenu.file.id)
      setContextMenu(null)
    }
  }, [contextMenu, deleteFile])

  const handleStartRename = useCallback(() => {
    if (contextMenu) {
      setRenamingFileId(contextMenu.file.id)
      setContextMenu(null)
    }
  }, [contextMenu])

  const handleRenameSubmit = useCallback(
    (fileId: string, newName: string) => {
      renameFile(fileId, newName)
      setRenamingFileId(null)
    },
    [renameFile]
  )

  const handleRenameCancel = useCallback(() => {
    setRenamingFileId(null)
  }, [])

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col bg-[#0d0d0d] border-r border-[#2a2a2a] relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a2a2a]">
        <span className="text-xs font-medium text-[#808080] uppercase tracking-wide">
          Files
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => startCreate("file")}
            className="p-1 rounded hover:bg-[#2a2a2a] transition-colors"
            title="New File"
          >
            <FilePlus className="h-4 w-4 text-[#808080] hover:text-[#b4b4b4]" />
          </button>
          <button
            onClick={() => startCreate("folder")}
            className="p-1 rounded hover:bg-[#2a2a2a] transition-colors"
            title="New Folder"
          >
            <FolderPlus className="h-4 w-4 text-[#808080] hover:text-[#b4b4b4]" />
          </button>
          <button
            onClick={handleImportClick}
            className="p-1 rounded hover:bg-[#2a2a2a] transition-colors"
            title="Import Files"
          >
            <Upload className="h-4 w-4 text-[#808080] hover:text-[#b4b4b4]" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileImport}
            className="hidden"
          />
        </div>
      </div>

      {/* File tree */}
      <div
        className={cn(
          "flex-1 overflow-y-auto py-1",
          dropTargetId === "root" && "bg-[#1e3a5f]/30"
        )}
        onDragOver={handleRootDragOver}
        onDrop={handleRootDrop}
        onDragLeave={handleDragLeave}
      >
        {/* Root level inline input */}
        {createMode && createParentId === null && (
          <InlineInput
            mode={createMode}
            depth={0}
            onSubmit={handleCreateSubmit}
            onCancel={handleCreateCancel}
          />
        )}

        {files.map((file) => (
          <FileTreeItem
            key={file.id}
            file={file}
            depth={0}
            activeFileId={activeFileId}
            selectedFolderId={selectedFolderId}
            expandedFolders={expandedFolders}
            createMode={createMode}
            createParentId={createParentId}
            draggedFileId={draggedFileId}
            dropTargetId={dropTargetId}
            renamingFileId={renamingFileId}
            onSelect={handleSelect}
            onToggleExpand={handleToggleExpand}
            onCreateSubmit={handleCreateSubmit}
            onCreateCancel={handleCreateCancel}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={handleContextMenu}
            onRenameSubmit={handleRenameSubmit}
            onRenameCancel={handleRenameCancel}
          />
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#1a1a1a] border border-[#3a3a3a] rounded-md shadow-lg py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleStartRename}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#b4b4b4] hover:bg-[#2a2a2a] transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Rename
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-400 hover:bg-[#2a2a2a] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
