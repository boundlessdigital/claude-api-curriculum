/**
 * LESSON 11: Complete Message Types Reference
 * ============================================
 *
 * WHAT YOU'LL LEARN:
 * - Every message type and subtype in detail
 * - The exact JSON structure of each message
 * - How to build a complete message handler
 *
 * PREREQUISITE: Lesson 01-02 (SDKMessage, content blocks)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: SDKMessage Union Type (Complete)                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ SDKMessage = SDKSystemMessage | SDKAssistantMessage | SDKUserMessage    │
 * │            | SDKResultMessage | SDKPartialAssistantMessage              │
 * │            | SDKCompactBoundaryMessage                                  │
 * │                                                                         │
 * │ | Type      | Subtypes                    | When it appears           | │
 * │ |-----------|-----------------------------|--------------------------| │
 * │ | system    | init, compact_boundary      | Start, context compaction| │
 * │ | assistant | undefined, tool_use         | Claude responds/calls    | │
 * │ | user      | undefined                   | Tool results, input      | │
 * │ | result    | success, error_*            | Always last message      | │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: SDKSystemMessage                                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ subtype: "init"                                                         │
 * │ {                                                                       │
 * │   type: "system",                                                       │
 * │   subtype: "init",                                                      │
 * │   session_id: string,     // For resuming                               │
 * │   model: string,          // Which Claude model                         │
 * │   tools: string[],        // Available tools                            │
 * │   cwd: string,            // Working directory                          │
 * │   mcp_servers: object,    // MCP server status                          │
 * │   permissionMode: string, // Current permission mode                    │
 * │ }                                                                       │
 * │                                                                         │
 * │ subtype: "compact_boundary"                                             │
 * │ - Indicates context was compacted (long conversations)                  │
 * │ - compact_metadata contains compaction details                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: SDKResultMessage (Complete)                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ ALWAYS the last message. Contains final status and metrics.             │
 * │                                                                         │
 * │ SUBTYPES:                                                               │
 * │ - success: Task completed normally                                      │
 * │ - error_max_turns: Hit maxTurns limit                                   │
 * │ - error_max_budget_usd: Hit maxBudgetUsd limit                          │
 * │ - error_during_execution: Tool or internal error                        │
 * │ - error_max_structured_output_retries: JSON validation failed           │
 * │                                                                         │
 * │ KEY FIELDS:                                                             │
 * │ - result: string (final response text)                                  │
 * │ - structured_output: object (if using outputFormat)                     │
 * │ - total_cost_usd: number                                                │
 * │ - usage: { input_tokens, output_tokens, ... }                           │
 * │ - modelUsage: { [model]: { costUSD, tokens } }                          │
 * │ - permission_denials: array (if canUseTool blocked)                     │
 * │ - errors: string[] (on failure)                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS MATTERS:
 * Lessons 1-10 showed simplified handlers. In production, you need to
 * handle EVERY message type correctly. Missing one can cause bugs or
 * lost data.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_result, print_success, c } from "./util/colors";

print_header("LESSON 11: Complete Message Types Reference");

// Comprehensive message handler that logs raw JSON and processes each type
async function handle_all_messages(prompt: string) {
  const result = query({
    prompt,
    options: {
      allowedTools: ["Bash", "Read"],
      permissionMode: "acceptEdits",
    },
  });

  const messages_by_type: Record<string, any[]> = {
    system: [],
    assistant: [],
    user: [],
    result: [],
  };

  for await (const message of result) {
    // Store for later analysis
    messages_by_type[message.type]?.push(message);

    // Log raw JSON
    print_section(`\n📨 MESSAGE TYPE: ${message.type}`);
    log_json("RAW JSON", message);

    // Type-specific handling
    switch (message.type) {
      // ================================================
      // SYSTEM MESSAGES
      // ================================================
      case "system": {
        const sys = message as any;

        if (sys.subtype === "init") {
          /**
           * INIT MESSAGE - First message in every stream
           *
           * Contains session metadata you'll need:
           * - session_id: For resuming later
           * - model: Which Claude model is running
           * - tools: What tools are available
           * - cwd: Working directory
           * - mcp_servers: External tool servers status
           */
          print_success("PARSED: Session initialized");
          print_kv("Session", sys.session_id);
          print_kv("Model", sys.model);
          print_kv("Tools", sys.tools?.join(", ") || "none");
        } else if (sys.subtype === "compact_boundary") {
          /**
           * COMPACT_BOUNDARY - Conversation was compressed
           *
           * Long conversations get compacted to save context.
           * This marks where compaction happened.
           */
          print_section("📦 PARSED: Context compacted");
          print_kv("Trigger", sys.compact_metadata?.trigger);
          print_kv("Pre-tokens", sys.compact_metadata?.pre_tokens);
        }
        break;
      }

      // ================================================
      // ASSISTANT MESSAGES
      // ================================================
      case "assistant": {
        const asst = message as any;

        /**
         * ASSISTANT CONTENT - Both text and tool_use are content blocks
         *
         * Content is an array that can contain:
         * - { type: "text", text: "..." } - Claude's text response
         * - { type: "tool_use", id: "...", name: "...", input: {...} } - Tool call
         *
         * NOTE: tool_use is in content blocks, NOT as a separate "subtype"!
         */
        const content = asst.message?.content;
        if (typeof content === "string") {
          print_section("💬 PARSED: Assistant response");
          console.log(`  ${c.value(`"${content.substring(0, 100)}..."`)}`);
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text" && block.text) {
              print_section("💬 PARSED: Text block");
              console.log(`  ${c.value(`"${block.text.substring(0, 100)}..."`)}`);
            } else if (block.type === "tool_use") {
              /**
               * TOOL_USE - Claude is calling a tool
               *
               * Key fields:
               * - id: Links to the tool_result later
               * - name: Which tool
               * - input: Parameters for the tool
               */
              print_section("🔧 PARSED: Tool request");
              print_kv("Tool", block.name);
              print_kv("ID", block.id);
              print_kv("Input", JSON.stringify(block.input));
            }
          }
        }
        break;
      }

      // ================================================
      // USER MESSAGES
      // ================================================
      case "user": {
        /**
         * USER MESSAGE - Tool results or your input
         *
         * Key fields:
         * - uuid: Checkpoint ID (for file rewinding)
         * - message.content: Usually tool_result blocks
         */
        const usr = message as any;
        print_section("📥 PARSED: User/Tool result message");
        print_kv("UUID", usr.uuid);

        const content = usr.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_result") {
              print_kv("Tool result for", block.tool_use_id);
              const result_preview =
                typeof block.content === "string"
                  ? block.content.substring(0, 100)
                  : JSON.stringify(block.content).substring(0, 100);
              console.log(`  ${c.label("Content:")} ${c.dim(result_preview + "...")}`);
            }
          }
        }
        break;
      }

      // ================================================
      // RESULT MESSAGES
      // ================================================
      case "result": {
        /**
         * RESULT MESSAGE - ALWAYS the last message
         *
         * Subtypes:
         * - success: Task completed
         * - error_max_turns: Too many back-and-forth
         * - error_max_budget_usd: Cost limit hit
         * - error_during_execution: Tool or internal error
         * - error_max_structured_output_retries: JSON output kept failing
         */
        const res = message as any;
        print_section("✅ PARSED: Final result");
        print_kv("Status", res.subtype);
        print_kv("Is Error", res.is_error);
        print_kv("Cost", `$${res.total_cost_usd?.toFixed(4)}`);
        print_kv("Turns", res.num_turns);
        print_kv("Duration", `${res.duration_ms}ms`);
        print_kv("API Time", `${res.duration_api_ms}ms`);

        // Usage breakdown
        if (res.usage) {
          print_kv("Input tokens", res.usage.input_tokens);
          print_kv("Output tokens", res.usage.output_tokens);
          print_kv("Cache read", res.usage.cache_read_input_tokens);
        }

        // Per-model usage (useful with subagents)
        if (res.modelUsage) {
          console.log(c.label("  → Model breakdown:"));
          for (const [model, usage] of Object.entries(res.modelUsage as any)) {
            console.log(`    ${c.highlight(model)}: ${c.value(`$${usage.costUSD?.toFixed(4)}`)}`);
          }
        }

        // Error details
        if (res.subtype !== "success") {
          print_kv("Errors", JSON.stringify(res.errors));
        }

        // Permission denials
        if (res.permission_denials?.length > 0) {
          console.log(c.label("  → Permission denials:"));
          for (const denial of res.permission_denials) {
            console.log(`    ${c.error("•")} ${c.highlight(denial.tool_name)}: ${c.dim(denial.reason)}`);
          }
        }

        // Structured output (if using outputFormat)
        if (res.structured_output) {
          print_kv("Structured output", JSON.stringify(res.structured_output));
        }
        break;
      }
    }
  }

  return messages_by_type;
}

