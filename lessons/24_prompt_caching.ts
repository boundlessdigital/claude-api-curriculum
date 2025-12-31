/**
 * LESSON 24: Prompt Caching
 * ==========================
 *
 * WHAT YOU'LL LEARN:
 * - What prompt caching is and why it matters for cost
 * - How to enable caching with cache_control
 * - What can and cannot be cached
 * - Tracking cache hits and misses in usage data
 * - Multi-turn conversation caching strategies
 *
 * PREREQUISITE: Lesson 14 (cost tracking)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Prompt Caching                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Caching lets you reuse previously sent content at 90% discount!        │
 * │                                                                         │
 * │ Without caching (repeated 50K token document):                          │
 * │   Request 1: 50K input tokens → $0.15                                   │
 * │   Request 2: 50K input tokens → $0.15                                   │
 * │   Total: $0.30                                                          │
 * │                                                                         │
 * │ With caching:                                                           │
 * │   Request 1: 50K cached → $0.1875 (1.25x for cache write)              │
 * │   Request 2: 50K cache hit → $0.015 (0.1x for cache read)              │
 * │   Total: $0.20 (33% savings!)                                          │
 * │                                                                         │
 * │ More requests = more savings!                                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: cache_control Parameter                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Add to any content block to enable caching:                             │
 * │                                                                         │
 * │ {                                                                       │
 * │   type: "text",                                                         │
 * │   text: "Your content here...",                                         │
 * │   cache_control: {                                                      │
 * │     type: "ephemeral",  // Currently only supported type                │
 * │     ttl?: "5m" | "1h"   // Optional: 5 minutes (default) or 1 hour     │
 * │   }                                                                     │
 * │ }                                                                       │
 * │                                                                         │
 * │ TTL Options:                                                            │
 * │ - 5m (default): Refreshed for free when used within 5 minutes          │
 * │ - 1h: For content accessed less frequently                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Cache Usage Tracking                                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The response.usage object shows cache performance:                      │
 * │                                                                         │
 * │ {                                                                       │
 * │   cache_creation_input_tokens: 45000, // Tokens written to cache       │
 * │   cache_read_input_tokens: 0,         // Tokens read from cache (hit!) │
 * │   input_tokens: 100,                  // Tokens after last breakpoint  │
 * │   output_tokens: 500                                                    │
 * │ }                                                                       │
 * │                                                                         │
 * │ - cache_creation > 0: Cache miss (wrote new cache)                      │
 * │ - cache_read > 0: Cache hit (used existing cache - 90% cheaper!)       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: What Can Be Cached                                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ CAN CACHE:                                                              │
 * │ ✅ System prompts (most common use case)                                │
 * │ ✅ Tool definitions                                                      │
 * │ ✅ Message history (user + assistant messages)                          │
 * │ ✅ Tool use and tool result blocks                                       │
 * │ ✅ Images and documents                                                  │
 * │                                                                         │
 * │ CANNOT CACHE:                                                           │
 * │ ❌ Thinking blocks (auto-handled but not explicit)                      │
 * │ ❌ Empty text blocks                                                     │
 * │ ❌ Sub-content blocks like citations                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * PRICING (Claude Sonnet 4.5 example):
 * - Base input: $3 / MTok
 * - Cache write (5m): $3.75 / MTok (1.25x)
 * - Cache write (1h): $6 / MTok (2x)
 * - Cache hit: $0.30 / MTok (0.1x) ← 90% savings!
 *
 * NOTE: The Claude Agent SDK handles caching automatically for most cases.
 * This lesson shows the underlying concepts and how to track cache usage.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_success, print_warning, c } from "./util/colors";

print_header("LESSON 24: Prompt Caching");

// ==================================================
// PART 1: Understanding Cache Usage
// ==================================================

print_section("Part 1: Observing Cache Behavior");

/**
 * The SDK automatically leverages caching.
 * Watch the usage fields to see cache performance.
 */

