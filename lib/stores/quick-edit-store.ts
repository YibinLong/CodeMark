import { create } from "zustand"
import type { CodeRange } from "../types"

export type QuickEditMode = "edit" | "question"

export interface QAMessage {
  role: "user" | "assistant"
  content: string
}

interface QuickEditState {
  // Popup state
  isOpen: boolean
  mode: QuickEditMode

  // Selection context
  selection: CodeRange | null
  selectedText: string
  fileId: string | null
  language: string

  // Edit mode state
  editPrompt: string
  generatedCode: string | null
  originalCode: string | null
  isGenerating: boolean
  showDiff: boolean

  // Question mode state
  qaHistory: QAMessage[]
  currentQuestion: string
  isAnswering: boolean

  // Actions
  openPopup: (
    selection: CodeRange,
    text: string,
    fileId: string,
    language: string
  ) => void
  closePopup: () => void
  setMode: (mode: QuickEditMode) => void

  // Edit mode actions
  setEditPrompt: (prompt: string) => void
  setGeneratedCode: (code: string | null) => void
  setIsGenerating: (isGenerating: boolean) => void
  setShowDiff: (show: boolean) => void
  acceptEdit: () => void
  rejectEdit: () => void

  // Question mode actions
  setCurrentQuestion: (question: string) => void
  addQAMessage: (message: QAMessage) => void
  setIsAnswering: (isAnswering: boolean) => void
  clearQAHistory: () => void
}

export const useQuickEditStore = create<QuickEditState>((set, get) => ({
  // Initial state
  isOpen: false,
  mode: "edit",

  selection: null,
  selectedText: "",
  fileId: null,
  language: "typescript",

  editPrompt: "",
  generatedCode: null,
  originalCode: null,
  isGenerating: false,
  showDiff: false,

  qaHistory: [],
  currentQuestion: "",
  isAnswering: false,

  // Actions
  openPopup: (selection, text, fileId, language) => {
    set({
      isOpen: true,
      selection,
      selectedText: text,
      originalCode: text,
      fileId,
      language,
      // Reset state
      mode: "edit",
      editPrompt: "",
      generatedCode: null,
      isGenerating: false,
      showDiff: false,
      qaHistory: [],
      currentQuestion: "",
      isAnswering: false,
    })
  },

  closePopup: () => {
    set({
      isOpen: false,
      selection: null,
      selectedText: "",
      originalCode: null,
      fileId: null,
      editPrompt: "",
      generatedCode: null,
      isGenerating: false,
      showDiff: false,
      qaHistory: [],
      currentQuestion: "",
      isAnswering: false,
    })
  },

  setMode: (mode) => set({ mode }),

  // Edit mode actions
  setEditPrompt: (prompt) => set({ editPrompt: prompt }),

  setGeneratedCode: (code) => set({ generatedCode: code }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setShowDiff: (show) => set({ showDiff: show }),

  acceptEdit: () => {
    // The actual editor replacement is handled by the component
    // This just resets the state
    set({
      showDiff: false,
      generatedCode: null,
      editPrompt: "",
    })
  },

  rejectEdit: () => {
    set({
      showDiff: false,
      generatedCode: null,
    })
  },

  // Question mode actions
  setCurrentQuestion: (question) => set({ currentQuestion: question }),

  addQAMessage: (message) => {
    set((state) => ({
      qaHistory: [...state.qaHistory, message],
    }))
  },

  setIsAnswering: (isAnswering) => set({ isAnswering }),

  clearQAHistory: () => set({ qaHistory: [] }),
}))
