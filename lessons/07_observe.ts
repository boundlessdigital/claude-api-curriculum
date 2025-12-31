/**
 * LESSON 07: Observing Tool Use (Raw Message Inspection)
 * ======================================================
 *
 * WHAT YOU'LL LEARN:
 * - How to see EXACTLY what Claude sends and receives
 * - The structure of tool_use and tool_result messages
 * - How to build audit logs and debugging tools
 *
 * PREREQUISITE: Lesson 02-03 (content blocks, tool use flow)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Message Stream Inspection                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The AsyncGenerator from query() yields complete message objects.        │
 * │ You can store and inspect every message for:                            │
 * │                                                                         │
 * │ - DEBUGGING: See exactly what Claude sent and received                  │
 * │ - AUDIT LOGS: Create compliance trails of agent actions                 │
 * │ - SECURITY: Monitor for unexpected behavior or violations               │
 * │ - ANALYSIS: Understand the agent's decision-making process              │
 * │                                                                         │
 * │ PATTERN:                                                                │
 * │   const all_messages: SDKMessage[] = [];                                │
 * │   for await (const msg of query(...)) {                                 │
 * │     all_messages.push(msg);  // Collect for later analysis              │
 * │     // ... also process in real-time                                    │
 * │   }                                                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Tool Use ID Linking                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Tool calls and their results are linked by a unique ID:                 │
 * │                                                                         │
 * │ ASSISTANT MESSAGE (tool call):                                          │
 * │   tool_use.id = "toolu_abc123"                                          │
 * │                                                                         │
 * │ USER MESSAGE (tool result):                                             │
 * │   tool_result.tool_use_id = "toolu_abc123"  ← Same ID!                  │
 * │                                                                         │
 * │ This linking allows you to:                                             │
 * │   - Match requests to responses                                         │
 * │   - Track tool execution latency                                        │
 * │   - Debug tool failures                                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS MATTERS:
 * In production, you need to:
 * - Debug why an agent did something unexpected
 * - Create audit trails for compliance
 * - Monitor for security issues
 * - Understand the agent's "thought process"
 *
 * This lesson shows you the RAW JSON of every message.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { c, print_header, print_section, print_kv, log_json, print_result, print_success, print_error } from "./util/colors";

print_header("LESSON 07: Observing Tool Use");

// We'll collect all messages for inspection
const all_messages: any[] = [];

const prompt = "List files in current directory and tell me how many there are";

// Show the prompt being sent
console.log(`📤 Prompt: ${prompt}\n`);

const result = query({
  prompt,
  options: {
    allowedTools: ["Bash"],
    permissionMode: "acceptEdits",
  },
});

print_section("RAW MESSAGE STREAM");

for await (const message of result) {
  all_messages.push(message);
  log_json(`${message.type.toUpperCase()} MESSAGE`, message);
}

// Now let's analyze what we captured
print_section("MESSAGE ANALYSIS");

for (const msg of all_messages) {
  switch (msg.type) {
    case "system":
      if (msg.subtype === "init") {
        console.log(c.section("📋 INIT MESSAGE:"));
        print_kv("Session ID", msg.session_id, 3);
        print_kv("Model", msg.model, 3);
        print_kv("Available tools", msg.tools?.join(", "), 3);
        print_kv("CWD", msg.cwd, 3);
      }
      break;

    case "assistant":
      // Tool use and text responses are in message.content as blocks
      const content = msg.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "tool_use") {
            // This is Claude REQUESTING a tool
            console.log(c.section("🔧 TOOL REQUEST:"));
            print_kv("Tool", block.name, 3);
            print_kv("ID", block.id, 3);
            print_kv("Input", JSON.stringify(block.input), 3);
          } else if (block.type === "text" && block.text) {
            // This is Claude's text response
            console.log(c.section("💬 ASSISTANT TEXT:"));
            console.log(`   ${c.value(block.text.substring(0, 200))}${block.text.length > 200 ? '...' : ''}`);
          }
        }
      } else if (typeof content === "string") {
        console.log(c.section("💬 ASSISTANT TEXT:"));
        console.log(`   ${c.value(content.substring(0, 200))}${content.length > 200 ? '...' : ''}`);
      }
      break;

    case "user":
      // This is a tool RESULT being sent back to Claude
      console.log(c.section("📥 TOOL RESULT (user message):"));
      print_kv("UUID", msg.uuid, 3);
      const user_content = msg.message?.content;
      if (Array.isArray(user_content)) {
        for (const block of user_content) {
          if (block.type === "tool_result") {
            print_kv("Tool Use ID", block.tool_use_id, 3);
            print_kv("Result", JSON.stringify(block.content).substring(0, 200) + "...", 3);
          }
        }
      }
      break;

    case "result":
      if (msg.subtype === "success") {
        print_success("FINAL RESULT");
      } else {
        print_error("FINAL RESULT (with errors)");
      }
      print_kv("Status", msg.subtype, 3);
      print_kv("Turns", msg.num_turns, 3);
      print_kv("Cost", "$" + msg.total_cost_usd?.toFixed(4), 3);
      print_kv("Duration", msg.duration_ms + "ms", 3);
      if (msg.subtype !== "success") {
        print_kv("Errors", JSON.stringify(msg.errors), 3);
      }
      break;
  }
  console.log("");
}

/**
 * MESSAGE FLOW WHEN CLAUDE USES A TOOL:
 *
 * 1. system (init) - Session starts
 *    {
 *      "type": "system",
 *      "subtype": "init",
 *      "session_id": "abc123",
 *      "model": "claude-sonnet-...",
 *      "tools": ["Bash"],
 *      "cwd": "/path/to/dir"
 *    }
 *
 * 2. assistant (tool_use) - Claude decides to call a tool
 *    {
 *      "type": "assistant",
 *      "message": {
 *        "role": "assistant",
 *        "content": [{
 *          "type": "tool_use",
 *          "id": "toolu_123",
 *          "name": "Bash",
 *          "input": { "command": "ls -la" }
 *        }]
 *      }
 *    }
 *    NOTE: Tool calls are content blocks with type "tool_use",
 *    NOT a separate "subtype" or "tool_use" property.
 *
 * 3. user - Tool result sent back
 *    {
 *      "type": "user",
 *      "uuid": "msg_456",
 *      "message": {
 *        "content": [{
 *          "type": "tool_result",
 *          "tool_use_id": "toolu_123",
 *          "content": "file1.ts\nfile2.ts\n..."
 *        }]
 *      }
 *    }
 *
 * 4. assistant - Claude's response after seeing result
 *    {
 *      "type": "assistant",
 *      "message": {
 *        "content": [{ "type": "text", "text": "There are 5 files..." }]
 *      }
 *    }
 *
 * 5. result - Final summary
 *    {
 *      "type": "result",
 *      "subtype": "success",
 *      "total_cost_usd": 0.001234,
 *      "num_turns": 1
 *    }
 *
 *
 * IMPORTANT FIELDS:
 *
 * - tool_use.id: Links a tool call to its result
 * - user.uuid: Checkpoint ID for file rewinding
 * - session_id: Needed to resume conversations
 * - parent_tool_use_id: Set when running inside a subagent
 *
 *
 * KEY TAKEAWAYS:
 * 1. Every message has raw JSON you can inspect
 * 2. Tool calls and results are linked by tool_use_id
 * 3. User message UUIDs are checkpoints you can rewind to
 * 4. Always check the result message for success/failure
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - Message stream collection pattern
 * - Tool use ID linking (tool_use.id ↔ tool_result.tool_use_id)
 * - User message UUID (checkpoint for rewinding)
 * - Full message flow with tool use
 * - Audit logging patterns
 *
 * NEXT: Lesson 08 explores subagents for task delegation
 */
