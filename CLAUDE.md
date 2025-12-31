---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: '*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json'
alwaysApply: false
---

# Project: Claude Agent SDK Learning Curriculum

This project contains a comprehensive step-by-step curriculum for learning the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`). The lessons are located in the `lessons/` directory.

## Objective

Create a didactic, hands-on learning experience for the Claude Agent SDK that covers:

- Basic queries and message handling (lessons 01-04)
- System prompts and custom tools (lessons 05-07)
- Subagents and hooks (lessons 08-09)
- Sessions and message types (lessons 10-11)
- Production patterns: error handling, structured output, cost tracking (lessons 12-14)
- Security: canUseTool, MCP servers (lessons 15-16)
- Advanced: file checkpoints, streaming input, cancellation (lessons 17-19)
- Full production agent pattern (lesson 20)

## Running Lessons

```bash
cd lessons
bun install
bun run 01_hello.ts
```

---

## Instructions for Helping with Lessons

When the user asks questions about a lesson or concepts from a lesson:

1. **Read the full lesson code first**: Always read the complete lesson file (e.g., `lessons/01_hello.ts`) to understand the context before answering questions. Use the Read tool on the relevant lesson file.

2. **Check prior lessons for context**: If the question involves concepts from earlier lessons, read those as well. The lessons build on each other:

   - 01: Basic query execution
   - 02: Messages and conversation structure
   - 03: Built-in tools
   - 04: Read tool specifics
   - 05: System prompts
   - 06: Custom tool definitions
   - 07: Observation/streaming patterns
   - 08: Subagents and delegation
   - 09: Hooks for intercepting behavior
   - 10: Sessions for multi-turn conversations
   - 11: Message types and their structure
   - 12: Error handling patterns
   - 13: Structured output with schemas
   - 14: Cost and token tracking
   - 15: canUseTool for permission control
   - 16: MCP server integration
   - 17: File checkpoints for persistence
   - 18: Streaming user input
   - 19: Abort signals and cancellation
   - 20: Full production agent combining all concepts

3. **Be didactic**: Explain concepts clearly with:

   - **Why** the pattern exists (the problem it solves)
   - **How** it works (the mechanism)
   - **When** to use it (practical scenarios)
   - Code examples that isolate the specific concept
   - Connections to related concepts in other lessons

4. **Explicitly introduce ALL documented concepts in each lesson**: Every foundational concept that appears in a lesson and is mentioned in the official documentation must be explicitly named and introduced. Do not assume concepts are self-evident.

   **Process for each lesson:**
   1. Identify every SDK concept used in the lesson code (functions, types, patterns, options)
   2. Use the `claude-code-guide` agent to look up each concept in the official documentation
   3. For each documented concept, add an explicit introduction that:
      - Names the concept using the official terminology (e.g., "content block", not "response array")
      - Explains what it is and why it exists (from the docs)
      - Shows its structure/signature as documented
      - Connects it to where it will be used again in later lessons

   **Format for introducing concepts:**
   Use a clearly visible "KEY CONCEPT" box for each foundational concept:
   ```
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ KEY CONCEPT: [Concept Name]                                             │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ [Official description from documentation]                               │
   │ [Structure/signature]                                                   │
   │ [Why it matters]                                                        │
   └─────────────────────────────────────────────────────────────────────────┘
   ```

   **Do NOT skip concepts just because they seem simple.** If it's in the docs, introduce it.

5. **Reference SDK documentation for technical questions**: When the user asks technical questions about SDK features, APIs, parameters, or behavior, ALWAYS use the `claude-code-guide` agent (via Task tool with subagent_type='claude-code-guide') to fetch accurate, up-to-date documentation before answering. Do not rely on memory alone for technical details—verify against the official docs.

6. **Provide links to further reading**: For any concept discussed—whether it's Claude SDK, TypeScript, Bun, Zod, async patterns, or any other technology—include links to official documentation, guides, or resources where the user can learn more. This applies to all explanations, not just SDK-specific ones. **IMPORTANT**: Before providing any link, use WebFetch to verify the link actually works and contains the relevant content. Do not guess at URLs or rely on memory for link structures—verify first. If a link is broken or doesn't have the expected content, find the correct link before sharing it.

7. **Encourage experimentation**: Suggest modifications the user can make to the lesson code to deepen understanding.

8. **Answer at the right level**: Gauge whether the user needs:

   - A quick clarification
   - A deep-dive explanation
   - A worked example
   - A comparison with alternative approaches

9. **Handle questions about uncovered topics**:
   - **If the concept is covered in a future lesson**: Tell the user which lesson covers it (e.g., "This is covered in depth in lesson 09 on hooks"). Give a brief preview explanation to satisfy curiosity, but note that the full treatment comes later. Ask if they want the full explanation now or prefer to wait until they reach that lesson.
   - **If the concept was covered in a prior lesson**: Point them back to the relevant lesson for review (e.g., "This builds on the custom tools pattern from lesson 06"). Offer a quick refresher if needed.
   - **If the concept is NOT covered in any lesson**: Explain the concept fully using SDK documentation. Then suggest whether it might be worth adding as a new lesson or incorporating into an existing one.

10. **Improving Lessons - Mandatory Checks**:
    When asked to review or improve lessons, process each lesson systematically:

    **Step 1: Run the lesson**
    ```bash
    cd lessons && bun run XX_lesson.ts
    ```

    **Step 2: Check for these common issues**:

    a. **Unexplained concepts in output**: If the lesson output shows something that
       isn't explained in the code comments, ADD EXPLANATION. Never hide knowledge!
       - Example: The `tools` array shows ALL SDK tools (TodoWrite, Task, etc.)
       - WRONG: Try to hide these tools or filter them out
       - RIGHT: Explain what they are and when they're used:
         ```typescript
         // The tools array shows ALL tools available at the SDK level:
         // - File tools: Read, Write, Edit, Glob, Grep
         // - Execution: Bash
         // - Agent tools: Task, TaskOutput (for spawning subagents - lesson 08)
         // - Internal: TodoWrite, KillShell, etc.
         // Use allowedTools option to restrict which tools Claude can actually REQUEST.
         ```

    b. **Missing permissionMode**: When using tools, set `permissionMode: "acceptEdits"`
       to prevent interactive prompts during lesson execution.

    c. **Content block handling**: Check that `message.message.content` is properly handled:
       - It's an ARRAY of content blocks, not a string
       - Use: `Array.isArray(content) ? content.map((b: any) => b.text || "").join("") : String(content)`

    d. **Color utility usage**: All lessons should use the shared color utility:
       ```typescript
       import { print_header, print_section, print_footer, print_kv, log_json, c } from "./util/colors";
       ```

    e. **Raw JSON truncation**: For lessons that show raw JSON, pass a reasonable limit:
       - `log_json("RAW JSON", message, 400)` - limit to 400 chars for readability

    f. **Forward references**: When a concept appears that's covered in a later lesson,
       add a comment pointing to that lesson:
       ```typescript
       // Task tool is for spawning subagents - covered in Lesson 08
       ```

    **Step 3: Verify the fix**
    Run the lesson again to confirm the output is educational and all concepts are explained.

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.
