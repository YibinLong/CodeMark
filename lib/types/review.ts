/**
 * Enums for code review system
 */

/**
 * Status of a review thread
 */
export enum ThreadStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  ERROR = 'error'
}

/**
 * Role of a message in a thread
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant'
}

/**
 * Core data interfaces
 */

/**
 * Represents a code selection in the editor
 */
export interface CodeSelection {
  /** Unique identifier for the selection */
  id: string;
  /** Starting line number (1-indexed) */
  startLine: number;
  /** Starting column number (1-indexed) */
  startCol: number;
  /** Ending line number (1-indexed) */
  endLine: number;
  /** Ending column number (1-indexed) */
  endCol: number;
  /** Programming language of the selected code */
  language: string;
  /** Preview snippet of the selected code */
  previewSnippet: string;
}

/**
 * Represents a review thread associated with a code selection
 */
export interface Thread {
  /** Unique identifier for the thread */
  id: string;
  /** ID of the associated code selection */
  selectionId: string;
  /** Initial prompt or question for the thread */
  prompt: string;
  /** Array of messages in the thread */
  messages: Message[];
  /** Current status of the thread */
  status: ThreadStatus;
  /** Timestamp when the thread was created */
  createdAt: Date;
  /** Timestamp when the thread was last updated */
  updatedAt: Date;
}

/**
 * Represents a single message in a thread
 */
export interface Message {
  /** Unique identifier for the message */
  id: string;
  /** Role of the message sender */
  role: MessageRole;
  /** Content of the message */
  content: string;
  /** Timestamp when the message was created */
  createdAt: Date;
}

/**
 * Response structure from OpenAI streaming API
 */
export interface OpenAIResponse {
  /** ID of the thread this response belongs to */
  threadId: string;
  /** Array of response chunks from streaming */
  chunks: string[];
}

/**
 * Utility types
 */

/**
 * Payload for creating a new thread
 */
export interface CreateThreadPayload {
  selectionId: string;
  prompt: string;
}

/**
 * Payload for adding a message to a thread
 */
export interface AddMessagePayload {
  threadId: string;
  content: string;
  role: MessageRole;
}

/**
 * Payload for updating thread status
 */
export interface UpdateThreadStatusPayload {
  threadId: string;
  status: ThreadStatus;
}

/**
 * Store state for managing threads and selections
 */
export interface ReviewStore {
  /** Map of selection ID to CodeSelection */
  selections: Map<string, CodeSelection>;
  /** Map of thread ID to Thread */
  threads: Map<string, Thread>;
  /** Currently active thread ID */
  activeThreadId: string | null;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Serialized versions for storage (using plain objects instead of Maps/Dates)
 */
export interface SerializedMessage extends Omit<Message, 'createdAt'> {
  createdAt: string;
}

export interface SerializedThread extends Omit<Thread, 'createdAt' | 'updatedAt' | 'messages'> {
  createdAt: string;
  updatedAt: string;
  messages: SerializedMessage[];
}

export interface SerializedReviewStore {
  selections: Record<string, CodeSelection>;
  threads: Record<string, SerializedThread>;
  activeThreadId: string | null;
}
