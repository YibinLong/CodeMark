"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Send, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CodeRange } from "@/lib/types"

// ============================================================================
// Types & Schema
// ============================================================================

const threadComposerSchema = z.object({
  prompt: z
    .string()
    .min(3, "Prompt must be at least 3 characters")
    .max(500, "Prompt must not exceed 500 characters"),
})

type ThreadComposerFormData = z.infer<typeof threadComposerSchema>

interface ThreadComposerProps {
  /** Code selection to display in preview */
  selection?: {
    code: string
    language: string
    range: CodeRange
  }
  /** Callback when form is submitted */
  onSubmit: (prompt: string) => Promise<void>
  /** Callback when composer is cancelled */
  onCancel: () => void
  /** Whether the composer is in loading state */
  isLoading?: boolean
  /** Additional className for styling */
  className?: string
  /** Placeholder text for textarea */
  placeholder?: string
}

// ============================================================================
// Component
// ============================================================================

export function ThreadComposer({
  selection,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
  placeholder = "Ask a question about this code...",
}: ThreadComposerProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Initialize form with React Hook Form and zod validation
  const form = useForm<ThreadComposerFormData>({
    resolver: zodResolver(threadComposerSchema),
    defaultValues: {
      prompt: "",
    },
  })

  const promptValue = form.watch("prompt")
  const charCount = promptValue.length
  const isValid = charCount >= 3 && charCount <= 500

  // ============================================================================
  // Auto-resize textarea
  // ============================================================================

  React.useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }

    adjustHeight()
  }, [promptValue])

  // ============================================================================
  // Keyboard shortcuts
  // ============================================================================

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        if (isValid && !isSubmitting && !isLoading) {
          form.handleSubmit(handleFormSubmit)()
        }
      }

      // Esc to cancel
      if (e.key === "Escape") {
        e.preventDefault()
        onCancel()
      }
    },
    [isValid, isSubmitting, isLoading, form, onCancel],
  )

  // ============================================================================
  // Form submission with optimistic UI
  // ============================================================================

  const handleFormSubmit = async (data: ThreadComposerFormData) => {
    if (isSubmitting || isLoading) return

    try {
      // Set optimistic loading state
      setIsSubmitting(true)

      // Call the onSubmit callback
      await onSubmit(data.prompt)

      // Reset form on success
      form.reset()
    } catch (error) {
      // Error handling - form stays filled so user can retry
      console.error("Failed to submit thread:", error)
      form.setError("prompt", {
        type: "manual",
        message: "Failed to submit. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Focus textarea on mount
  React.useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const combinedLoading = isLoading || isSubmitting

  return (
    <Card className={cn("p-4", className)}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-4"
        >
          {/* Selection Preview */}
          {selection && (
            <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Lines {selection.range.startLine}-{selection.range.endLine}
                </span>
                <span className="font-mono">{selection.language}</span>
              </div>
              <pre className="overflow-x-auto">
                <code className="text-xs">{selection.code}</code>
              </pre>
            </div>
          )}

          {/* Prompt Input */}
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Question or comment</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Textarea
                      {...field}
                      ref={(e) => {
                        field.ref(e)
                        // @ts-ignore - ref forwarding
                        textareaRef.current = e
                      }}
                      placeholder={placeholder}
                      onKeyDown={handleKeyDown}
                      disabled={combinedLoading}
                      className="min-h-16 resize-none pr-16"
                      rows={1}
                      aria-label="Thread prompt"
                    />
                    {/* Character Counter */}
                    <div
                      className={cn(
                        "absolute bottom-2 right-2 text-xs tabular-nums",
                        charCount > 500
                          ? "text-destructive"
                          : charCount >= 450
                            ? "text-warning"
                            : "text-muted-foreground",
                      )}
                      aria-live="polite"
                    >
                      {charCount}/500
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                {navigator?.platform?.toLowerCase().includes("mac")
                  ? "⌘"
                  : "Ctrl"}
                +Enter
              </kbd>{" "}
              to submit,{" "}
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                Esc
              </kbd>{" "}
              to cancel
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={combinedLoading}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!isValid || combinedLoading}
              >
                {combinedLoading ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-1 h-3.5 w-3.5" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </Card>
  )
}
