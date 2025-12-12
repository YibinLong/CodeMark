import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

export const runtime = "edge"

export async function POST(req: Request) {
  try {
    const { message, codeContext, messageHistory = [] } = await req.json()

    // Build system prompt with code context
    const systemPrompt = `You are an expert code reviewer and programming assistant. You provide constructive, actionable feedback on code.
Focus on:
- Code quality and best practices
- Potential bugs or edge cases
- Performance considerations
- Security concerns
- Readability and maintainability

Be concise but thorough. Use markdown for formatting.

${codeContext?.code ? `Here's the code context being discussed:
\`\`\`${codeContext?.language || 'typescript'}
${codeContext?.code}
\`\`\`
Lines: ${codeContext?.range?.startLine || 0}-${codeContext?.range?.endLine || 0}` : ''}`

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
