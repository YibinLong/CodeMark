import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

export const runtime = "edge"

export async function POST(req: Request) {
  try {
    const { message, codeContext, messageHistory = [], isQuickQuestion = false } = await req.json()

    // Build system prompt with code context
    const systemPrompt = isQuickQuestion
      ? `You are a concise code assistant. Give brief, high-signal answers.

RULES:
- Be extremely succinct - 2-4 sentences max unless code is needed
- Skip pleasantries and filler words
- Use bullet points for multiple items
- Only include code if essential
- Focus on the single most important point

${codeContext?.code ? `${codeContext?.contextBefore ? `Code BEFORE the selected code (for context):
\`\`\`${codeContext?.language || 'typescript'}
${codeContext.contextBefore}
\`\`\`

` : ''}SELECTED code the user is asking about:
\`\`\`${codeContext?.language || 'typescript'}
${codeContext?.code}
\`\`\`${codeContext?.contextAfter ? `

Code AFTER the selected code (for context):
\`\`\`${codeContext?.language || 'typescript'}
${codeContext.contextAfter}
\`\`\`` : ''}` : ''}`
      : `You are a senior engineer doing code review. Be direct and high-signal.

RESPONSE STYLE:
- Lead with the most important issue or insight
- Use bullet points, not paragraphs
- Skip filler phrases ("I think", "It seems", "You might want to")
- Give specific line references when applicable
- Code examples only when essential - keep them minimal
- If code is solid, say so briefly and move on

PRIORITIES (in order):
1. Bugs & correctness issues
2. Security vulnerabilities
3. Performance problems
4. Readability concerns

${codeContext?.code ? `CODE (lines ${codeContext?.range?.startLine || 0}-${codeContext?.range?.endLine || 0}):
\`\`\`${codeContext?.language || 'typescript'}
${codeContext?.code}
\`\`\`` : ''}`

    // Build messages array with conversation history
    const messages: Array<{ role: "user" | "assistant"; content: string }> = []

    // Add conversation history (excluding the current message which will be added)
    for (const msg of messageHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // Add current user message if not already in history
    const lastHistoryMessage = messages[messages.length - 1]
    if (!lastHistoryMessage || lastHistoryMessage.content !== message || lastHistoryMessage.role !== "user") {
      messages.push({
        role: "user",
        content: message,
      })
    }

    // Call OpenAI API using Vercel AI SDK with full conversation history
    // openai() automatically reads OPENAI_API_KEY from environment
    const { textStream } = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages,
      temperature: 0.7,
    })

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of textStream) {
            const data = `data: ${JSON.stringify({ content: chunk })}\n\n`
            controller.enqueue(encoder.encode(data))
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error) {
          console.error("[v0] Stream error:", error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
