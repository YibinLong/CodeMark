"use client"

import { useEditorStore } from "@/lib/stores/editor-store"
import { FileIcon, FolderIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function FileExplorer() {
  const { files, activeFileId, setActiveFile } = useEditorStore()

  return (
    <div className="flex h-full flex-col bg-[#0d0d0d] border-r border-[#2a2a2a]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm font-medium text-[#b4b4b4]">FILES</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => setActiveFile(file.id)}
            className={cn(
              "flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors",
              "hover:bg-[#1a1a1a]",
              activeFileId === file.id && "bg-[#1a1a1a] text-[#5B9EFF]",
            )}
          >
            {file.type === "folder" ? (
              <FolderIcon className="h-4 w-4 text-[#808080]" />
            ) : (
              <FileIcon className="h-4 w-4 text-[#808080]" />
            )}
            <span className={cn("text-[#b4b4b4]", activeFileId === file.id && "text-[#5B9EFF]")}>{file.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
