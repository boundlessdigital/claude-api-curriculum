/**
 * LESSON 01: Hello Agent
 * ======================
 *
 * WHAT YOU'LL LEARN:
 * - The `query()` function - the main entry point to the SDK
 * - The async iteration pattern for consuming agent output
 * - SDKMessage types in the stream
 * - The session_id concept for persistence
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: query() Function                                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The `query()` function is the primary way to interact with agents.      │
 * │                                                                         │
 * │ SIGNATURE (from SDK docs):                                              │
 * │   function query({                                                      │
 * │     prompt: string | AsyncIterable<SDKUserMessage>;                     │
 * │     options?: Options;                                                  │
 * │   }): Query                                                             │
 * │                                                                         │
 * │ RETURNS: An AsyncGenerator that yields SDKMessage objects.              │
 * │                                                                         │
 * │ WHY A STREAM? Unlike a simple API call that returns one response,       │
 * │ agents are autonomous - they can use tools, spawn subagents, and        │
 * │ perform multiple operations. The stream lets you observe everything     │
 * │ as it happens.                                                          │
 * │                                                                         │
 * │ KEY DIFFERENCE FROM CLIENT SDK: With the Client SDK, YOU implement      │
 * │ the tool loop. With the Agent SDK, Claude handles tool execution        │
 * │ autonomously, and you just observe the stream.                          │
 * │                                                                         │
 * │ DOCS: https://docs.anthropic.com/en/docs/claude-agent-sdk               │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { c, print_header, print_message_header, print_footer, print_kv, print_section } from "./util/colors";

print_header("LESSON 01: Hello Agent - The query() Function");

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Options Type                                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The second parameter to query() is an optional Options object.          │
 * │                                                                         │
 * │ Common options (we'll explore these in later lessons):                  │
 * │   - allowedTools: string[]        - Which tools Claude can use          │
 * │   - permissionMode: PermissionMode - How permissions are handled        │
 * │   - systemPrompt: string          - Custom instructions for Claude      │
 * │   - maxBudgetUsd: number          - Cost limit                          │
 * │   - maxTurns: number              - Turn limit                          │
 * │   - resume: string                - Session ID to continue              │
 * │   - agents: Record<string, AgentDefinition> - Subagent definitions      │
 * │   - hooks: Partial<Record<HookEvent, HookCallbackMatcher[]>> - Hooks    │
 * │   - mcpServers: Record<string, McpServerConfig> - External tools        │
 * │   - outputFormat: { type: 'json_schema', schema } - Structured output   │
 * │                                                                         │
 * │ For this lesson, we set allowedTools: [] (no tools).                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// query() takes an object with:
// - prompt: what you want Claude to do (string or AsyncIterable)
// - options: configuration (optional, covered in later lessons)
const result = query({
  prompt: "What is 2 + 2? Reply with just the number.",
  options: {
    /**
     * allowedTools: [] means NO tools - Claude can only respond with text.
     * This is the simplest mode. In lesson 03, we'll add tools.
     *
     * NOTE: Without this option, Claude has access to ALL built-in tools.
     * Always explicitly set allowedTools for predictable behavior.
     */
    allowedTools: [],
  },
});

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Async Iteration Pattern                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The standard pattern for consuming query() output:                      │
 * │                                                                         │
 * │   for await (const message of query({ prompt: "..." })) {               │
 * │     // Process each message as it arrives                               │
 * │   }                                                                     │
 * │                                                                         │
 * │ query() returns an AsyncGenerator (also called Query), which is an      │
 * │ async iterable. You MUST iterate it with `for await...of` to receive    │
 * │ the messages.                                                           │
 * │                                                                         │
 * │ This is the pattern used throughout the SDK documentation.              │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: SDKMessage (Union Type)                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The stream yields messages of different types. Each message has a       │
 * │ `type` field that tells you what kind it is.                            │
 * │                                                                         │
 * │ SDKMessage is a union of:                                               │
 * │   - SDKSystemMessage      (type: "system")                              │
 * │   - SDKAssistantMessage   (type: "assistant")                           │
 * │   - SDKUserMessage        (type: "user")                                │
 * │   - SDKResultMessage      (type: "result")                              │
 * │   - SDKPartialAssistantMessage (type: "stream_event") - if streaming    │
 * │   - SDKCompactBoundaryMessage  (type: "system", subtype: "compact_...")  │
 * │                                                                         │
 * │ MESSAGE FLOW (simple query without tools):                              │
 * │   system (init) → assistant → result                                    │
 * │                                                                         │
 * │ MESSAGE FLOW (with tool use):                                           │
 * │   system → assistant (tool_use) → user (tool_result) → assistant → result│
 * └─────────────────────────────────────────────────────────────────────────┘
 */

