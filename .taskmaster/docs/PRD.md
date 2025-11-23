### 1. Project Summary
Build **CodeMark**, a web-based inline AI code review assistant for single-file workflows, to deliver precise Monaco-based selections, contextual AI critiques, and persistent thread management on top of the existing Next.js/Tailwind shell. MVP scope: (A) capture and annotate code selections, (B) collect AI feedback per thread via Next.js API routes + OpenAI, (C) persist multiple inline conversations with local storage and Zustand. **Assumption:** the current frontend scaffold (layout, theming, shadcn/ui primitives) already exists; this PRD focuses on editor wiring, AI orchestration, and state/data flows.

### 2. Core Goals
- Users can paste or author code in Monaco with syntax highlighting and select exact line/column ranges.
- Users can open an inline composer tied to a selection, describe their question, and submit it to the AI.
- Users receive contextual AI responses referencing the selected code, rendered inline as threaded comments.
- Users can maintain multiple simultaneous threads per file, revisit them after reload (local persistence), and collapse/expand them.
- Users can deploy the experience to Vercel with environment-based configuration for AI providers.

### 3. Non-Goals
- Multi-file project navigation, file tree management, or repository ingestion.
- Real-time multi-user collaboration, authentication, or permissions.
- Automated code changes/diffs beyond textual suggestions in AI responses.
- Offline model inference or self-hosted LLM orchestration.
- Complex billing/usage analytics or rate-limit enforcement beyond basic UI messaging.

### 4. Tech Stack (Solo-AI Friendly)
- **Next.js 14 (App Router)**: cohesive full-stack framework familiar to LLMs; handles routing, layouts, and edge-friendly API routes.
- **TypeScript**: enforces contracts for thread/state models so AI-generated code stays type-safe.
- **Tailwind CSS + shadcn/ui**: existing design system provides consistent UI tokens and accessible primitives with minimal custom CSS.
- **Monaco Editor**: industry-standard web IDE component with rich selection APIs and decorations perfect for inline annotations.
- **Zustand (with middleware)**: lightweight, AI-friendly store to track threads, selections, and UI state; integrate `persist` for localStorage.
- **Next.js API routes + OpenAI API**: server-side bridge for prompt/response; easy secret handling and streaming support.
- **LocalStorage Persistence**: ensures threads survive refresh without backend complexity.
- **Vercel Deployment**: zero-config hosting for Next.js with first-class environment variable management and preview URLs.

### 5. Feature Breakdown — Vertical Slices
**Feature 1: Monaco Editing & Selection Capture**  
**User Story:** As a reviewer, I want to edit and select precise code ranges so that feedback is anchored to exact lines.  
**Acceptance Criteria:**  
- [ ] Monaco editor renders full width with language detection (auto by file extension or AI detection fallback).  
- [ ] Selecting code exposes start/end line+column metadata and surfaces “Review selection” affordance.  
- [ ] Non-destructive inline decorations (e.g., gutter markers) appear for active selections without clipping themes.  
- [ ] Existing keyboard shortcuts (Cmd/Ctrl+Enter to submit, Esc to cancel) remain functional.  
**Data Model Notes:**  
- Define `CodeSelection { id, startLine, startCol, endLine, endCol, language, previewSnippet }` in `lib/types/review.ts`.  
- `components/CodeEditor.tsx` owns Monaco setup, using `monaco.editor.IStandaloneCodeEditor` refs stored via Zustand to share context.  
- Utility `lib/selection.ts` converts Monaco ranges to serializable data for API payloads.  
**Edge Cases & Errors:**  
- Selections spanning >1,000 lines should warn and disable submission to avoid oversized prompts.  
- Empty selection -> disable composer trigger and show tooltip.  
- Handle Monaco worker loading failures (e.g., ad blockers) by presenting fallback textarea with minimal functionality.  

