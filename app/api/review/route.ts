import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { buildMessages } from '@/lib/ai/prompt';
import type { CodeSelection } from '@/lib/types/review';
import { MessageRole } from '@/lib/types/review';

// Debug namespace logging
const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
const debug = (namespace: string, ...args: any[]) => {
  if (DEBUG) {
    console.log(`[${namespace}]`, ...args);
  }
};

// Runtime configuration
export const runtime = 'edge';

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30000;

// Zod schema for payload validation
const reviewRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000, 'Prompt too long'),
  codeSelection: z
    .object({
      id: z.string(),
      startLine: z.number().int().positive(),
      startCol: z.number().int().nonnegative(),
      endLine: z.number().int().positive(),
      endCol: z.number().int().nonnegative(),
      language: z.string(),
      previewSnippet: z.string().max(50000, 'Code snippet too large'),
    })
    .optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
  threadId: z.string().optional(),
});

type ReviewRequest = z.infer<typeof reviewRequestSchema>;

/**
 * Sanitize user input to prevent prompt injection
 */
function sanitizeInput(input: string): string {
  // Remove potential command injection patterns
  const sanitized = input
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .trim();

  // Check for suspicious patterns that might indicate prompt injection
  const suspiciousPatterns = [
    /ignore\s+(previous|all)\s+instructions?/i,
    /disregard\s+(previous|all)\s+instructions?/i,
    /forget\s+(previous|all)\s+instructions?/i,
    /system\s*:/i,
    /assistant\s*:/i,
  ];

  const hasSuspiciousPattern = suspiciousPatterns.some((pattern) =>
    pattern.test(sanitized)
  );

  if (hasSuspiciousPattern) {
    debug('review-api', 'Suspicious pattern detected in input');
  }

  return sanitized;
}

/**
 * Generate unique request ID for traceability
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * POST handler for AI review requests
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  debug('review-api', `Request started: ${requestId}`);

  const startTime = Date.now();

  try {
    // Validate API key exists
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      debug('review-api', `${requestId}: Missing API key`);
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Parse and validate request body
    let body: ReviewRequest;
    try {
      const rawBody = await req.json();
      body = reviewRequestSchema.parse(rawBody);
      debug('review-api', `${requestId}: Payload validated`, {
        hasCodeSelection: !!body.codeSelection,
        historyLength: body.conversationHistory?.length || 0,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        debug('review-api', `${requestId}: Validation error`, error.errors);
        return NextResponse.json(
          {
            error: 'Invalid request payload',
            details: error.errors,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Sanitize user input
    const sanitizedPrompt = sanitizeInput(body.prompt);
    const sanitizedCodeSelection = body.codeSelection
      ? {
          ...body.codeSelection,
          previewSnippet: sanitizeInput(body.codeSelection.previewSnippet),
        }
      : undefined;

    debug('review-api', `${requestId}: Input sanitized`);

    // Build messages using existing prompt utilities
    const messages = buildMessages({
      userPrompt: sanitizedPrompt,
      codeSelection: sanitizedCodeSelection as CodeSelection | undefined,
      conversationHistory:
        body.conversationHistory?.map((msg) => ({
          id: `msg-${Date.now()}`,
          role: msg.role === 'user' ? MessageRole.USER : MessageRole.ASSISTANT,
          content: msg.content,
          createdAt: new Date(),
        })) || [],
    });

    debug('review-api', `${requestId}: Messages built`, {
      messageCount: messages.length,
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey,
    });

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      debug('review-api', `${requestId}: Request timeout`);
      abortController.abort();
    }, REQUEST_TIMEOUT);

    // Create streaming response
    let streamStarted = false;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          debug('review-api', `${requestId}: Starting OpenAI stream`);
          streamStarted = true;

          const streamResponse = await openai.chat.completions.create(
            {
              model: 'gpt-4o-mini',
              messages: messages as any,
              temperature: 0.7,
              stream: true,
            },
            {
              signal: abortController.signal,
            }
          );

          const encoder = new TextEncoder();

          for await (const chunk of streamResponse) {
            if (abortController.signal.aborted) {
              throw new Error('Request aborted due to timeout');
            }

            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              const data = JSON.stringify({ content, done: false });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Send completion marker
          const doneData = JSON.stringify({ content: '', done: true });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));

          debug('review-api', `${requestId}: Stream completed`, {
            duration: Date.now() - startTime,
          });

          controller.close();
        } catch (error: any) {
          clearTimeout(timeoutId);

          debug('review-api', `${requestId}: Stream error`, {
            error: error.message,
            type: error.constructor.name,
          });

          const encoder = new TextEncoder();

          // Handle specific error types
          if (error.message?.includes('aborted')) {
            const errorData = JSON.stringify({
              error: 'Request timeout (30s limit exceeded)',
              done: true,
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          } else if (error.status === 429) {
            const errorData = JSON.stringify({
              error: 'Rate limit exceeded. Please try again later.',
              done: true,
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          } else if (error.status === 401) {
            const errorData = JSON.stringify({
              error: 'API authentication failed',
              done: true,
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          } else {
            const errorData = JSON.stringify({
              error: 'An error occurred while processing your request',
              done: true,
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          }

          controller.close();
        } finally {
          clearTimeout(timeoutId);
        }
      },
      cancel() {
        debug('review-api', `${requestId}: Stream cancelled by client`);
        clearTimeout(timeoutId);
        abortController.abort();
      },
    });

    // Return streaming response with CORS headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Request-ID': requestId,
      },
    });
  } catch (error: any) {
    debug('review-api', `${requestId}: Request error`, {
      error: error.message,
      stack: error.stack,
    });

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to process review request',
        requestId,
      },
      {
        status: 500,
        headers: {
          'X-Request-ID': requestId,
        },
      }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
