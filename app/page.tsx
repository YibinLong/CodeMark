"use client"

import { useEffect } from "react"
import { AppShell } from "@/components/AppShell"
import { ErrorBoundary } from "@/components/ErrorBoundary"
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
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  )
}
