import { create } from "zustand"

interface UIState {
  chatPanelOpen: boolean
  fileExplorerOpen: boolean
  isLoading: boolean
  selectedModel: string

  // Actions
  setChatPanelOpen: (open: boolean) => void
  setFileExplorerOpen: (open: boolean) => void
  setIsLoading: (loading: boolean) => void
  setSelectedModel: (model: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  chatPanelOpen: true,
  fileExplorerOpen: true,
  isLoading: false,
  selectedModel: "gpt-4",

  setChatPanelOpen: (open) => set({ chatPanelOpen: open }),
  setFileExplorerOpen: (open) => set({ fileExplorerOpen: open }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSelectedModel: (model) => set({ selectedModel: model }),
}))
