"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { FileExplorer } from "@/components/layout/file-explorer"
import { ChatPanel } from "@/components/layout/chat-panel"
import { Header } from "@/components/layout/header"
import { LoadingSkeleton } from "@/components/LoadingSkeleton"

// Code splitting: Load Monaco Editor dynamically to reduce initial bundle size
const MonacoEditorWrapper = dynamic(
  () => import("@/components/editor/monaco-editor-wrapper").then((mod) => mod.MonacoEditorWrapper),
  {
    ssr: false,
    loading: () => <LoadingSkeleton variant="editor" />,
  }
)

export function AppShell() {
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true)
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key === 'b') {
        e.preventDefault()
        setLeftSidebarVisible((prev) => !prev)
      }

      if (isMod && e.key === 'k') {
        e.preventDefault()
        // TODO: Implement command palette
        console.log('Command palette triggered')
      }

      if (isMod && e.shiftKey && e.key === 'b') {
        e.preventDefault()
        setRightSidebarVisible((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-[#0d0d0d]">
      <Header />

      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 overflow-hidden"
        role="main"
        aria-label="Application workspace"
      >
        {/* Left Sidebar - File Explorer */}
        {leftSidebarVisible && (
          <>
            <ResizablePanel
              id="file-explorer"
              defaultSize={20}
              minSize={15}
              maxSize={30}
              className="min-w-[200px]"
              aria-label="File explorer sidebar"
            >
              <FileExplorer />
            </ResizablePanel>

            <ResizableHandle withHandle aria-label="Resize file explorer" />
          </>
        )}

        {/* Main Editor Area */}
        <ResizablePanel
          id="editor"
          defaultSize={leftSidebarVisible && rightSidebarVisible ? 50 : leftSidebarVisible || rightSidebarVisible ? 70 : 100}
          minSize={30}
          className="min-w-[400px]"
          aria-label="Code editor"
        >
          <MonacoEditorWrapper />
        </ResizablePanel>

        {/* Right Sidebar - Chat Panel */}
        {rightSidebarVisible && (
          <>
            <ResizableHandle withHandle aria-label="Resize chat panel" />

            <ResizablePanel
              id="chat-panel"
              defaultSize={30}
              minSize={20}
              maxSize={40}
              className="min-w-[300px]"
              aria-label="AI chat panel"
            >
              <ChatPanel />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}