// Large system prompt that benefits from caching
const large_system_prompt = `
You are an expert code reviewer. Your role is to analyze code for:

## Security Issues
- SQL injection vulnerabilities
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Authentication and authorization flaws
- Sensitive data exposure
- Security misconfiguration
- Using components with known vulnerabilities

## Code Quality
- DRY (Don't Repeat Yourself) violations
- SOLID principle violations
- Code complexity issues
- Naming convention problems
- Missing error handling
- Resource leaks
- Race conditions

## Performance
- N+1 query patterns
- Unnecessary loops
- Memory inefficiency
- Blocking operations
- Missing caching opportunities

## Best Practices
- Follow language idioms
- Proper documentation
- Test coverage considerations
- Accessibility considerations

When reviewing, provide:
1. Severity level (Critical, High, Medium, Low)
2. Location in code
3. Description of issue
4. Suggested fix

${Array(100).fill("Additional context paragraph to increase token count for caching demonstration. ").join("")}
`;

const prompt1 = "Review this code: function add(a, b) { return a + b; }";
console.log(`📤 Prompt: ${prompt1}\n`);
console.log(`${c.dim("System prompt length:")} ${large_system_prompt.length} chars\n`);

const result1 = query({
  prompt: prompt1,
  options: {
    systemPrompt: large_system_prompt,
  },
});

let first_cache_write = 0;
let first_cache_read = 0;

for await (const message of result1) {
  if (message.type === "result") {
    const res = message as any;

    /**
     * CACHE USAGE FIELDS:
     * These show how caching performed for this request.
     */
    print_section("📊 First Request Cache Usage");

    // Access cache fields from usage
    const usage = res.usage || {};
    first_cache_write = usage.cache_creation_input_tokens || 0;
    first_cache_read = usage.cache_read_input_tokens || 0;

    print_kv("Cache write", `${first_cache_write} tokens`);
    print_kv("Cache read", `${first_cache_read} tokens`);
    print_kv("Regular input", `${usage.input_tokens || 0} tokens`);
    print_kv("Output", `${usage.output_tokens || 0} tokens`);

    if (first_cache_write > 0) {
      console.log(`\n${c.warning("⚡ Cache was CREATED (first request)")} `);
      console.log(`   ${c.dim("Next similar request will use cache (90% cheaper)")}`);
    }

    print_success("First request complete");
  }
}

// ==================================================
// PART 2: Cache Hit Demonstration
// ==================================================

console.log("");
print_section("Part 2: Cache Hit (Second Request)");

/**
 * CACHE HIT:
 * When the same content is sent again within the TTL,
 * the cached version is used at 90% discount.
 */

const prompt2 = "Review this code: function subtract(a, b) { return a - b; }";
console.log(`📤 Prompt: ${prompt2}\n`);
console.log(`${c.dim("Same system prompt, different question...")}\n`);

const result2 = query({
  prompt: prompt2,
  options: {
    systemPrompt: large_system_prompt, // Same as before
  },
});

for await (const message of result2) {
  if (message.type === "result") {
    const res = message as any;
    const usage = res.usage || {};

    print_section("📊 Second Request Cache Usage");

    const cache_write = usage.cache_creation_input_tokens || 0;
    const cache_read = usage.cache_read_input_tokens || 0;

    print_kv("Cache write", `${cache_write} tokens`);
    print_kv("Cache read", `${cache_read} tokens`);
    print_kv("Regular input", `${usage.input_tokens || 0} tokens`);

    if (cache_read > 0) {
      console.log(`\n${c.success("🎯 CACHE HIT!")} `);
      console.log(`   ${c.dim(`${cache_read} tokens read from cache at 90% discount`)}`);

      // Calculate savings
      const normal_cost = cache_read * 0.003; // $3/MTok
      const cached_cost = cache_read * 0.0003; // $0.30/MTok
      const savings = normal_cost - cached_cost;
      console.log(`   ${c.dim(`Estimated savings: $${savings.toFixed(4)}`)}`);
    }

    print_success("Second request complete");
  }
}

