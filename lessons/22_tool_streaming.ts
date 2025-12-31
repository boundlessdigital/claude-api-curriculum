/**
 * LESSON 22: Tool Execution Streaming & Observation
 * ==================================================
 *
 * WHAT YOU'LL LEARN:
 * - How to observe tool execution in real-time
 * - Using hooks to track tool lifecycle (start, end, failure)
 * - Partial message streaming for responsive UIs
 * - Building tool execution timelines and audit trails
 * - Correlating tool requests with results via IDs
 *
 * PREREQUISITE: Lesson 07 (streaming), Lesson 09 (hooks)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Tool Execution Message Flow                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Tools execute in a 3-step message pattern:                              │
 * │                                                                         │
 * │ 1. SDKAssistantMessage with tool_use block (Claude requests tool)      │
 * │    └─ { type: "tool_use", id: "toolu_123", name: "Bash", input: {...} } │
 * │                                                                         │
 * │ 2. SDKUserMessage with tool_result (Result sent back)                  │
 * │    └─ { type: "tool_result", tool_use_id: "toolu_123", content: "..." } │
 * │                                                                         │
 * │ 3. SDKAssistantMessage (Claude processes result)                       │
 * │    └─ { type: "text", text: "The command returned..." }                │
 * │                                                                         │
 * │ The tool_use_id links request to result.                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Tool Lifecycle Hooks                                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Hooks provide real-time tool execution events:                          │
 * │                                                                         │
 * │ PreToolUse:                                                             │
 * │   Fires BEFORE tool executes                                            │
 * │   → Log start time, validate inputs, check permissions                  │
 * │                                                                         │
 * │ PostToolUse:                                                            │
 * │   Fires AFTER tool completes successfully                               │
 * │   → Log duration, capture output, update metrics                        │
 * │                                                                         │
 * │ PostToolUseFailure:                                                     │
 * │   Fires when tool execution fails                                       │
 * │   → Log error, trigger alerts, handle recovery                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: includePartialMessages Option                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.includePartialMessages: boolean                       │
 * │                                                                         │
 * │ When true, yields streaming events as Claude generates text:            │
 * │                                                                         │
 * │ {                                                                       │
 * │   type: "stream_event",                                                 │
 * │   event: RawMessageStreamEvent  // Token-by-token streaming             │
 * │ }                                                                       │
 * │                                                                         │
 * │ Use for: Real-time UI updates, typing indicators, progress display     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS MATTERS:
 * - Real-time feedback for long-running tools
 * - Performance monitoring and latency tracking
 * - Debugging tool failures
 * - Building audit trails for compliance
 * - Creating responsive user interfaces
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_success, print_error, print_warning, c } from "./util/colors";

print_header("LESSON 22: Tool Execution Streaming & Observation");

// ==================================================
// PART 1: Tool Execution Timeline
// ==================================================

print_section("Part 1: Building a Tool Execution Timeline");

/**
 * TOOL TIMELINE:
 * Track every tool execution with timestamps for:
 * - Performance analysis
 * - Debugging slow tools
 * - Audit trails
 */

interface ToolEvent {
  event: "tool_start" | "tool_end" | "tool_error";
  timestamp: number;
  tool_name: string;
  tool_id: string;
  input?: any;
  output?: string;
  error?: string;
  duration_ms?: number;
}

const tool_timeline: ToolEvent[] = [];
const tool_start_times: Map<string, number> = new Map();

const prompt1 = "List files in the current directory and count them";
console.log(`📤 Prompt: ${prompt1}\n`);

