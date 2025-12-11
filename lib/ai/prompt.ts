import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { CodeSelection, Message } from '@/lib/types/review';
import { MessageRole } from '@/lib/types/review';

/**
 * Options for building prompts
 */
export interface PromptOptions {
  codeSelection?: CodeSelection;
  userPrompt: string;
  conversationHistory?: Message[];
  includeCodeContext?: boolean;
}

/**
 * Language-specific instructions for better AI responses
 */
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  typescript: 'Focus on TypeScript best practices, type safety, and modern ES6+ features.',
  javascript: 'Focus on modern JavaScript (ES6+) best practices and clean code principles.',
  python: 'Focus on Pythonic code, PEP 8 style guide, and type hints where appropriate.',
  java: 'Focus on Java best practices, design patterns, and object-oriented principles.',
  rust: 'Focus on Rust ownership, borrowing, and memory safety principles.',
  go: 'Focus on Go idioms, simplicity, and concurrency patterns.',
  cpp: 'Focus on modern C++ (C++17/20), RAII, and memory management best practices.',
  c: 'Focus on C best practices, memory management, and avoiding common pitfalls.',
  ruby: 'Focus on Ruby idioms and the principle of least surprise.',
  php: 'Focus on modern PHP (8+) features and best practices.',
  swift: 'Focus on Swift best practices and protocol-oriented programming.',
  kotlin: 'Focus on Kotlin idioms and null safety.',
  dart: 'Focus on Dart best practices and Flutter patterns if applicable.',
  html: 'Focus on semantic HTML, accessibility, and modern web standards.',
  css: 'Focus on modern CSS, maintainability, and responsive design principles.',
  sql: 'Focus on query optimization, indexing strategies, and database best practices.',
  shell: 'Focus on shell scripting best practices, portability, and error handling.',
  yaml: 'Focus on YAML syntax, indentation, and common configuration patterns.',
  json: 'Focus on valid JSON syntax and schema validation.',
  markdown: 'Focus on Markdown formatting and documentation clarity.',
};

/**
 * Get language-specific instruction
 */
function getLanguageInstruction(language: string): string {
  const normalizedLang = language.toLowerCase();
  return LANGUAGE_INSTRUCTIONS[normalizedLang] || 'Provide clear, concise, and helpful code review feedback.';
}

/**
 * Format code selection for context
 */
function formatCodeContext(selection: CodeSelection): string {
  const { language, startLine, endLine, previewSnippet } = selection;

  return `
Code Context:
- Language: ${language}
- Lines: ${startLine}-${endLine}
- Selected Code:
\`\`\`${language}
${previewSnippet}
\`\`\`
`;
}

/**
 * Build system prompt with code context awareness
 */
export function buildSystemPrompt(options: Partial<PromptOptions> = {}): string {
  const { codeSelection, includeCodeContext = true } = options;

  let systemPrompt = `You are an expert code reviewer and software engineering assistant. Your role is to provide helpful, accurate, and constructive feedback on code.

Key Guidelines:
- Be concise and direct in your explanations
- Focus on best practices, potential bugs, and improvements
- Provide specific examples when suggesting changes
- Consider performance, readability, and maintainability
- Be encouraging and constructive in your feedback
`;

  if (codeSelection && includeCodeContext) {
    const langInstruction = getLanguageInstruction(codeSelection.language);
    systemPrompt += `\n${langInstruction}\n`;
    systemPrompt += formatCodeContext(codeSelection);
  }

  return systemPrompt.trim();
}

/**
 * Build user prompt with proper formatting
 */
export function buildUserPrompt(userInput: string, codeSelection?: CodeSelection): string {
  if (!codeSelection) {
    return userInput;
  }

  // If code context exists, format the user prompt to reference it
  return `Regarding the selected ${codeSelection.language} code (lines ${codeSelection.startLine}-${codeSelection.endLine}):

${userInput}`;
}

/**
 * Convert Message objects to OpenAI message format
 */
export function convertMessagesToOpenAI(messages: Message[]): ChatCompletionMessageParam[] {
  return messages.map(msg => ({
    role: msg.role === MessageRole.USER ? 'user' : 'assistant',
    content: msg.content,
  }));
}

/**
 * Build complete message array for OpenAI API
 */
export function buildMessages(options: PromptOptions): ChatCompletionMessageParam[] {
  const { codeSelection, userPrompt, conversationHistory = [], includeCodeContext = true } = options;

  const messages: ChatCompletionMessageParam[] = [];

  // Add system prompt
  messages.push({
    role: 'system',
    content: buildSystemPrompt({ codeSelection, includeCodeContext }),
  });

  // Add conversation history if exists
  if (conversationHistory.length > 0) {
    messages.push(...convertMessagesToOpenAI(conversationHistory));
  }

  // Add current user prompt
  messages.push({
    role: 'user',
    content: buildUserPrompt(userPrompt, codeSelection),
  });

  return messages;
}

/**
 * Template for common code review prompts
 */
export const PROMPT_TEMPLATES = {
  review: 'Please review this code and provide feedback on potential improvements, bugs, or best practices.',
  explain: 'Please explain what this code does and how it works.',
  optimize: 'How can I optimize this code for better performance?',
  security: 'Are there any security vulnerabilities or concerns in this code?',
  refactor: 'How would you refactor this code to improve readability and maintainability?',
  test: 'What test cases should I write for this code?',
  document: 'Please help me write documentation for this code.',
  debug: 'Help me debug this code. What might be causing issues?',
};

/**
 * Get a prompt template by key
 */
export function getPromptTemplate(key: keyof typeof PROMPT_TEMPLATES): string {
  return PROMPT_TEMPLATES[key];
}

/**
 * Detect if user prompt matches a template category
 */
export function detectPromptIntent(userPrompt: string): keyof typeof PROMPT_TEMPLATES | null {
  const lowerPrompt = userPrompt.toLowerCase();

  if (lowerPrompt.includes('review') || lowerPrompt.includes('feedback')) return 'review';
  if (lowerPrompt.includes('explain') || lowerPrompt.includes('what does')) return 'explain';
  if (lowerPrompt.includes('optimize') || lowerPrompt.includes('performance')) return 'optimize';
  if (lowerPrompt.includes('security') || lowerPrompt.includes('vulnerability')) return 'security';
  if (lowerPrompt.includes('refactor') || lowerPrompt.includes('improve')) return 'refactor';
  if (lowerPrompt.includes('test') || lowerPrompt.includes('unit test')) return 'test';
  if (lowerPrompt.includes('document') || lowerPrompt.includes('documentation')) return 'document';
  if (lowerPrompt.includes('debug') || lowerPrompt.includes('error') || lowerPrompt.includes('bug')) return 'debug';

  return null;
}

/**
 * Enhance user prompt with template if intent is detected
 */
export function enhancePrompt(userPrompt: string): string {
  const intent = detectPromptIntent(userPrompt);

  if (!intent) {
    return userPrompt;
  }

  // If user prompt is very short, replace with template
  if (userPrompt.length < 20) {
    return getPromptTemplate(intent);
  }

  // Otherwise, keep user's prompt as-is
  return userPrompt;
}
