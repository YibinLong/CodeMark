"use client"

import { useEffect } from "react"
import { FileExplorer } from "@/components/layout/file-explorer"
import { MonacoEditorWrapper } from "@/components/editor/monaco-editor-wrapper"
import { ChatPanel } from "@/components/layout/chat-panel"
import { Header } from "@/components/layout/header"
import { useEditorStore } from "@/lib/stores/editor-store"

export default function HomePage() {
  const { activeFileId, setActiveFile, files } = useEditorStore()

  // Set initial active file
  useEffect(() => {
    if (!activeFileId && files.length > 0) {
      setActiveFile(files[0].id)
    }
  }, [activeFileId, files, setActiveFile])

  return (
    <div className="flex h-screen flex-col bg-[#0d0d0d]">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[280px] shrink-0">
          <FileExplorer />
        </div>

        <div className="flex-1">
          <MonacoEditorWrapper />
        </div>

        <div className="w-[380px] shrink-0">
          <ChatPanel />
        </div>
      </div>
    </div>
  )
}
