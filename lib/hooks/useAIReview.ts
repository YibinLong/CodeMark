import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useReviewStore } from '@/lib/stores/reviewStore';
import { MessageRole, ThreadStatus } from '@/lib/types/review';
import type { CodeSelection, Message } from '@/lib/types/review';

/**
 * Configuration for AI review requests
 */
interface AIReviewConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * State for AI review hook
 */
interface AIReviewState {
  isLoading: boolean;
  error: string | null;
  abortController: AbortController | null;
}

/**
 * Options for sending a review request
 */
interface SendReviewOptions {
  prompt: string;
  threadId: string;
  codeSelection?: CodeSelection;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Return type for useAIReview hook
 */
interface UseAIReviewReturn {
  sendReview: (options: SendReviewOptions) => Promise<void>;
  cancelRequest: () => void;
  retry: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_CONFIG: Required<AIReviewConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000, // 30 seconds to match API timeout
};

/**
 * Custom hook for managing AI review requests with streaming support
 */
export function useAIReview(config: AIReviewConfig = {}): UseAIReviewReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const [state, setState] = useState<AIReviewState>({
    isLoading: false,
    error: null,
    abortController: null,
  });

  // Store the last request for retry functionality
  const lastRequestRef = useRef<SendReviewOptions | null>(null);
  const retryCountRef = useRef(0);

  // Zustand store actions
  const addMessageToThread = useReviewStore((s) => s.addMessageToThread);
  const updateThread = useReviewStore((s) => s.updateThread);