// Run the demo
print_section("Starting comprehensive message demo...");
const demo_prompt = "List files in current directory";
console.log(`📤 Prompt: ${demo_prompt}\n`);
const collected = await handle_all_messages(demo_prompt);

print_section("\n📊 SUMMARY: Messages collected by type");
for (const [type, messages] of Object.entries(collected)) {
  print_kv(type, `${messages.length} message(s)`);
}

print_footer("END OF LESSON");

/**
 * COMPLETE MESSAGE TYPE REFERENCE:
 *
 * ┌─────────────┬────────────────────────────────────────────────────────────┐
 * │ system/init │ First message. Contains session_id, model, tools, cwd.    │
 * ├─────────────┼────────────────────────────────────────────────────────────┤
 * │ assistant   │ Claude's response. Check subtype for tool_use vs text.    │
 * ├─────────────┼────────────────────────────────────────────────────────────┤
 * │ user        │ Tool results. UUID is checkpoint for file rewinding.      │
 * ├─────────────┼────────────────────────────────────────────────────────────┤
 * │ result      │ ALWAYS last. Has subtype for success/error, cost, usage.  │
 * └─────────────┴────────────────────────────────────────────────────────────┘
 *
 *
 * ERROR SUBTYPES IN RESULT MESSAGE:
 *
 * - success: All good
 * - error_max_turns: Hit maxTurns limit
 * - error_max_budget_usd: Hit maxBudgetUsd limit
 * - error_during_execution: Tool failed or internal error
 * - error_max_structured_output_retries: JSON output validation kept failing
 *
 *
 * KEY TAKEAWAYS:
 * 1. ALWAYS handle the result message - it tells you if the task succeeded
 * 2. Check result.subtype, not just result.is_error
 * 3. system/init has session_id you need for resuming
 * 4. user.uuid is a checkpoint for file rewinding
 * 5. Log raw JSON during development to understand the structure
 */
