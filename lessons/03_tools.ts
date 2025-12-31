/**
 * LESSON 03: Giving Claude Tools
 * ===============================
 *
 * WHAT YOU'LL LEARN:
 * - By default, Claude has NO tools - it can only respond with text
 * - You enable tools with the `allowedTools` option
 * - `permissionMode` controls whether tools need approval
 *
 * PREREQUISITE: Lesson 01-02 (query(), message types, content blocks)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: allowedTools Option                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.allowedTools: string[]                                │
 * │                                                                         │
 * │ Specifies which tools Claude can request. Without this option, Claude   │
 * │ can only respond with text - it cannot request any tool executions.     │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   allowedTools: ["Read", "Write", "Bash"]                               │
 * │                                                                         │
 * │ This is a WHITELIST - only the tools you list are available.            │
 * │ Use the minimum set needed for your task (principle of least privilege).│
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Built-in Tools                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The SDK provides these built-in tools:                                  │
 * │                                                                         │
 * │ FILE OPERATIONS:                                                        │
 * │   - Read      : Read file contents                                      │
 * │   - Write     : Create/overwrite a file                                 │
 * │   - Edit      : Make targeted edits to a file                           │
 * │   - Glob      : Find files by pattern (e.g., "*.ts")                    │
 * │   - Grep      : Search file contents with regex                         │
 * │                                                                         │
 * │ EXECUTION:                                                              │
 * │   - Bash      : Run shell commands                                      │
 * │                                                                         │
 * │ WEB:                                                                    │
 * │   - WebFetch  : Fetch URL contents                                      │
 * │   - WebSearch : Search the web                                          │
 * │                                                                         │
 * │ AGENT:                                                                  │
 * │   - Task      : Spawn subagents (see Lesson 08)                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: permissionMode Option                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.permissionMode: PermissionMode                        │
 * │                                                                         │
 * │ Controls how tool permissions are handled:                              │
 * │                                                                         │
 * │ | Mode               | Behavior                                       | │
 * │ |--------------------|------------------------------------------------| │
 * │ | "default"          | Prompts for dangerous operations               | │
 * │ | "acceptEdits"      | Auto-approve file operations (use in automation)│
 * │ | "bypassPermissions"| Skip ALL checks (dangerous! use carefully)     | │
 * │ | "plan"             | Read-only mode, no modifications allowed       | │
 * │                                                                         │
 * │ For automation, use "acceptEdits" to prevent blocking on prompts.       │
 * │ For interactive use, "default" gives safety with user confirmation.     │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_message_header, print_footer, print_section, print_kv, log_json, print_result } from "./util/colors";

print_header("LESSON 03: Giving Claude Tools");

// Let's ask Claude to list files - this requires the Bash tool
const result = query({
  prompt: "List all TypeScript files in the current directory",
  options: {
    /**
     * allowedTools: Whitelist of tools Claude can use.
     * Without this, Claude can only respond with text.
     */
    allowedTools: ["Bash"],

    /**
     * permissionMode: Controls approval flow for tool operations.
     * "acceptEdits" auto-approves file operations - good for automation.
     * "default" would prompt for confirmation on risky operations.
     */
    permissionMode: "acceptEdits",
  },
});

