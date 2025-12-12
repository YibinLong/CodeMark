import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

export const runtime = "edge"

export async function POST(req: Request) {
  try {
    const { code, language, prompt, contextBefore, contextAfter } = await req.json()

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Build context section if available
    let contextSection = ""
    if (contextBefore || contextAfter) {
      contextSection = `
SURROUNDING CONTEXT (for reference only - do NOT include this in your output):
${contextBefore ? `--- Code BEFORE selection ---
${contextBefore}
--- End of code before ---` : ""}

${contextAfter ? `--- Code AFTER selection ---
${contextAfter}
--- End of code after ---` : ""}
`
    }

    const systemPrompt = `You are a code editing assistant. Your task is to edit the provided selected code according to the user's instructions.

IMPORTANT RULES:
1. Output ONLY the replacement for the selected code - no explanations, no markdown code blocks, no commentary
2. Preserve the original indentation style and formatting
3. Make minimal changes to achieve the user's goal
4. If the instruction is unclear, make a reasonable interpretation
5. Do not add comments unless explicitly asked
6. Maintain the same programming style as the original code
7. If the user wants to DELETE the code (e.g., "delete", "remove", "delete all"), output EXACTLY the string: __DELETE__
8. Use the surrounding context to understand how the selected code fits into the larger codebase, but only output the replacement for the selected portion

The code is written in ${language || "typescript"}.`

    const userPrompt = `${contextSection}
SELECTED CODE TO EDIT:
${code || "(empty selection)"}

Instructions: ${prompt}

Output only the replacement for the selected code (or __DELETE__ if the code should be removed):`

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