const result1 = query({
  prompt: prompt1,
  options: {
    allowedTools: ["Glob", "Bash"],
    permissionMode: "acceptEdits",

    /**
     * HOOKS FOR TOOL LIFECYCLE:
     * These fire at key moments during tool execution.
     */
    hooks: {
      /**
       * PRE-TOOL-USE HOOK:
       * Fires before each tool executes.
       * Use for: logging, timing, validation
       */
      PreToolUse: [
        {
          matcher: ".*", // Match all tools
          hooks: [
            async (input) => {
              const start_time = Date.now();
              tool_start_times.set(input.tool_use_id, start_time);

              tool_timeline.push({
                event: "tool_start",
                timestamp: start_time,
                tool_name: input.tool_name,
                tool_id: input.tool_use_id,
                input: input.tool_input,
              });

              console.log(`${c.highlight("⏱️ TOOL START:")} ${c.value(input.tool_name)}`);
              console.log(`   ${c.dim("ID:")} ${input.tool_use_id}`);
              console.log(`   ${c.dim("Input:")} ${JSON.stringify(input.tool_input).substring(0, 100)}`);

              return {}; // Allow tool to proceed
            },
          ],
        },
      ],

      /**
       * POST-TOOL-USE HOOK:
       * Fires after tool completes successfully.
       * Use for: timing, logging results, metrics
       */
      PostToolUse: [
        {
          matcher: ".*",
          hooks: [
            async (input) => {
              const end_time = Date.now();
              const start_time = tool_start_times.get(input.tool_use_id) || end_time;
              const duration = end_time - start_time;

              tool_timeline.push({
                event: "tool_end",
                timestamp: end_time,
                tool_name: input.tool_name,
                tool_id: input.tool_use_id,
                output: String(input.tool_response).substring(0, 200),
                duration_ms: duration,
              });

              console.log(`${c.success("✅ TOOL END:")} ${c.value(input.tool_name)}`);
              console.log(`   ${c.dim("Duration:")} ${duration}ms`);
              console.log(`   ${c.dim("Output:")} ${String(input.tool_response).substring(0, 80)}...`);

              return {};
            },
          ],
        },
      ],

      /**
       * POST-TOOL-USE-FAILURE HOOK:
       * Fires when tool execution fails.
       * Use for: error logging, alerts, recovery
       */
      PostToolUseFailure: [
        {
          hooks: [
            async (input) => {
              const end_time = Date.now();
              const start_time = tool_start_times.get(input.tool_use_id) || end_time;

              tool_timeline.push({
                event: "tool_error",
                timestamp: end_time,
                tool_name: input.tool_name,
                tool_id: input.tool_use_id,
                error: String(input.error),
                duration_ms: end_time - start_time,
              });

              console.log(`${c.error("❌ TOOL ERROR:")} ${c.value(input.tool_name)}`);
              console.log(`   ${c.dim("Error:")} ${String(input.error).substring(0, 100)}`);

              return {};
            },
          ],
        },
      ],
    },
  },
});

for await (const message of result1) {
  if (message.type === "result") {
    print_success("Query complete");
  }
}

// Display timeline
console.log("");
print_section("📊 Tool Execution Timeline");
for (const event of tool_timeline) {
  const icon = event.event === "tool_start" ? "▶️" : event.event === "tool_end" ? "✅" : "❌";
  console.log(`   ${icon} ${c.highlight(event.tool_name)} (${event.event})`);
  if (event.duration_ms) {
    console.log(`      ${c.dim("Duration:")} ${event.duration_ms}ms`);
  }
}

// ==================================================
// PART 2: Correlating Tool Requests and Results
// ==================================================

console.log("");
print_section("Part 2: Tool Request/Result Correlation");

/**
 * TOOL USE ID:
 * Each tool request has a unique ID that links to its result.
 * This allows you to track which result belongs to which request.
 */

interface ToolCorrelation {
  id: string;
  name: string;
  input: any;
  result?: string;
  request_time?: number;
  result_time?: number;
}

const tool_correlations: Map<string, ToolCorrelation> = new Map();

const prompt2 = "What is 2+2? Also, what files are in /tmp?";
console.log(`📤 Prompt: ${prompt2}\n`);

const result2 = query({
  prompt: prompt2,
  options: {
    allowedTools: ["Bash", "Glob"],
    permissionMode: "acceptEdits",
  },
});