// ==================================================
// PART 3: Cache Pricing Breakdown
// ==================================================

console.log("");
print_section("Part 3: Cache Pricing Explained");

console.log(`
${c.label("Claude Sonnet 4.5 Pricing:")}

   ${c.highlight("Base Input:")}     $3.00 / MTok
   ${c.highlight("Cache Write:")}    $3.75 / MTok (1.25x base) - 5 minute TTL
                   $6.00 / MTok (2.00x base) - 1 hour TTL
   ${c.highlight("Cache Read:")}     $0.30 / MTok (0.10x base) ← ${c.success("90% savings!")}
   ${c.highlight("Output:")}         $15.00 / MTok

${c.label("Example with 50K token document:")}

   ${c.dim("Without caching (10 requests):")}
   50K × 10 × $3.00/MTok = $1.50

   ${c.dim("With caching (10 requests):")}
   First:  50K × $3.75/MTok = $0.1875 (cache write)
   Next 9: 50K × 9 × $0.30/MTok = $0.135 (cache reads)
   Total: $0.32 (${c.success("78% savings!")})
`);

// ==================================================
// PART 4: What Invalidates the Cache
// ==================================================

console.log("");
print_section("Part 4: Cache Invalidation");

/**
 * CACHE INVALIDATION:
 * Changes to certain content invalidate the cache.
 */

console.log(`${c.label("Changes that INVALIDATE cache:")}`);
console.log(`   ${c.error("❌")} Tool definition changes (names, descriptions, schemas)`);
console.log(`   ${c.error("❌")} Web search or citations toggle`);
console.log(`   ${c.error("❌")} Tool choice parameter changes`);
console.log(`   ${c.error("❌")} Image additions or removals`);
console.log(`   ${c.error("❌")} Thinking parameter changes`);
console.log(`   ${c.error("❌")} Any changes to cached content`);

console.log(`\n${c.label("Changes that PRESERVE cache:")}`);
console.log(`   ${c.success("✅")} Only changing user messages after cache breakpoint`);
console.log(`   ${c.success("✅")} Refreshing within 5 minutes (free!)`);
console.log(`   ${c.success("✅")} Changing non-cached content`);

// ==================================================
// PART 5: Caching Strategy
// ==================================================

console.log("");
print_section("Part 5: Caching Best Practices");

console.log(`
${c.label("Best Use Cases for Caching:")}

1. ${c.highlight("Large System Prompts")}
   - Detailed instructions
   - Domain knowledge
   - Style guides

2. ${c.highlight("Document Analysis")}
   - Legal documents
   - Codebases
   - Research papers

3. ${c.highlight("Multi-Turn Conversations")}
   - Chat history
   - Previous tool results
   - Accumulated context

4. ${c.highlight("Tool-Heavy Applications")}
   - Many tool definitions
   - Complex schemas
   - Detailed descriptions

${c.label("Minimum Cacheable Size:")}

   Claude Opus 4.5:  4,096 tokens minimum
   Claude Sonnet 4.5: 1,024 tokens minimum
   Claude Haiku 4.5: 4,096 tokens minimum
`);

// ==================================================
// PART 6: Tracking Cache in SDK
// ==================================================

console.log("");
print_section("Part 6: Tracking Cache Performance");

/**
 * MONITORING CACHE:
 * Track cache performance across requests.
 */

interface CacheMetrics {
  requests: number;
  total_cache_writes: number;
  total_cache_reads: number;
  estimated_savings_usd: number;
}

const metrics: CacheMetrics = {
  requests: 0,
  total_cache_writes: 0,
  total_cache_reads: 0,
  estimated_savings_usd: 0,
};

