"use client"

import type { Message } from "@/lib/types"

interface CodeCitationProps {
  codeContext: NonNullable<Message["codeContext"]>
}

export function CodeCitation({ codeContext }: CodeCitationProps) {
  return (
    <div className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[#808080]">
          Lines {codeContext.range.startLine}-{codeContext.range.endLine}
        </span>
        <span className="text-xs text-[#5B9EFF]">{codeContext.language}</span>
      </div>
      <pre className="overflow-x-auto text-xs">
        <code className="text-[#b4b4b4]">{codeContext.code}</code>
      </pre>
    </div>
  )
}
