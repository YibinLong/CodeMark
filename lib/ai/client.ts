import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Configuration for the AI client
 */
export interface AIClientConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  mockMode?: boolean;
}

/**
 * Options for streaming chat completion
 */
export interface StreamChatOptions {
  messages: ChatCompletionMessageParam[];
  onChunk?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

/**
 * Token counting result
 */
export interface TokenCount {
  total: number;
  exceeded: boolean;
}

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_MAX_TOKENS = 8000; // 8k context limit for gpt-4o-mini
const DEFAULT_TEMPERATURE = 0.7;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * OpenAI API client wrapper with streaming support and retry logic
 */
export class AIClient {
  private client: OpenAI | null;
  private config: Required<AIClientConfig>;

  constructor(config: AIClientConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
      model: config.model || DEFAULT_MODEL,
      maxTokens: config.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: config.temperature || DEFAULT_TEMPERATURE,
      mockMode: config.mockMode || process.env.MOCK_AI === 'true',
    };

    if (this.config.mockMode) {
      this.client = null;
      console.log('[AI Client] Running in MOCK mode - no API calls will be made');
    } else {
      if (!this.config.apiKey) {
        throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
      }
      this.client = new OpenAI({ apiKey: this.config.apiKey });
    }
  }

  /**
   * Estimate token count for messages (rough approximation)
   * OpenAI uses ~4 chars per token on average
   */
  private estimateTokens(messages: ChatCompletionMessageParam[]): number {
    const totalChars = messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return sum + content.length;
    }, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Check if token count exceeds the limit
   */
  public checkTokenLimit(messages: ChatCompletionMessageParam[]): TokenCount {
    const total = this.estimateTokens(messages);
    return {
      total,
      exceeded: total > this.config.maxTokens,
    };
  }

  /**
   * Truncate messages to fit within token limit
   * Keeps system message and recent messages, removes middle messages if needed
   */
  public truncateMessages(messages: ChatCompletionMessageParam[]): ChatCompletionMessageParam[] {
    const tokenCount = this.checkTokenLimit(messages);

    if (!tokenCount.exceeded) {
      return messages;
    }

    // Always keep system message (first message) if it exists
    const hasSystemMessage = messages[0]?.role === 'system';
    const systemMessage = hasSystemMessage ? [messages[0]] : [];
    const remainingMessages = hasSystemMessage ? messages.slice(1) : messages;

    // Keep the most recent messages until we're under the limit
    let truncated = [...remainingMessages];
    while (this.checkTokenLimit([...systemMessage, ...truncated]).exceeded && truncated.length > 1) {
      // Remove from the beginning (oldest non-system messages)
      truncated = truncated.slice(1);
    }

    return [...systemMessage, ...truncated];
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = MAX_RETRIES,
    delay: number = INITIAL_RETRY_DELAY
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries === 0) {
        throw error;
      }

      // Retry on rate limit errors or network errors
      const shouldRetry =
        error?.status === 429 || // Rate limit
        error?.status === 500 || // Server error
        error?.status === 503 || // Service unavailable
        error?.code === 'ECONNRESET' || // Connection reset
        error?.code === 'ETIMEDOUT'; // Timeout

      if (!shouldRetry) {
        throw error;
      }

      console.log(`[AI Client] Retrying after ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff: double the delay for next retry
      return this.retryWithBackoff(fn, retries - 1, delay * 2);
    }
  }

  /**
   * Generate mock streaming response for development
   */
  private async *generateMockStream(messages: ChatCompletionMessageParam[]): AsyncGenerator<string> {
    const mockResponse = `This is a mock AI response for development purposes.

Your last message was: "${messages[messages.length - 1]?.content}"

This response is being streamed in chunks to simulate the real OpenAI API behavior.`;

    const words = mockResponse.split(' ');
    for (const word of words) {
      yield word + ' ';
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Stream chat completion with abort controller support
   */
  public async streamChat(options: StreamChatOptions): Promise<void> {
    const { messages, onChunk, onComplete, onError, signal } = options;

    try {
      // Truncate messages if needed
      const truncatedMessages = this.truncateMessages(messages);

      if (this.config.mockMode) {
        // Mock mode implementation
        let fullResponse = '';

        for await (const chunk of this.generateMockStream(truncatedMessages)) {
          // Check for abort signal
          if (signal?.aborted) {
            throw new Error('Request aborted');
          }

          fullResponse += chunk;
          onChunk?.(chunk);
        }

        onComplete?.(fullResponse);
        return;
      }

      if (!this.client) {
        throw new Error('OpenAI client not initialized');
      }

      // Real OpenAI API call with retry logic
      const stream = await this.retryWithBackoff(async () => {
        return await this.client!.chat.completions.create({
          model: this.config.model,
          messages: truncatedMessages,
          temperature: this.config.temperature,
          stream: true,
        });
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        // Check for abort signal
        if (signal?.aborted) {
          throw new Error('Request aborted');
        }

        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          onChunk?.(content);
        }
      }

      onComplete?.(fullResponse);
    } catch (error: any) {
      console.error('[AI Client] Stream error:', error);
      onError?.(error);
    }
  }

  /**
   * Non-streaming chat completion (for simple requests)
   */
  public async chat(messages: ChatCompletionMessageParam[]): Promise<string> {
    if (this.config.mockMode) {
      // Mock mode: return simple response
      return `Mock response to: "${messages[messages.length - 1]?.content}"`;
    }

    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const truncatedMessages = this.truncateMessages(messages);

    const response = await this.retryWithBackoff(async () => {
      return await this.client!.chat.completions.create({
        model: this.config.model,
        messages: truncatedMessages,
        temperature: this.config.temperature,
      });
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<Required<AIClientConfig>> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AIClientConfig>): void {
    this.config = { ...this.config, ...config };

    // Reinitialize client if API key or mock mode changed
    if (config.apiKey !== undefined || config.mockMode !== undefined) {
      if (this.config.mockMode) {
        this.client = null;
      } else {
        if (!this.config.apiKey) {
          throw new Error('OpenAI API key is required');
        }
        this.client = new OpenAI({ apiKey: this.config.apiKey });
      }
    }
  }
}

/**
 * Default AI client instance
 */
export const defaultAIClient = new AIClient();
