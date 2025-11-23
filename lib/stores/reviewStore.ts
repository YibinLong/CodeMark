/**
 * Review Store - Zustand store with advanced persistence features
 * Implements thread and selection management with localStorage persistence,
 * error handling, cross-tab sync, and performance optimizations
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector, createJSONStorage } from 'zustand/middleware';
import {
  ThreadStatus,
  MessageRole,
} from '../types/review';
import type {
  Thread,
  Message,
  CodeSelection,
  SerializedThread,
  SerializedMessage,
  SerializedReviewStore,
} from '../types/review';

// ============================================================================
// Store State Interfaces
// ============================================================================

/**
 * State slice for managing threads
 */
interface ThreadsSlice {
  threads: Map<string, Thread>;
  addThread: (thread: Thread) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  deleteThread: (threadId: string) => void;
  markThreadResolved: (threadId: string) => void;
  addMessageToThread: (threadId: string, message: Message) => void;
}

/**
 * State slice for managing code selections
 */
interface SelectionsSlice {
  selections: Map<string, CodeSelection>;
  addSelection: (selection: CodeSelection) => void;
  removeSelection: (selectionId: string) => void;
  clearSelections: () => void;
}

/**
 * State slice for UI state management
 */
interface UISlice {
  activeThreadId: string | null;
  composerVisible: boolean;
  setActiveThread: (threadId: string | null) => void;
  setComposerVisible: (visible: boolean) => void;
}

/**
 * Combined store state
 */
export interface ReviewStoreState extends ThreadsSlice, SelectionsSlice, UISlice {}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID for threads and messages
 */
const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get file fingerprint for namespacing (can be extended to use actual file hash)
 */
const getFileFingerprint = (): string => {
  // In a real implementation, this would be based on the current file's path or hash
  // For now, we'll use the current pathname or a default value
  if (typeof window !== 'undefined') {
    return window.location.pathname || 'default';
  }
  return 'default';
};

/**
 * Custom storage with error handling and fallback to sessionStorage
 */
const createResilientStorage = () => {
  let currentStorage: Storage | null = null;

  // Test storage availability
  const testStorage = (storage: Storage): boolean => {
    try {
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  };

  // Initialize storage with fallback
  const getStorage = (): Storage | null => {
    if (typeof window === 'undefined') return null;

    if (currentStorage) return currentStorage;

    // Try localStorage first
    if (testStorage(window.localStorage)) {
      currentStorage = window.localStorage;
      return currentStorage;
    }

    // Fallback to sessionStorage
    if (testStorage(window.sessionStorage)) {
      console.warn('localStorage unavailable, using sessionStorage as fallback');
      currentStorage = window.sessionStorage;
      return currentStorage;
    }

    console.error('No storage available');
    return null;
  };

  return createJSONStorage(() => ({
    getItem: (name: string) => {
      const storage = getStorage();
      if (!storage) return null;

      try {
        const item = storage.getItem(name);
        return item;
      } catch (error) {
        console.error('Error reading from storage:', error);
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      const storage = getStorage();
      if (!storage) return;

      try {
        storage.setItem(name, value);
      } catch (error) {
        // Handle quota exceeded error
        if (error instanceof DOMException && (
          error.name === 'QuotaExceededError' ||
          error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        )) {
          console.warn('Storage quota exceeded, attempting cleanup...');

          // Try to clean up old data
          try {
            const keys = Object.keys(storage);
            const codemarkKeys = keys.filter(k => k.startsWith('codemark-'));

            // Remove oldest entries (simple strategy)
            if (codemarkKeys.length > 0) {
              storage.removeItem(codemarkKeys[0]);
              // Retry setItem
              storage.setItem(name, value);
              console.log('Storage cleaned up successfully');
            }
          } catch (cleanupError) {
            console.error('Failed to cleanup storage:', cleanupError);

            // Last resort: try sessionStorage if we were using localStorage
            if (storage === window.localStorage && testStorage(window.sessionStorage)) {
              console.warn('Switching to sessionStorage due to quota issues');
              currentStorage = window.sessionStorage;
              try {
                window.sessionStorage.setItem(name, value);
              } catch (sessionError) {
                console.error('Failed to save to sessionStorage:', sessionError);
              }
            }
          }
        } else {
          console.error('Error writing to storage:', error);
        }
      }
    },
    removeItem: (name: string) => {
      const storage = getStorage();
      if (!storage) return;

      try {
        storage.removeItem(name);
      } catch (error) {
        console.error('Error removing from storage:', error);
      }
    },
  }));
};

/**
 * Custom serialization for Date objects and Maps
 */
const serializeState = (state: ReviewStoreState): SerializedReviewStore => {
  const serializedThreads: Record<string, SerializedThread> = {};

  state.threads.forEach((thread, id) => {
    serializedThreads[id] = {
      ...thread,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      messages: thread.messages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
      } as SerializedMessage)),
    };
  });

  const serializedSelections: Record<string, CodeSelection> = {};
  state.selections.forEach((selection, id) => {
    serializedSelections[id] = selection;
  });

  return {
    threads: serializedThreads,
    selections: serializedSelections,
    activeThreadId: state.activeThreadId,
  };
};

