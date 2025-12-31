/**
 * LESSON 14: Cost Tracking and Budget Control
 * ============================================
 *
 * WHAT YOU'LL LEARN:
 * - How to monitor API costs in real-time
 * - Understanding token usage and pricing
 * - Setting budget limits to prevent runaway costs
 * - Per-model cost breakdown (useful with subagents)
 * - The difference between duration_ms and duration_api_ms
 *
 * PREREQUISITE: Lesson 13 (structured output, result message)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: SDKResultMessage Cost Fields                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The result message contains comprehensive cost data:                    │
 * │                                                                         │
 * │ {                                                                       │
 * │   type: "result",                                                       │
 * │   total_cost_usd: number,     // Total cost in USD                      │
 * │   duration_ms: number,        // Total wall clock time                  │
 * │   duration_api_ms: number,    // Time spent in API calls only           │
 * │   num_turns: number,          // Number of back-and-forth exchanges     │
 * │   usage: { ... },             // Token breakdown                        │
 * │   modelUsage: { ... }         // Per-model breakdown                    │
 * │ }                                                                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: usage Object                                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Token breakdown in the result message:                                  │
 * │                                                                         │
 * │ usage: {                                                                │
 * │   input_tokens: number,              // Tokens in prompts (you pay)     │
 * │   output_tokens: number,             // Tokens Claude generated         │
 * │   cache_read_input_tokens: number,   // Cached tokens (cheaper)         │
 * │   cache_creation_input_tokens: number // Tokens cached for future       │
 * │ }                                                                       │
 * │                                                                         │
 * │ NOTE: Output tokens cost 3-5x more than input tokens!                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: modelUsage Object                                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Per-model cost breakdown (essential with subagents):                    │
 * │                                                                         │
 * │ modelUsage: {                                                           │
 * │   "claude-sonnet-4-20250514": {                                         │
 * │     inputTokens: number,                                                │
 * │     outputTokens: number,                                               │
 * │     cacheReadInputTokens: number,                                       │
 * │     cacheCreationInputTokens: number,                                   │
 * │     costUSD: number              // Cost for this model only            │
 * │   },                                                                    │
 * │   "claude-3-5-haiku-20241022": { ... }                                  │
 * │ }                                                                       │
 * │                                                                         │
 * │ Use this to identify which model is costing the most!                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS MATTERS:
 * Agents can be expensive. Without monitoring:
 * - A complex task might cost $5+ without you knowing
 * - Stuck agents can loop and burn through budget
 * - You can't optimize what you don't measure
 *
 * COST COMPONENTS:
 * - Input tokens: What you send (prompt, conversation history, tool results)
 * - Output tokens: What Claude generates (responses, tool calls)
 * - Cache tokens: Tokens served from Anthropic's cache (cheaper)
 *
 * PRICING TIERS (approximate, check Anthropic's website):
 * - Haiku: Cheapest (~$0.25 per million input, ~$1.25 per million output)
 * - Sonnet: Mid-tier (~$3 per million input, ~$15 per million output)
 * - Opus: Most expensive (~$15 per million input, ~$75 per million output)
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_result, print_warning, c } from "./util/colors";

print_header("LESSON 14: Cost Tracking and Budget Control");

// ==================================================
// PART 1: Basic Cost Tracking
// ==================================================

print_section("Part 1: Basic Cost Tracking");

const prompt1 = "Explain quantum computing in 3 sentences";
console.log(`📤 Prompt: ${prompt1}\n`);

const result1 = query({
  prompt: prompt1,
  options: {
    maxBudgetUsd: 1.0, // Hard limit - stops if exceeded
  },
});

for await (const message of result1) {
  // Log raw JSON for all messages to see cost data
  print_section(`--- ${message.type} ---`);
  log_json("RAW JSON", message, 600);

  if (message.type === "result") {
    const res = message as any;

    /**
     * RESULT MESSAGE COST FIELDS:
     *
     * total_cost_usd: Total cost in US dollars (all turns combined)
     * duration_ms: Total wall clock time (includes network, your code, etc.)
     * duration_api_ms: Time spent in API calls only
     * num_turns: Number of back-and-forth exchanges
     */
    print_section("📊 COST SUMMARY");
    print_kv("Total Cost", `$${res.total_cost_usd?.toFixed(6)}`);
    print_kv("Total Duration", `${res.duration_ms}ms`);
    print_kv("API Duration", `${res.duration_api_ms}ms`);
    print_kv("Non-API Time", `${res.duration_ms - res.duration_api_ms}ms`);
    print_kv("Turns", res.num_turns);

    /**
     * TOKEN USAGE BREAKDOWN:
     *
     * input_tokens: Tokens in your prompts (you pay for these)
     * output_tokens: Tokens Claude generated (more expensive!)
     * cache_read_input_tokens: Tokens served from cache (cheaper)
     * cache_creation_input_tokens: Tokens cached for future use
     */
    const usage = res.usage;
    print_section("\n📈 TOKEN USAGE");
    print_kv("Input Tokens", usage.input_tokens);
    print_kv("Output Tokens", usage.output_tokens);
    print_kv("Cache Read", usage.cache_read_input_tokens);
    print_kv("Cache Creation", usage.cache_creation_input_tokens);

    // Calculate cost per token (rough estimate for understanding)
    if (usage.input_tokens + usage.output_tokens > 0) {
      const total_tokens = usage.input_tokens + usage.output_tokens;
      const cost_per_1k = (res.total_cost_usd / total_tokens) * 1000;
      print_kv("Cost per 1K tokens", `$${cost_per_1k.toFixed(6)}`);
    }
  }
}