// Simulate multiple requests
for (let i = 0; i < 3; i++) {
  const prompt = `Quick question ${i + 1}: What is ${i + 1} + 1?`;
  console.log(`${c.dim(`Request ${i + 1}:`)} ${prompt}`);

  const result = query({
    prompt,
    options: {
      systemPrompt: large_system_prompt,
    },
  });

  for await (const message of result) {
    if (message.type === "result") {
      const res = message as any;
      const usage = res.usage || {};

      metrics.requests++;
      metrics.total_cache_writes += usage.cache_creation_input_tokens || 0;
      metrics.total_cache_reads += usage.cache_read_input_tokens || 0;

      // Calculate savings (cache read at 0.1x vs 1x)
      const read_tokens = usage.cache_read_input_tokens || 0;
      metrics.estimated_savings_usd += read_tokens * 0.0027; // $2.70/MTok saved
    }
  }
}

print_section("📊 Aggregate Cache Metrics");
print_kv("Total requests", metrics.requests);
print_kv("Cache writes", `${metrics.total_cache_writes} tokens`);
print_kv("Cache reads", `${metrics.total_cache_reads} tokens`);
print_kv("Estimated savings", `$${metrics.estimated_savings_usd.toFixed(4)}`);

if (metrics.total_cache_reads > 0) {
  const hit_rate = (metrics.total_cache_reads / (metrics.total_cache_writes + metrics.total_cache_reads) * 100).toFixed(1);
  print_kv("Cache hit rate", `${hit_rate}%`);
}

print_footer("END OF LESSON");

/**
 * CACHE CONTROL STRUCTURE:
 *
 * {
 *   type: "text",
 *   text: "Your cached content...",
 *   cache_control: {
 *     type: "ephemeral",     // Currently only supported type
 *     ttl?: "5m" | "1h"      // Optional TTL
 *   }
 * }
 *
 *
 * USAGE OBJECT CACHE FIELDS:
 *
 * {
 *   cache_creation_input_tokens: 45000,  // Tokens written to cache
 *   cache_read_input_tokens: 0,          // Tokens read from cache
 *   input_tokens: 100,                   // Non-cached input
 *   output_tokens: 500                   // Output tokens
 * }
 *
 *
 * PRICING SUMMARY:
 *
 * | Operation    | Cost Multiplier | Notes                         |
 * |--------------|-----------------|-------------------------------|
 * | Base input   | 1.0x            | Normal input tokens           |
 * | Cache write  | 1.25x (5m TTL)  | First request with caching    |
 * | Cache write  | 2.0x (1h TTL)   | Longer-lived cache            |
 * | Cache read   | 0.1x            | 90% discount!                 |
 *
 *
 * CACHE HIERARCHY:
 *
 * tools → system → messages
 *
 * Changes earlier in the chain invalidate everything after.
 *
 *
 * WHEN TO USE CACHING:
 *
 * ✅ Large system prompts (>1K tokens)
 * ✅ Document analysis (legal, code, research)
 * ✅ Multi-turn conversations
 * ✅ Repeated tool definitions
 * ✅ RAG with large context
 *
 * ❌ NOT worth it for:
 * - Small prompts (<1K tokens)
 * - Rapidly changing content
 * - One-off requests
 *
 *
 * KEY TAKEAWAYS:
 * 1. Caching reduces input token costs by 90%
 * 2. The SDK handles caching automatically for stable content
 * 3. Track cache_creation_input_tokens and cache_read_input_tokens
 * 4. Cache hits = 0.1x cost; Cache writes = 1.25x-2x cost
 * 5. 5-minute TTL refreshes for free when used
 * 6. Best for: large system prompts, documents, conversation history
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - cache_control parameter (type, ttl)
 * - Cache usage tracking (cache_creation_input_tokens, cache_read_input_tokens)
 * - Cache pricing (write vs read costs)
 * - Cache invalidation rules
 * - Minimum cacheable sizes by model
 *
 * NEXT: Lesson 25 explores batch processing for bulk operations
 */