for await (const message of result2) {
  print_section(`--- ${message.type} ---`);

  // Track tool requests (from assistant messages)
  if (message.type === "assistant") {
    const content = (message as any).message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use") {
          /**
           * TOOL USE BLOCK:
           * Contains id, name, and input for the requested tool.
           */
          const correlation: ToolCorrelation = {
            id: block.id,
            name: block.name,
            input: block.input,
            request_time: Date.now(),
          };
          tool_correlations.set(block.id, correlation);

          console.log(`${c.highlight("🔧 Tool Request:")}`);
          print_kv("ID", block.id);
          print_kv("Tool", block.name);
          print_kv("Input", JSON.stringify(block.input));
        }
      }
    }
  }

  // Track tool results (from user messages)
  if (message.type === "user") {
    const content = (message as any).message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_result") {
          /**
           * TOOL RESULT BLOCK:
           * Contains tool_use_id (links to request) and content (result).
           */
          const correlation = tool_correlations.get(block.tool_use_id);
          if (correlation) {
            correlation.result = String(block.content).substring(0, 200);
            correlation.result_time = Date.now();

            console.log(`${c.success("📋 Tool Result:")}`);
            print_kv("Tool Use ID", block.tool_use_id);
            print_kv("Linked to", correlation.name);
            print_kv("Result", correlation.result.substring(0, 80) + "...");
            if (correlation.request_time && correlation.result_time) {
              print_kv("Latency", `${correlation.result_time - correlation.request_time}ms`);
            }
          }
        }
      }
    }
  }

  if (message.type === "result") {
    print_success("Query complete");
  }
}

// Display correlations
console.log("");
print_section("📊 Tool Correlations Summary");
for (const [id, corr] of tool_correlations) {
  console.log(`   ${c.highlight(corr.name)} (${id.substring(0, 20)}...)`);
  console.log(`      ${c.dim("Input:")} ${JSON.stringify(corr.input).substring(0, 60)}`);
  console.log(`      ${c.dim("Result:")} ${corr.result?.substring(0, 60)}...`);
}

// ==================================================
// PART 3: Partial Message Streaming
// ==================================================

console.log("");
print_section("Part 3: Partial Message Streaming");

/**
 * PARTIAL MESSAGE STREAMING:
 * Get token-by-token streaming for responsive UIs.
 *
 * Note: This streams Claude's text generation, not tool output.
 * Tool results arrive as complete messages.
 */

const prompt3 = "Write a haiku about programming";
console.log(`📤 Prompt: ${prompt3}\n`);

let streamed_text = "";

const result3 = query({
  prompt: prompt3,
  options: {
    /**
     * INCLUDE PARTIAL MESSAGES:
     * When true, yields stream_event messages with partial content.
     */
    includePartialMessages: true,
  },
});

console.log(`${c.label("Streaming output:")}`);
process.stdout.write("   ");

for await (const message of result3) {
  /**
   * STREAM EVENT:
   * Contains token-by-token content as Claude generates it.
   */
  if (message.type === "stream_event") {
    const event = (message as any).event;
    if (event?.type === "content_block_delta" && event?.delta?.text) {
      process.stdout.write(c.value(event.delta.text));
      streamed_text += event.delta.text;
    }
  }

  if (message.type === "result") {
    console.log("\n");
    print_success("Streaming complete");
    print_kv("Total streamed", `${streamed_text.length} characters`);
  }
}

// ==================================================
// PART 4: Production Monitoring Pattern
// ==================================================

console.log("");
print_section("Part 4: Production Monitoring Pattern");

/**
 * PRODUCTION PATTERN:
 * Combine hooks with message observation for complete visibility.
 */

interface AgentMetrics {
  total_tools: number;
  successful_tools: number;
  failed_tools: number;
  total_tool_time_ms: number;
  tool_breakdown: Record<string, { count: number; total_ms: number }>;
}

const metrics: AgentMetrics = {
  total_tools: 0,
  successful_tools: 0,
  failed_tools: 0,
  total_tool_time_ms: 0,
  tool_breakdown: {},
};

const tool_timers: Map<string, number> = new Map();

const prompt4 = "List .ts files and show me the first 5 lines of package.json";
console.log(`📤 Prompt: ${prompt4}\n`);