for await (const message of result) {
  print_message_header(message.type, (message as any).subtype);

  console.log(c.dim("RAW JSON:"));
  console.log(c.dim(JSON.stringify(message, null, 2)));
  console.log("");

  print_section("📋 PARSED:");

  if (message.type === "system") {
    /**
     * ┌─────────────────────────────────────────────────────────────────┐
     * │ KEY CONCEPT: SDKSystemMessage (init)                            │
     * ├─────────────────────────────────────────────────────────────────┤
     * │ First message in every stream (when subtype is "init").         │
     * │                                                                 │
     * │ STRUCTURE:                                                      │
     * │ {                                                               │
     * │   type: "system",                                               │
     * │   subtype: "init",                                              │
     * │   uuid: UUID,                                                   │
     * │   session_id: string,    ← IMPORTANT: Save for resuming         │
     * │   apiKeySource: string,                                         │
     * │   cwd: string,                                                  │
     * │   tools: string[],       ← ALL available tools at SDK level     │
     * │   mcp_servers: Array,    ← External tool servers                │
     * │   model: string,         ← Which Claude model                   │
     * │   permissionMode: PermissionMode,                               │
     * │   slash_commands: string[],                                     │
     * │   output_style: string                                          │
     * │ }                                                               │
     * │                                                                 │
     * │ NOTE: The `tools` array shows ALL tools available to the SDK,   │
     * │ including internal ones like Task, TodoWrite, etc. This is      │
     * │ the full capability set. Use `allowedTools` option to restrict  │
     * │ which tools Claude can actually USE (covered in Lesson 03).     │
     * │                                                                 │
     * │ The session_id is crucial - save it to resume later (Lesson 10).│
     * └─────────────────────────────────────────────────────────────────┘
     */
    print_kv("Session started", "✓");
    print_kv("Session ID", message.session_id);
    print_kv("Model", (message as any).model);

    /**
     * The tools array shows ALL tools available at the SDK level.
     * This includes:
     * - File tools: Read, Write, Edit, Glob, Grep
     * - Execution: Bash
     * - Web: WebFetch, WebSearch
     * - Agent tools: Task, TaskOutput (for subagents)
     * - Internal tools: TodoWrite, KillShell, etc.
     *
     * In Lesson 03, you'll learn to use `allowedTools` to restrict
     * which of these tools Claude can actually request.
     */
    const tools = (message as any).tools || [];
    print_kv("Available tools (SDK level)", tools.length);
    console.log(`  ${c.dim("Common tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch")}`);
    console.log(`  ${c.dim("Agent tools: Task, TaskOutput (for spawning subagents)")}`);
    console.log(`  ${c.info("💡 Save session_id to resume this conversation later!")}`);
    console.log(`  ${c.info("💡 Use allowedTools option to restrict tool access (Lesson 03)")}`);
  }

  if (message.type === "assistant") {
    /**
     * ┌─────────────────────────────────────────────────────────────────┐
     * │ KEY CONCEPT: SDKAssistantMessage                                │
     * ├─────────────────────────────────────────────────────────────────┤
     * │ Claude's response(s). May appear multiple times if using tools. │
     * │                                                                 │
     * │ STRUCTURE:                                                      │
     * │ {                                                               │
     * │   type: "assistant",                                            │
     * │   uuid: UUID,                                                   │
     * │   session_id: string,                                           │
     * │   message: {                                                    │
     * │     role: "assistant",                                          │
     * │     content: string | ContentBlock[]  ← See Lesson 02           │
     * │   },                                                            │
     * │   parent_tool_use_id: string | null                             │
     * │ }                                                               │
     * │                                                                 │
     * │ The `content` field can be a string OR an array of content      │
     * │ blocks. Lesson 02 covers content blocks in depth.               │
     * └─────────────────────────────────────────────────────────────────┘
     */
    const content = message.message?.content;
    if (typeof content === "string") {
      console.log(`  ${c.label("→ Claude says:")} ${c.value(content)}`);
    } else if (Array.isArray(content)) {
      // Content blocks - covered in depth in Lesson 02
      for (const block of content) {
        if (block.type === "text") {
          console.log(`  ${c.label("→ Claude says:")} ${c.value(block.text)}`);
        }
      }
    }
  }

  if (message.type === "result") {
    /**
     * ┌─────────────────────────────────────────────────────────────────┐
     * │ KEY CONCEPT: SDKResultMessage                                   │
     * ├─────────────────────────────────────────────────────────────────┤
     * │ ALWAYS the last message. Contains final status and metrics.     │
     * │                                                                 │
     * │ SUCCESS STRUCTURE:                                              │
     * │ {                                                               │
     * │   type: "result",                                               │
     * │   subtype: "success",                                           │
     * │   uuid: UUID,                                                   │
     * │   session_id: string,                                           │
     * │   duration_ms: number,      ← Total time                        │
     * │   duration_api_ms: number,  ← API time only                     │
     * │   is_error: false,                                              │
     * │   num_turns: number,        ← Conversation turns                │
     * │   result: string,           ← Final response text               │
     * │   total_cost_usd: number,   ← Total cost                        │
     * │   usage: Usage,             ← Token counts                      │
     * │   modelUsage: {...},        ← Per-model breakdown               │
     * │   permission_denials: [],                                       │
     * │   structured_output?: any   ← If using outputFormat             │
     * │ }                                                               │
     * │                                                                 │
     * │ ERROR SUBTYPES (Lesson 12 covers these):                        │
     * │   - "error_max_turns"                                           │
     * │   - "error_max_budget_usd"                                      │
     * │   - "error_during_execution"                                    │
     * │   - "error_max_structured_output_retries"                       │
     * └─────────────────────────────────────────────────────────────────┘
     */
    const res = message as any;
    console.log(`  ${c.label("→ Status:")} ${c.success(res.subtype)}`);
    console.log(`  ${c.label("→ Cost:")} ${c.value("$" + res.total_cost_usd?.toFixed(4))}`);
    console.log(`  ${c.label("→ Turns:")} ${c.value(String(res.num_turns))}`);
    console.log(`  ${c.label("→ Duration:")} ${c.value(res.duration_ms + "ms")}`);
  }

  console.log("");
}