**Feature 2: Inline Thread Composer & Rendering**  
**User Story:** As a reviewer, I want inline comment threads anchored to code so that I can discuss context without leaving the editor.  
**Acceptance Criteria:**  
- [ ] Clicking “Review selection” opens a side-docked composer prefilled with selection summary.  
- [ ] Thread cards render alongside the relevant line range with avatars, timestamps, and AI badge.  
- [ ] Users can collapse/expand or delete threads; UI shows selection highlight on hover.  
- [ ] Composer validates prompt length (>3 chars) and displays optimistic placeholder while awaiting AI.  
**Data Model Notes:**  
- `Thread { id, selectionId, prompt, messages[], status }` stored in `lib/stores/reviewStore.ts` (Zustand).  
- `Message { id, role: 'user' | 'assistant', content, createdAt }`.  
- UI components: `components/ThreadComposer.tsx`, `components/ThreadList.tsx`, `components/InlineAnchor.tsx`.  
- Persist store with `persist` middleware (`name: 'codemark-threads'`) keyed per file hash.  
**Edge Cases & Errors:**  
- Show toast when user tries to create >10 concurrent open threads to avoid clutter.  
- Handle deleted selections (editor content changed) by marking thread as “outdated selection” and grey out highlight.  
- Gracefully degrade when localStorage is unavailable (private browsing) by switching to in-memory store and showing banner.  

**Feature 3: AI Review Request Pipeline**  
**User Story:** As a reviewer, I want the AI to consider my selection and surrounding context so that its response is actionable.  
**Acceptance Criteria:**  
- [ ] `POST /api/review` accepts `{ selection, prompt, codeContext }` and streams assistant messages back via SSE or fetch reader.  
- [ ] Prompt builder includes language, file name (if provided), full snippet (trimmed), and user instruction templates.  
- [ ] Loading state displays per thread while streaming; on completion, response is appended to the thread.  
- [ ] Errors (429, 500) show actionable UI copy and allow retry without losing draft.  
**Data Model Notes:**  
- Server route `app/api/review/route.ts` houses OpenAI client call (`openai.chat.completions.create`).  
- Config in `lib/ai/prompt.ts` for system prompt + context assembly; `lib/ai/client.ts` wraps OpenAI SDK with fetch fallback.  
- Use `OpenAIResponse { threadId, chunks[] }` to progressively update Zustand store.  
**Edge Cases & Errors:**  
- Timeouts (>30s) should abort controller and display “AI timed out” with retry/backoff hints.  
- Sanitize prompt payload to stay under token limit (truncate context >2,000 chars).  
- Respect missing API key by short-circuiting request and surfacing banner instructing `.env` setup.  

**Feature 4: Thread Management & Persistence**  
**User Story:** As a reviewer, I want to reopen past AI conversations tied to code blocks so that I can iterate without retyping context.  
**Acceptance Criteria:**  
- [ ] Threads load from localStorage (via Zustand persist) on page hydration and rehydrate UI gracefully (no flicker).  
- [ ] “Threads” sidebar lists all conversations, indicates selection ranges, and lets users filter by status (open/resolved).  
- [ ] Mark thread as resolved/unresolved; resolved threads collapse by default.  
- [ ] Provide “Clear all local data” control with confirmation modal.  
**Data Model Notes:**  
- Extend `Thread` with `status: 'open' | 'resolved' | 'error'` and `updatedAt`.  
- Use `lib/storage.ts` helper to namespace keys by `fileFingerprint` (hash of code string).  
- `components/ThreadSidebar.tsx` coordinates filters and uses `zustand/subscribeWithSelector` to minimize renders.  
**Edge Cases & Errors:**  
- Detect code mutations that invalidate stored selection (hash mismatch) and label threads as “outdated” while still viewable.  
- Storage quota exceeded -> catch `DOMException` and prompt user to delete old threads.  
- Provide fallback UI when hydration mismatches occur (e.g., due to SSR/client differences).  

**Feature 5: Task Tracking & Context Management**  
**User Story:** As a solo dev, I want clear progress tracking so that AI agents can resume work without context loss.  
**Acceptance Criteria:**  
- [ ] Maintain `TASK_LIST.md` using **Epics → Stories → Tasks** hierarchy and update after each major change.  
- [ ] When ≥60% of Cursor/Claude context budget remains after a PR, pause work and document next steps in the task list.  
- [ ] Include pointers from PR descriptions back to relevant epics/stories.  
**Data Model Notes:**  
- `TASK_LIST.md` at repo root with markdown anchors per epic.  
- Each entry includes status keywords (Todo/In Progress/Done).  
**Edge Cases & Errors:**  
- Warn (console + README note) if task list falls out of sync with actual repo progress.  
- Avoid merge conflicts by keeping entries short and dated.  

