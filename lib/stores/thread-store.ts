import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Thread, Message, CodeRange } from "../types"

interface ThreadState {
  threads: Map<string, Thread>
  activeThreadId: string | null
  openThreadIds: string[] // Added openThreadIds for tabs

  // Actions
  createThread: (
    fileId: string | undefined,
    range: CodeRange | undefined,
    initialMessage: string,
    code: string,
    language: string,
  ) => string
  openThread: (threadId: string) => void
  closeThread: (threadId: string) => void
  createChat: () => string
  addMessage: (threadId: string, message: Omit<Message, "id" | "timestamp">) => void
  updateMessage: (threadId: string, messageId: string, updates: Partial<Message>) => void
  setActiveThread: (threadId: string | null) => void
  resolveThread: (threadId: string) => void
  unresolveThread: (threadId: string) => void
  deleteThread: (threadId: string) => void
  getThreadsByFile: (fileId: string) => Thread[]
  getThreadByRange: (fileId: string, line: number) => Thread | undefined
}

export const useThreadStore = create<ThreadState>()(
  persist(
    (set, get) => ({
      threads: new Map(),
      activeThreadId: null,
      openThreadIds: [], // Initial state

      createThread: (fileId, range, initialMessage, code, language) => {
        const threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const title = initialMessage.slice(0, 30) + (initialMessage.length > 30 ? "..." : "")

        const thread: Thread = {
          id: threadId,
          fileId,
          range,
          messages: [
            {
              id: messageId,
              role: "user",
              content: initialMessage,
              codeContext: {
                code,
                language,
                range,
              },
              timestamp: new Date(),
            },
          ],
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          title,
        }

        set((state) => {
          const newThreads = new Map(state.threads)
          newThreads.set(threadId, thread)
          const newOpenIds = [...state.openThreadIds, threadId]
          return { threads: newThreads, activeThreadId: threadId, openThreadIds: newOpenIds }
        })

        return threadId
      },

      createChat: () => {
        const threadId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const thread: Thread = {
          id: threadId,
          messages: [],
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          title: "New Chat",
        }

        set((state) => {
          const newThreads = new Map(state.threads)
          newThreads.set(threadId, thread)
          const newOpenIds = [...state.openThreadIds, threadId]
          return { threads: newThreads, activeThreadId: threadId, openThreadIds: newOpenIds }
        })

        return threadId
      },

      openThread: (threadId) => {
        set((state) => {
          if (state.openThreadIds.includes(threadId)) {
            return { activeThreadId: threadId }
          }
          return {
            openThreadIds: [...state.openThreadIds, threadId],
            activeThreadId: threadId,
          }
        })
      },

      closeThread: (threadId) => {
        set((state) => {
          const newOpenIds = state.openThreadIds.filter((id) => id !== threadId)
          let newActiveId = state.activeThreadId

          if (state.activeThreadId === threadId) {
            newActiveId = newOpenIds.length > 0 ? newOpenIds[newOpenIds.length - 1] : null
          }

          return {
            openThreadIds: newOpenIds,
            activeThreadId: newActiveId,
          }
        })
      },

      addMessage: (threadId, message) => {
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        set((state) => {
          const thread = state.threads.get(threadId)
          if (!thread) return state

          let title = thread.title
          if (thread.messages.length === 0 && message.role === "user") {
            title = message.content.slice(0, 30) + (message.content.length > 30 ? "..." : "")
          }

          const newThread = {
            ...thread,
            title,
            messages: [
              ...thread.messages,
              {
                ...message,
                id: messageId,
                timestamp: new Date(),
              },
            ],
            updatedAt: new Date(),
          }

          const newThreads = new Map(state.threads)
          newThreads.set(threadId, newThread)
          return { threads: newThreads }
        })
      },

      updateMessage: (threadId, messageId, updates) => {
        set((state) => {
          const thread = state.threads.get(threadId)
          if (!thread) return state

          const newThread = {
            ...thread,
            messages: thread.messages.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg)),
            updatedAt: new Date(),
          }

          const newThreads = new Map(state.threads)
          newThreads.set(threadId, newThread)
          return { threads: newThreads }
        })
      },

      setActiveThread: (threadId) => set({ activeThreadId: threadId }),

      resolveThread: (threadId) => {
        set((state) => {
          const thread = state.threads.get(threadId)
          if (!thread) return state

          const newThread = { ...thread, status: "resolved" as const }
          const newThreads = new Map(state.threads)
          newThreads.set(threadId, newThread)
          return { threads: newThreads }
        })
      },

      unresolveThread: (threadId) => {
        set((state) => {
          const thread = state.threads.get(threadId)
          if (!thread) return state

          const newThread = { ...thread, status: "active" as const }
          const newThreads = new Map(state.threads)
          newThreads.set(threadId, newThread)
          return { threads: newThreads }
        })
      },

      deleteThread: (threadId) => {
        set((state) => {
          const newThreads = new Map(state.threads)
          newThreads.delete(threadId)
          const newOpenIds = state.openThreadIds.filter((id) => id !== threadId)

          return {
            threads: newThreads,
            activeThreadId:
              state.activeThreadId === threadId
                ? newOpenIds.length > 0
                  ? newOpenIds[newOpenIds.length - 1]
                  : null
                : state.activeThreadId,
            openThreadIds: newOpenIds,
          }
        })
      },

      getThreadsByFile: (fileId) => {
        return Array.from(get().threads.values()).filter((thread) => thread.fileId === fileId)
      },

      getThreadByRange: (fileId, line) => {
        return Array.from(get().threads.values()).find(
          (thread) =>
            thread.fileId === fileId &&
            thread.range && // Check for range existence
            line >= thread.range.startLine &&
            line <= thread.range.endLine,
        )
      },
    }),
    {
      name: "codemark-threads-storage",
      // Custom serialization for Map
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const data = JSON.parse(str)
          return {
            state: {
              ...data.state,
              threads: new Map(Object.entries(data.state.threads || {})),
            },
          }
        },
        setItem: (name, value) => {
          const data = {
            state: {
              ...value.state,
              threads: Object.fromEntries(value.state.threads),
            },
          }
          localStorage.setItem(name, JSON.stringify(data))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
)