print_footer();

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: session_id                                                 │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The session_id uniquely identifies a conversation. It appears in:       │
 * │   - SDKSystemMessage (init) - first place to capture it                 │
 * │   - SDKResultMessage - also available here                              │
 * │   - All other message types                                             │
 * │                                                                         │
 * │ USE CASES:                                                              │
 * │   - Resume a conversation later (options.resume = session_id)           │
 * │   - Fork a conversation (options.resume + options.forkSession)          │
 * │   - Track conversations in your database                                │
 * │                                                                         │
 * │ Sessions persist on disk in ~/.claude-code/sessions/                    │
 * │ See Lesson 10 for full session handling.                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/**
 * ============================================================================
 * TRY THIS
 * ============================================================================
 *
 * 1. Change the prompt and observe how the output changes
 *
 * 2. Try a prompt that would use tools:
 *    prompt: "List the files in the current directory"
 *    (You'll see additional message types - we cover this in lesson 03)
 *
 * 3. Remove the JSON.stringify and write your own message handler
 *
 * ============================================================================
 * KEY TAKEAWAYS
 * ============================================================================
 *
 * 1. query() is the main entry point - returns an AsyncGenerator (Query)
 * 2. Use `for await (const message of query(...))` to consume the stream
 * 3. Every message has a `type` field - check it first
 * 4. SDKMessage types: system, assistant, user, result (and more)
 * 5. system/init message has session_id - save it for resuming
 * 6. result message is ALWAYS last - check subtype for success/error
 * 7. Claude handles tool execution autonomously (unlike Client SDK)
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - query() function
 * - Options type (overview)
 * - SDKMessage union type
 * - SDKSystemMessage (init)
 * - SDKAssistantMessage
 * - SDKResultMessage
 * - session_id
 * - Async iteration pattern
 *
 * NEXT: Lesson 02 explores content blocks - the typed structure inside messages
 */