### 8. .env Setup
- Create `.env.local` at the repo root. Do not commit secrets.  
- Recommended variables:  
  ```
  OPENAI_API_KEY=sk-...           # Required for /api/review; causes 401 banner when missing.
  OPENAI_MODEL=gpt-4o-mini        # Allows quick swaps without code changes.
  OPENAI_BASE_URL=https://api.openai.com/v1
  NEXT_PUBLIC_APP_NAME=CodeMark   # Used for UI copy; safe to expose.
  DEBUG=api:review,ui:threads     # Enables verbose logging in selected namespaces.
  ```
- For Vercel, mirror the same variables in the project settings (Production + Preview + Development).  
- Optional testing key: `MOCK_AI=true` to bypass OpenAI and return canned responses for demos.

### 9. .gitignore
Use a Node/Next-focused ignore list:  
```
node_modules
.next
.turbo
.env*
!.env.example
.vercel
dist
coverage
*.log
*.DS_Store
package-lock.json
```
Add editor-specific ignores (e.g., `.idea`, `.vscode`) if they are not already excluded.

### 10. Debugging & Logging
- Treat **Next.js API routes** as the “main process” equivalent: centralize logging via `lib/logger.ts` (e.g., `pino` or `console`) and guard with `DEBUG` namespaces (`api:review`). Include request ids in responses for traceability.  
- Treat **client components** (React “renderer”) separately: create `lib/clientLogger.ts` that no-ops unless `DEBUG` includes `ui:*`. Avoid leaking secrets by never logging raw prompts on the client.  
- Enable verbose logging locally by running `DEBUG=api:review,ui:threads npm run dev`; ensure production build defaults to `INFO` level only.  
- Capture AI failures with `console.error` + toast, and optionally enqueue to Vercel’s `Monitoring` integration or a future Sentry hook (placeholder DSN).  
- Provide a “Download logs” developer utility (hidden behind `NEXT_PUBLIC_ENABLE_DEVTOOLS`) to help debugging multi-step agent flows.

### 11. External Setup Instructions (Manual)
1. **Create an OpenAI API Key**  
   - **Where:** https://platform.openai.com/account/api-keys  
   - **What:** Generate a secret key with access to GPT-4o or GPT-4o-mini.  
   - **Why:** Required by `/api/review` to request contextual critiques; without it, AI features stay disabled.  
2. **Configure Vercel Project Environment**  
   - **Where:** Vercel Dashboard → Project → Settings → Environment Variables.  
   - **What:** Add `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`, `NEXT_PUBLIC_APP_NAME`, `DEBUG` (optional), and `MOCK_AI` (optional) across Development/Preview/Production.  
   - **Why:** Ensures deployments mirror local behavior and keeps secrets out of the repo.  
3. **Enable Monaco Worker Assets**  
   - **Where:** `next.config.ts` or Vercel settings (if using custom CDN).  
   - **What:** Confirm `compiler.standalone` (or custom webpack loader) copies Monaco workers to `/_next/static`.  
   - **Why:** Without this manual config, Monaco fails to load in production and the editor falls back to a textarea.  
4. **Document AI Usage**  
   - **Where:** `README.md` under “How you used AI tools.”  
   - **What:** Record which AI assistants were used, prompts, and verification strategy.  
   - **Why:** Automattic requires transparency and it helps future agents understand tooling history.

### 12. Deployment Plan
- **Local Development**  
  - `npm install` (once) to pull dependencies.  
  - `npm run dev` to launch Next.js at `http://localhost:3000` with hot reload.  
  - `npm run lint` and `npm run test` (add Vitest/Playwright as needed) before commits.  
  - `MOCK_AI=true npm run dev` for demoing without real API costs.  
- **Production Build Verification**  
  - `npm run build` to generate optimized output; fix any type errors surfaced during `tsc`.  
  - `npm run start` to smoke-test the production bundle locally.  
  - Validate Monaco worker loading and AI streaming using sample code snippets.  
- **Vercel Deployment**  
  - Push to `main` or open PR → Vercel auto-builds previews.  
  - Verify preview logs (`vercel logs <deployment>`) for API errors before promoting.  
  - Use Vercel “Promote to Production” once QA passes; monitor for rate limits and set rollback plan (previous deployment).  
- **Post-Deploy Checklist**  
  - Confirm `.env` parity, test AI responses, ensure localStorage persistence using browser devtools, and update `TASK_LIST.md` with deployment status.
