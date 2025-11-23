"use client"

import { useThreadStore } from "@/lib/stores/thread-store"
import { useEditorStore } from "@/lib/stores/editor-store"
import { MessageSquareIcon, CheckCircleIcon, TrashIcon, Search, Filter, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useState, useMemo, useCallback } from "react"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { ThreadListItem } from "./thread-list-item"

type FilterStatus = "all" | "active" | "resolved"
type SortOption = "date-desc" | "date-asc" | "status" | "messages"

export function ThreadList() {
  const { threads, activeThreadId, setActiveThread, resolveThread, unresolveThread, deleteThread } = useThreadStore()
  const { activeFileId } = useEditorStore()

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [sortOption, setSortOption] = useState<SortOption>("date-desc")
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Filter and sort threads
  const filteredAndSortedThreads = useMemo(() => {
    let result = Array.from(threads.values()).filter((thread) => thread.fileId === activeFileId)

    // Apply status filter
    if (filterStatus !== "all") {
      result = result.filter((thread) => thread.status === filterStatus)
    }

    // Apply search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      result = result.filter(
        (thread) =>
          thread.messages[0]?.content.toLowerCase().includes(query) ||
          thread.title?.toLowerCase().includes(query),
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case "date-desc":
          return b.updatedAt.getTime() - a.updatedAt.getTime()
        case "date-asc":
          return a.updatedAt.getTime() - b.updatedAt.getTime()
        case "status":
          return a.status.localeCompare(b.status)
        case "messages":
          return b.messages.length - a.messages.length
        default:
          return 0
      }
    })

    return result
  }, [threads, activeFileId, filterStatus, debouncedSearch, sortOption])

  const toggleSort = useCallback(() => {
    setSortOption((prev) => {
      const options: SortOption[] = ["date-desc", "date-asc", "status", "messages"]
      const currentIndex = options.indexOf(prev)
      return options[(currentIndex + 1) % options.length]
    })
  }, [])

  const getSortLabel = () => {
    switch (sortOption) {
      case "date-desc":
        return "Latest"
      case "date-asc":
        return "Oldest"
      case "status":
        return "Status"
      case "messages":
        return "Messages"
    }
  }

  if (Array.from(threads.values()).filter((thread) => thread.fileId === activeFileId).length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <MessageSquareIcon className="mx-auto h-12 w-12 text-[#4a4a4a]" />
          <p className="text-sm text-[#808080]">No threads yet</p>
          <p className="text-xs text-[#606060]">Select code and right-click to start a review</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" role="region" aria-label="Thread list">
      <div className="flex flex-col gap-2 px-4 py-3 border-b border-[#2a2a2a]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#b4b4b4]" id="thread-list-heading">
            THREADS ({filteredAndSortedThreads.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSort}
            className="h-6 text-xs text-[#808080] hover:text-[#b4b4b4]"
            aria-label={`Sort by ${getSortLabel()}`}
          >
            <ArrowUpDown className="mr-1 h-3 w-3" aria-hidden="true" />
            {getSortLabel()}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#808080]" aria-hidden="true" />
          <Input
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-7 text-xs bg-[#1a1a1a] border-[#2a2a2a] text-[#b4b4b4] placeholder:text-[#606060]"
            aria-label="Search threads"
            role="searchbox"
          />
        </div>

        <div className="flex gap-2" role="group" aria-label="Filter threads by status">
          <Button
            variant={filterStatus === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterStatus("all")}
            className={cn(
              "h-6 text-xs flex-1",
              filterStatus === "all" ? "bg-[#5B9EFF] text-white" : "text-[#808080] hover:text-[#b4b4b4]",
            )}
            aria-label="Show all threads"
            aria-pressed={filterStatus === "all"}
          >
            All
          </Button>
          <Button
            variant={filterStatus === "active" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterStatus("active")}
            className={cn(
              "h-6 text-xs flex-1",
              filterStatus === "active" ? "bg-[#5B9EFF] text-white" : "text-[#808080] hover:text-[#b4b4b4]",
            )}
            aria-label="Show active threads"
            aria-pressed={filterStatus === "active"}
          >
            Open
          </Button>
          <Button
            variant={filterStatus === "resolved" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterStatus("resolved")}
            className={cn(
              "h-6 text-xs flex-1",
              filterStatus === "resolved" ? "bg-[#5B9EFF] text-white" : "text-[#808080] hover:text-[#b4b4b4]",
            )}
            aria-label="Show resolved threads"
            aria-pressed={filterStatus === "resolved"}
          >
            Resolved
          </Button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        role="list"
        aria-labelledby="thread-list-heading"
        aria-live="polite"
        aria-atomic="false"
      >
        {filteredAndSortedThreads.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center" role="status">
            <div className="space-y-2">
              <Filter className="mx-auto h-8 w-8 text-[#4a4a4a]" aria-hidden="true" />
              <p className="text-sm text-[#808080]">No threads match your filters</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterStatus("all")
                  setSearchQuery("")
                }}
                className="text-xs text-[#5B9EFF] hover:text-[#7FB3FF]"
                aria-label="Clear all filters"
              >
                Clear filters
              </Button>
            </div>
          </div>
        ) : (
          filteredAndSortedThreads.map((thread) => (
            <ThreadListItem
              key={thread.id}
              thread={thread}
              isActive={activeThreadId === thread.id}
              onSelect={() => setActiveThread(thread.id)}
              onResolve={() => resolveThread(thread.id)}
              onUnresolve={() => unresolveThread(thread.id)}
              onDelete={() => deleteThread(thread.id)}
              enableLazyLoad={filteredAndSortedThreads.length > 20}
            />
          ))
        )}
      </div>
    </div>
  )
}