const result4 = query({
  prompt: prompt4,
  options: {
    allowedTools: ["Glob", "Read", "Bash"],
    permissionMode: "acceptEdits",
    hooks: {
      PreToolUse: [
        {
          matcher: ".*",
          hooks: [
            async (input) => {
              metrics.total_tools++;
              tool_timers.set(input.tool_use_id, Date.now());
              return {};
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: ".*",
          hooks: [
            async (input) => {
              metrics.successful_tools++;
              const start = tool_timers.get(input.tool_use_id) || Date.now();
              const duration = Date.now() - start;
              metrics.total_tool_time_ms += duration;

              // Track per-tool breakdown
              if (!metrics.tool_breakdown[input.tool_name]) {
                metrics.tool_breakdown[input.tool_name] = { count: 0, total_ms: 0 };
              }
              metrics.tool_breakdown[input.tool_name].count++;
              metrics.tool_breakdown[input.tool_name].total_ms += duration;

              return {};
            },
          ],
        },
      ],
      PostToolUseFailure: [
        {
          hooks: [
            async () => {
              metrics.failed_tools++;
              return {};
            },
          ],
        },
      ],
    },
  },
});

for await (const message of result4) {
  if (message.type === "result") {
    print_success("Query complete");
  }
}

// Display metrics
print_section("📊 Agent Metrics");
print_kv("Total tool calls", metrics.total_tools);
print_kv("Successful", metrics.successful_tools);
print_kv("Failed", metrics.failed_tools);
print_kv("Total tool time", `${metrics.total_tool_time_ms}ms`);

console.log(`\n${c.label("Per-Tool Breakdown:")}`);
for (const [tool, data] of Object.entries(metrics.tool_breakdown)) {
  const avg = Math.round(data.total_ms / data.count);
  console.log(`   ${c.highlight(tool)}: ${data.count} calls, ${data.total_ms}ms total, ${avg}ms avg`);
}

print_footer("END OF LESSON");

/**
 * TOOL EXECUTION MESSAGE FLOW:
 *
 * 1. Assistant Message (tool request):
 *    {
 *      type: "assistant",
 *      message: {
 *        content: [{
 *          type: "tool_use",
 *          id: "toolu_abc123",     ← UNIQUE ID
 *          name: "Bash",
 *          input: { command: "ls" }
 *        }]
 *      }
 *    }
 *
 * 2. User Message (tool result):
 *    {
 *      type: "user",
 *      message: {
 *        content: [{
 *          type: "tool_result",
 *          tool_use_id: "toolu_abc123",  ← LINKS TO REQUEST
 *          content: "file1.txt\nfile2.txt"
 *        }]
 *      }
 *    }
 *
 * 3. Assistant Message (processes result):
 *    {
 *      type: "assistant",
 *      message: {
 *        content: [{
 *          type: "text",
 *          text: "I found 2 files..."
 *        }]
 *      }
 *    }
 *
 *
 * HOOK TYPES FOR TOOL OBSERVATION:
 *
 * PreToolUse:
 *   - Fires before tool executes
 *   - Receives: tool_name, tool_use_id, tool_input
 *   - Use for: timing start, validation, logging
 *
 * PostToolUse:
 *   - Fires after successful execution
 *   - Receives: tool_name, tool_use_id, tool_response
 *   - Use for: timing end, metrics, result logging
 *
 * PostToolUseFailure:
 *   - Fires on tool failure
 *   - Receives: tool_name, tool_use_id, error
 *   - Use for: error handling, alerts, recovery
 *
 *
 * PARTIAL MESSAGE STREAMING:
 *
 * Enable with: includePartialMessages: true
 *
 * Yields stream_event messages:
 * {
 *   type: "stream_event",
 *   event: {
 *     type: "content_block_delta",
 *     delta: { text: "partial token..." }
 *   }
 * }
 *
 *
 * PRODUCTION MONITORING CHECKLIST:
 *
 * ✅ Track tool execution times (PreToolUse + PostToolUse)
 * ✅ Count success/failure rates
 * ✅ Build per-tool metrics breakdown
 * ✅ Correlate requests with results via tool_use_id
 * ✅ Log errors with PostToolUseFailure
 * ✅ Use includePartialMessages for responsive UIs
 *
 *
 * KEY TAKEAWAYS:
 * 1. Tool execution follows: request → result → response pattern
 * 2. tool_use_id links requests to results for correlation
 * 3. PreToolUse/PostToolUse hooks track execution lifecycle
 * 4. includePartialMessages enables token-level streaming
 * 5. Combine hooks + message observation for full visibility
 * 6. Build metrics for performance monitoring and debugging
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - Tool execution message flow (tool_use → tool_result)
 * - tool_use_id for request/result correlation
 * - PreToolUse, PostToolUse, PostToolUseFailure hooks
 * - includePartialMessages option for streaming
 * - Production monitoring patterns
 *
 * NEXT: Lesson 23 explores extended thinking for complex reasoning
 */