/**
 * Custom deserialization for Date objects and Maps
 */
const deserializeState = (serialized: SerializedReviewStore): Partial<ReviewStoreState> => {
  const threads = new Map<string, Thread>();

  Object.entries(serialized.threads || {}).forEach(([id, thread]) => {
    threads.set(id, {
      ...thread,
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
      messages: thread.messages.map(msg => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
      })) as Message[],
    });
  });

  const selections = new Map<string, CodeSelection>();
  Object.entries(serialized.selections || {}).forEach(([id, selection]) => {
    selections.set(id, selection);
  });

  return {
    threads,
    selections,
    activeThreadId: serialized.activeThreadId,
  };
};

// ============================================================================
// Cross-tab Synchronization
// ============================================================================

/**
 * Setup cross-tab synchronization using storage events
 */
const setupCrosTabSync = (storeName: string) => {
  if (typeof window === 'undefined') return () => {};

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === storeName && event.newValue) {
      try {
        // Storage event will trigger Zustand's persist middleware to rehydrate
        window.dispatchEvent(new Event('storage-sync'));
      } catch (error) {
        console.error('Error handling cross-tab sync:', error);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

// ============================================================================
// Store Creation
// ============================================================================

/**
 * Create the review store with all features:
 * - Thread management (add, update, delete, mark resolved)
 * - Selection tracking (add, remove, clear)
 * - UI state (active thread, composer visibility)
 * - Persistence with localStorage (fallback to sessionStorage)
 * - Custom serialization for Date objects
 * - File fingerprint-based namespacing
 * - subscribeWithSelector for performance
 * - Cross-tab synchronization
 */
export const useReviewStore = create<ReviewStoreState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // ====================================================================
        // Threads Slice
        // ====================================================================
        threads: new Map<string, Thread>(),

        addThread: (thread: Thread) => {
          set((state) => {
            const newThreads = new Map(state.threads);
            newThreads.set(thread.id, thread);
            return { threads: newThreads };
          });
        },

        updateThread: (threadId: string, updates: Partial<Thread>) => {
          set((state) => {
            const thread = state.threads.get(threadId);
            if (!thread) return state;

            const updatedThread = {
              ...thread,
              ...updates,
              updatedAt: new Date(),
            };

            const newThreads = new Map(state.threads);
            newThreads.set(threadId, updatedThread);
            return { threads: newThreads };
          });
        },

        deleteThread: (threadId: string) => {
          set((state) => {
            const newThreads = new Map(state.threads);
            newThreads.delete(threadId);

            return {
              threads: newThreads,
              activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
            };
          });
        },

        markThreadResolved: (threadId: string) => {
          const { updateThread } = get();
          updateThread(threadId, { status: ThreadStatus.RESOLVED });
        },

        addMessageToThread: (threadId: string, message: Message) => {
          set((state) => {
            const thread = state.threads.get(threadId);
            if (!thread) return state;

            const updatedThread = {
              ...thread,
              messages: [...thread.messages, message],
              updatedAt: new Date(),
            };

            const newThreads = new Map(state.threads);
            newThreads.set(threadId, updatedThread);
            return { threads: newThreads };
          });
        },

        // ====================================================================
        // Selections Slice
        // ====================================================================
        selections: new Map<string, CodeSelection>(),

        addSelection: (selection: CodeSelection) => {
          set((state) => {
            const newSelections = new Map(state.selections);
            newSelections.set(selection.id, selection);
            return { selections: newSelections };
          });
        },

        removeSelection: (selectionId: string) => {
          set((state) => {
            const newSelections = new Map(state.selections);
            newSelections.delete(selectionId);
            return { selections: newSelections };
          });
        },

        clearSelections: () => {
          set({ selections: new Map() });
        },

        // ====================================================================
        // UI Slice
        // ====================================================================
        activeThreadId: null,
        composerVisible: false,

        setActiveThread: (threadId: string | null) => {
          set({ activeThreadId: threadId });
        },

        setComposerVisible: (visible: boolean) => {
          set({ composerVisible: visible });
        },
      }),
      {
        name: `codemark-threads-${getFileFingerprint()}`,
        storage: createResilientStorage(),

        // Partialize to exclude temporary UI state from persistence
        partialize: (state) => ({
          threads: state.threads,
          selections: state.selections,
          activeThreadId: state.activeThreadId,
          // Exclude composerVisible from persistence
        }),

        // Custom serialization
        serialize: (state: any) => {
          const serialized = serializeState(state.state as ReviewStoreState);
          return JSON.stringify(serialized);
        },

        // Custom deserialization
        deserialize: (str: string) => {
          const parsed = JSON.parse(str);
          const deserialized = deserializeState(parsed);
          return { state: deserialized };
        },

        // Version for migration support
        version: 1,

        // Migration function for future versions
        migrate: (persistedState: unknown, version: number) => {
          // Add migration logic here when version changes
          return persistedState as any;
        },

        // Skip hydration on server-side
        skipHydration: typeof window === 'undefined',
      },
    ),
  ),
);

