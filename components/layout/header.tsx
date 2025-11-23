"use client"

import { useEditorStore } from "@/lib/stores/editor-store"
import { CodeIcon, SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  const { activeFileId, files } = useEditorStore()
  const activeFile = files.find((f) => f.id === activeFileId)

  return (
    <header className="flex h-12 items-center justify-between border-b border-[#2a2a2a] bg-[#0d0d0d] px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <CodeIcon className="h-5 w-5 text-[#5B9EFF]" />
          <span className="text-sm font-semibold text-[#b4b4b4]">CodeMark</span>
        </div>

        {activeFile && (
          <>
            <span className="text-[#4a4a4a]">/</span>
            <span className="text-sm text-[#808080]">{activeFile.name}</span>
          </>
        )}
      </div>

      <Button variant="ghost" size="icon" className="h-8 w-8">
        <SettingsIcon className="h-4 w-4 text-[#808080]" />
      </Button>
    </header>
  )
}