// ==================================================
// PART 2: Per-Model Cost Breakdown
// ==================================================

console.log("");
print_section("Part 2: Per-Model Breakdown (with Subagent)");

/**
 * When using subagents with different models, modelUsage
 * shows you exactly how much each model contributed to the cost.
 *
 * This is CRITICAL for optimization - you might find that a
 * cheap subagent (haiku) is doing most of the work, or that
 * your main agent (sonnet) is where the money goes.
 */

const prompt2 = "Use the analyzer agent to check package.json, then summarize what it found.";
console.log(`📤 Prompt: ${prompt2}\n`);

const result2 = query({
  prompt: prompt2,
  options: {
    allowedTools: ["Task", "Read"],
    permissionMode: "acceptEdits",
    maxBudgetUsd: 0.50,

    // Subagent using a cheaper model
    agents: {
      analyzer: {
        description: "Analyzes files for issues",
        prompt: "You analyze files. List key findings briefly.",
        tools: ["Read"],
        model: "haiku", // Cheapest model
      },
    },
  },
});

for await (const message of result2) {
  // Show when subagent is called - tool_use is in content blocks
  if (message.type === "assistant") {
    const content = (message as any).message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use" && block.name === "Task") {
          print_kv("Delegating to", block.input?.subagent_type);
        }
      }
    }
  }

  if (message.type === "result") {
    const res = message as any;

    print_section("\n📊 TOTAL COST");
    print_kv("Cost", `$${res.total_cost_usd?.toFixed(6)}`);

    /**
     * MODEL USAGE BREAKDOWN:
     *
     * modelUsage is a map from model name to usage stats.
     * Each entry shows:
     * - inputTokens: Input tokens for this model
     * - outputTokens: Output tokens for this model
     * - cacheReadInputTokens: Cache tokens for this model
     * - cacheCreationInputTokens: Cache creation for this model
     * - costUSD: Total cost for this model
     */
    print_section("\n📈 PER-MODEL BREAKDOWN");
    if (res.modelUsage) {
      for (const [model, usage] of Object.entries(res.modelUsage as any)) {
        console.log(`\n  ${c.highlight(model)}:`);
        print_kv("Input Tokens", usage.inputTokens, 4);
        print_kv("Output Tokens", usage.outputTokens, 4);
        print_kv("Cache Read", usage.cacheReadInputTokens, 4);
        print_kv("Cost", `$${usage.costUSD?.toFixed(6)}`, 4);

        // Calculate percentage of total cost
        if (res.total_cost_usd > 0) {
          const pct = ((usage.costUSD / res.total_cost_usd) * 100).toFixed(1);
          print_kv("Share", `${pct}% of total`, 4);
        }
      }
    }
  }
}