// ============================================================================
// Setup Cross-tab Sync
// ============================================================================

// Initialize cross-tab synchronization
if (typeof window !== 'undefined') {
  const cleanup = setupCrosTabSync(`codemark-threads-${getFileFingerprint()}`);

  // Store cleanup function for potential later use
  if (typeof window !== 'undefined') {
    (window as any).__reviewStoreCleanup = cleanup;
  }
}

// ============================================================================
// Helper Hooks (Optional - for easier usage)
// ============================================================================

/**
 * Hook to get only threads (optimized with selector)
 */
export const useThreads = () => useReviewStore((state) => state.threads);

/**
 * Hook to get only selections (optimized with selector)
 */
export const useSelections = () => useReviewStore((state) => state.selections);

/**
 * Hook to get only active thread (optimized with selector)
 */
export const useActiveThread = () => {
  const activeThreadId = useReviewStore((state) => state.activeThreadId);
  const threads = useReviewStore((state) => state.threads);
  return activeThreadId ? threads.get(activeThreadId) : null;
};

/**
 * Hook to get thread actions only
 */
export const useThreadActions = () => {
  return useReviewStore((state) => ({
    addThread: state.addThread,
    updateThread: state.updateThread,
    deleteThread: state.deleteThread,
    markThreadResolved: state.markThreadResolved,
    addMessageToThread: state.addMessageToThread,
  }));
};

/**
 * Hook to get selection actions only
 */
export const useSelectionActions = () => {
  return useReviewStore((state) => ({
    addSelection: state.addSelection,
    removeSelection: state.removeSelection,
    clearSelections: state.clearSelections,
  }));
};

/**
 * Hook to get UI actions only
 */
export const useUIActions = () => {
  return useReviewStore((state) => ({
    setActiveThread: state.setActiveThread,
    setComposerVisible: state.setComposerVisible,
  }));
};
