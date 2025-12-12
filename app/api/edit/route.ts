import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

export const runtime = "edge"

export async function POST(req: Request) {
  try {
    const { code, language, prompt } = await req.json()

    if (!code || !prompt) {
      return new Response(JSON.stringify({ error: "Missing code or prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const systemPrompt = `You are a code editing assistant. Your task is to edit the provided code according to the user's instructions.

IMPORTANT RULES:
1. Output ONLY the edited code - no explanations, no markdown code blocks, no commentary
2. Preserve the original indentation style and formatting
3. Make minimal changes to achieve the user's goal
4. If the instruction is unclear, make a reasonable interpretation
5. Do not add comments unless explicitly asked
6. Maintain the same programming style as the original code

The code is written in ${language || "typescript"}.`

    const userPrompt = `Here is the code to edit:

${code}

Instructions: ${prompt}

Output only the edited code:`

    const { textStream } = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.3, // Lower temperature for more precise edits
    })

    const encoder = new TextEncoder()
    let fullCode = ""

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of textStream) {
            fullCode += chunk
            const data = `data: ${JSON.stringify({ content: chunk })}\n\n`
            controller.enqueue(encoder.encode(data))
          }

          // Send final message with full code
          const finalData = `data: ${JSON.stringify({ fullCode })}\n\n`
          controller.enqueue(encoder.encode(finalData))
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error) {
          console.error("[Edit API] Stream error:", error)
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
    console.error("[Edit API] Error:", error)
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