// ==================================================
// PART 3: Budget Enforcement Demo
// ==================================================

console.log("");
print_section("Part 3: Budget Enforcement");

/**
 * maxBudgetUsd is a HARD LIMIT. When exceeded, the agent stops
 * with result.subtype === "error_max_budget_usd"
 *
 * You may get PARTIAL results - the agent did some work before hitting the limit.
 */

const prompt3 = "Analyze every file in the current directory and write a detailed report.";
console.log(`📤 Prompt: ${prompt3}\n`);

const result3 = query({
  prompt: prompt3,
  options: {
    allowedTools: ["Glob", "Read"],
    permissionMode: "acceptEdits",
    maxBudgetUsd: 0.01, // Very low budget - will likely be exceeded
  },
});

for await (const message of result3) {
  if (message.type === "result") {
    const res = message as any;

    print_section("📊 RESULT");
    print_kv("Status", res.subtype);
    print_kv("Cost", `$${res.total_cost_usd?.toFixed(6)}`);
    print_kv("Budget Limit", "$0.01");

    if (res.subtype === "error_max_budget_usd") {
      print_warning("BUDGET EXCEEDED!");
      console.log(`  ${c.dim("The agent was stopped to prevent further costs.")}`);
      console.log(`  ${c.dim("Partial result may be available in res.result")}`);
    }
  }
}

print_footer("END OF LESSON");

/**
 * RESULT MESSAGE WITH COST DATA (raw JSON):
 *
 * {
 *   "type": "result",
 *   "subtype": "success",
 *   "total_cost_usd": 0.00234,
 *   "duration_ms": 2500,
 *   "duration_api_ms": 2100,
 *   "num_turns": 1,
 *   "usage": {
 *     "input_tokens": 450,
 *     "output_tokens": 125,
 *     "cache_read_input_tokens": 0,
 *     "cache_creation_input_tokens": 0
 *   },
 *   "modelUsage": {
 *     "claude-sonnet-4-20250514": {
 *       "inputTokens": 350,
 *       "outputTokens": 100,
 *       "cacheReadInputTokens": 0,
 *       "cacheCreationInputTokens": 0,
 *       "costUSD": 0.00195
 *     },
 *     "claude-3-5-haiku-20241022": {
 *       "inputTokens": 100,
 *       "outputTokens": 25,
 *       "cacheReadInputTokens": 0,
 *       "cacheCreationInputTokens": 0,
 *       "costUSD": 0.00039
 *     }
 *   },
 *   ...
 * }
 *
 *
 * COST OPTIMIZATION STRATEGIES:
 *
 * 1. Use cheaper models for simple subtasks
 *    model: "haiku" for code review, searches, simple analysis
 *
 * 2. Be specific in prompts
 *    Vague prompts lead to more back-and-forth = more tokens
 *
 * 3. Limit tools
 *    Fewer tools = smaller system prompt = lower input tokens
 *
 * 4. Use structured output
 *    Enforces concise responses
 *
 * 5. Set maxTurns
 *    Prevents infinite loops and excessive back-and-forth
 *
 * 6. Monitor modelUsage
 *    Identify which model is costing the most
 *
 *
 * KEY TAKEAWAYS:
 * 1. ALWAYS set maxBudgetUsd in production - unbounded agents are dangerous
 * 2. Result message has complete cost breakdown
 * 3. modelUsage shows per-model costs (essential for optimizing subagents)
 * 4. Output tokens cost 3-5x more than input tokens - keep responses concise
 * 5. Cache tokens (cache_read) are cheaper - repeated prompts get cached
 * 6. duration_ms vs duration_api_ms shows network/processing overhead
 * 7. Use haiku for simple subtasks to reduce costs
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - total_cost_usd (result message field)
 * - duration_ms vs duration_api_ms (timing fields)
 * - usage object (input_tokens, output_tokens, cache tokens)
 * - modelUsage object (per-model breakdown)
 * - Cost optimization strategies
 *
 * NEXT: Lesson 15 explores canUseTool for runtime permission control
 */