  /**
   * Cancel the current request
   */
  const cancelRequest = useCallback(() => {
    if (state.abortController) {
      state.abortController.abort();
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
        abortController: null,
      }));
      toast.info('Request cancelled');
    }
  }, [state.abortController]);

  /**
   * Process streaming response from the API
   */
  const processStream = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      threadId: string,
      userMessageId: string
    ): Promise<void> => {
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let assistantMessageId = `msg-${Date.now()}-assistant`;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              try {
                const parsed = JSON.parse(data);

                // Check for errors
                if (parsed.error) {
                  throw new Error(parsed.error);
                }

                // Check for completion
                if (parsed.done) {
                  // Finalize the assistant message
                  if (accumulatedContent) {
                    const finalMessage: Message = {
                      id: assistantMessageId,
                      role: MessageRole.ASSISTANT,
                      content: accumulatedContent,
                      createdAt: new Date(),
                    };

                    addMessageToThread(threadId, finalMessage);
                    updateThread(threadId, { status: ThreadStatus.OPEN });
                  }
                  return;
                }

                // Accumulate content
                if (parsed.content) {
                  accumulatedContent += parsed.content;

                  // Update the store with the current accumulated content
                  // This creates a streaming effect in the UI
                  const streamingMessage: Message = {
                    id: assistantMessageId,
                    role: MessageRole.ASSISTANT,
                    content: accumulatedContent,
                    createdAt: new Date(),
                  };

                  // Remove old partial message and add updated one
                  const thread = useReviewStore.getState().threads.get(threadId);
                  if (thread) {
                    const filteredMessages = thread.messages.filter(
                      (m) => m.id !== assistantMessageId
                    );
                    updateThread(threadId, {
                      messages: [...filteredMessages, streamingMessage],
                    });
                  }
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error);
        throw error;
      }
    },
    [addMessageToThread, updateThread]
  );

  /**
   * Send review request with retry logic
   */
  const sendReviewInternal = useCallback(
    async (options: SendReviewOptions, isRetry = false): Promise<void> => {
      const { prompt, threadId, codeSelection, conversationHistory } = options;

      // Store for retry
      lastRequestRef.current = options;

      // Create abort controller
      const abortController = new AbortController();

      setState({
        isLoading: true,
        error: null,
        abortController,
      });

      // Add user message to thread immediately
      const userMessageId = `msg-${Date.now()}-user`;
      const userMessage: Message = {
        id: userMessageId,
        role: MessageRole.USER,
        content: prompt,
        createdAt: new Date(),
      };

      addMessageToThread(threadId, userMessage);

      // Set up timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, mergedConfig.timeout);

      try {
        // Make fetch request
        const response = await fetch('/api/review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            codeSelection,
            conversationHistory,
            threadId,
          }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
          } else if (response.status === 500) {
            throw new Error('Server error. Please try again.');
          } else {
            throw new Error(`Request failed with status ${response.status}`);
          }
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        // Process the streaming response
        const reader = response.body.getReader();
        await processStream(reader, threadId, userMessageId);

        // Reset retry count on success
        retryCountRef.current = 0;

        setState({
          isLoading: false,
          error: null,
          abortController: null,
        });

        if (!isRetry) {
          toast.success('Review completed');
        }
      } catch (error: any) {
        clearTimeout(timeoutId);

        // Handle abort
        if (error.name === 'AbortError') {
          setState({
            isLoading: false,
            error: 'Request timeout',
            abortController: null,
          });
          updateThread(threadId, { status: ThreadStatus.ERROR });
          toast.error('Request timed out. Please try again.');
          return;
        }

        // Handle network errors and retries
        const isNetworkError =
          error.message?.includes('fetch') ||
          error.message?.includes('network') ||
          error.message?.includes('NetworkError');

        const shouldRetry =
          isNetworkError && retryCountRef.current < mergedConfig.maxRetries;

        if (shouldRetry) {
          retryCountRef.current += 1;
          const delay = mergedConfig.retryDelay * retryCountRef.current;

          toast.info(
            `Network error. Retrying in ${delay / 1000}s... (${retryCountRef.current}/${mergedConfig.maxRetries})`
          );

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Retry the request
          return sendReviewInternal(options, true);
        }

        // Handle error
        const errorMessage =
          error.message || 'An error occurred while processing your request';

        setState({
          isLoading: false,
          error: errorMessage,
          abortController: null,
        });

        updateThread(threadId, { status: ThreadStatus.ERROR });
        toast.error(errorMessage);

        console.error('AI Review error:', error);
      }
    },
    [
      mergedConfig.timeout,
      mergedConfig.retryDelay,
      mergedConfig.maxRetries,
      addMessageToThread,
      updateThread,
      processStream,
    ]
  );

  /**
   * Public method to send review
   */
  const sendReview = useCallback(
    async (options: SendReviewOptions): Promise<void> => {
      retryCountRef.current = 0;
      return sendReviewInternal(options, false);
    },
    [sendReviewInternal]
  );

  /**
   * Retry the last request
   */
  const retry = useCallback(async (): Promise<void> => {
    if (!lastRequestRef.current) {
      toast.error('No previous request to retry');
      return;
    }

    retryCountRef.current = 0;
    toast.info('Retrying request...');
    return sendReviewInternal(lastRequestRef.current, false);
  }, [sendReviewInternal]);

  return {
    sendReview,
    cancelRequest,
    retry,
    isLoading: state.isLoading,
    error: state.error,
  };
}

/**
 * Simplified hook for one-off reviews (without thread management)
 */
export function useSimpleAIReview(config: AIReviewConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendRequest = useCallback(
    async (
      prompt: string,
      codeSelection?: CodeSelection
    ): Promise<string> => {
      setIsLoading(true);
      setError(null);
      setResponse('');

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, mergedConfig.timeout);

      try {
        const res = await fetch('/api/review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            codeSelection,
          }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        if (!res.body) {
          throw new Error('No response body');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  setResponse(accumulatedContent);
                }
              } catch (parseError) {
                console.error('Parse error:', parseError);
              }
            }
          }
        }

        setIsLoading(false);
        return accumulatedContent;
      } catch (err: any) {
        clearTimeout(timeoutId);
        const errorMsg = err.message || 'An error occurred';
        setError(errorMsg);
        setIsLoading(false);
        toast.error(errorMsg);
        throw err;
      }
    },
    [mergedConfig.timeout]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      toast.info('Request cancelled');
    }
  }, []);

  return {
    sendRequest,
    cancel,
    isLoading,
    error,
    response,
  };
}