for await (const message of result) {
  print_message_header(message.type, (message as any).subtype);
  log_json("RAW JSON", message);
  print_section("PARSED:");

  if (message.type === "system" && (message as any).subtype === "init") {
    /**
     * ┌───────────────────────────────────────────────────────────────┐
     * │ KEY CONCEPT: tools vs allowedTools                            │
     * ├───────────────────────────────────────────────────────────────┤
     * │ The init message shows two different things:                  │
     * │                                                               │
     * │ 1. `tools` array in init message:                             │
     * │    ALL tools available at the SDK level. This is the full     │
     * │    capability set (Read, Write, Bash, Task, TodoWrite, etc.)  │
     * │                                                               │
     * │ 2. `allowedTools` option (what we set above):                 │
     * │    Which tools Claude can actually REQUEST. This is YOUR      │
     * │    whitelist that restricts what Claude can do.               │
     * │                                                               │
     * │ Think of it like this:                                        │
     * │   - tools = "what the SDK CAN do"                             │
     * │   - allowedTools = "what you ALLOW Claude to do"              │
     * │                                                               │
     * │ Since we set allowedTools: ["Bash"], Claude can ONLY request  │
     * │ Bash, even though the SDK has many more tools available.      │
     * └───────────────────────────────────────────────────────────────┘
     */
    const init = message as any;
    print_kv("SDK tools (full list)", init.tools?.length || 0);
    print_kv("Allowed for this query", "Bash only (via allowedTools option)");
    print_kv("Working directory", init.cwd);
  }

  if (message.type === "assistant") {
    const msg = message as any;

    if (msg.subtype === "tool_use") {
      /**
       * ┌───────────────────────────────────────────────────────────────┐
       * │ KEY CONCEPT: Assistant Message with subtype "tool_use"        │
       * ├───────────────────────────────────────────────────────────────┤
       * │ When Claude decides to use a tool, the assistant message has: │
       * │                                                               │
       * │ {                                                             │
       * │   type: "assistant",                                          │
       * │   subtype: "tool_use",                                        │
       * │   tool_use: {                                                 │
       * │     name: "Bash",        // Which tool                        │
       * │     id: "toolu_abc123",  // Links to tool_result              │
       * │     input: { ... }       // Parameters                        │
       * │   }                                                           │
       * │ }                                                             │
       * │                                                               │
       * │ This is Claude's REQUEST to call a tool - the tool hasn't    │
       * │ executed yet at this point.                                   │
       * └───────────────────────────────────────────────────────────────┘
       */
      print_kv("Claude requesting tool", msg.tool_use?.name);
      print_kv("Tool input", JSON.stringify(msg.tool_use?.input));
    } else if (message.message?.content) {
      // TEXT MESSAGE: Claude's response after seeing the tool result
      const content = message.message.content;
      const text = Array.isArray(content)
        ? content.map((b: any) => b.text || "").join("")
        : String(content);
      print_kv("Claude's response", text.substring(0, 200));
    }
  }

  if (message.type === "user") {
    // USER MESSAGE (TOOL RESULT): SDK executed the tool, sending result back to Claude
    print_kv("Event", "Tool result sent back to Claude");
    print_kv("Checkpoint UUID", message.uuid ?? "none");
  }

  if (message.type === "result") {
    print_result(message as any);
  }

  console.log("");
}

print_footer();

/**
 * EXPECTED MESSAGE FLOW:
 *
 * 1. system (init) - Shows Bash is available
 * 2. assistant (tool_use) - Claude requests Bash with "ls *.ts"
 * 3. user - SDK executes tool, sends result back to Claude
 * 4. assistant - Claude interprets the result
 * 5. result - Final status
 *
 *
 * TRY THIS:
 * - Remove `allowedTools` and see what happens (Claude can't list files)
 * - Add "Read" to allowedTools and ask Claude to read a file
 * - Try ["Glob", "Read"] and ask Claude to find and read all .ts files
 *
 *
 * SECURITY NOTE:
 * Be careful with Bash - it can run ANY command. In production:
 * - Use more specific tools (Read, Glob) when possible
 * - Use canUseTool callback to filter commands (lesson 15)
 * - Consider sandboxing (advanced topic)
 *
 *
 * KEY TAKEAWAYS:
 * 1. No tools = Claude can only respond with text, cannot request tool execution
 * 2. allowedTools is a whitelist - only listed tools can be requested
 * 3. permissionMode controls whether risky operations need approval
 * 4. Use the minimum tools needed for the task
 * 5. Tool requests show up as assistant messages with subtype "tool_use"
 * 6. SDK executes tools, results sent as "user" messages back to Claude
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - allowedTools option (string[] whitelist)
 * - permissionMode option (PermissionMode type)
 * - Built-in tools (Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch, Task)
 * - Tool use message flow (assistant tool_use → user tool_result → assistant)
 *
 * NEXT: Lesson 04 explores the Read tool for file access
 */
