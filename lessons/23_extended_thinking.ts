/**
 * LESSON 23: Extended Thinking
 * =============================
 *
 * WHAT YOU'LL LEARN:
 * - What extended thinking is and when to use it
 * - How to enable extended thinking with maxThinkingTokens
 * - Processing thinking blocks in responses
 * - Token cost implications
 * - Streaming thinking content
 *
 * PREREQUISITE: Lesson 01 (query), Lesson 07 (streaming)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Extended Thinking                                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Extended thinking lets Claude work through problems with internal       │
 * │ deliberation before responding. Like "showing your work" in math.      │
 * │                                                                         │
 * │ Normal response:                                                        │
 * │   User: "Is 127 prime?" → Claude: "Yes, 127 is prime."                 │
 * │                                                                         │
 * │ Extended thinking:                                                      │
 * │   User: "Is 127 prime?"                                                 │
 * │   Claude [thinking]: "Let me check divisibility by 2, 3, 5, 7, 11..."  │
 * │   Claude [response]: "Yes, 127 is prime. I verified it's not..."       │
 * │                                                                         │
 * │ Use for: Complex reasoning, math, code analysis, multi-step problems   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: maxThinkingTokens Option                                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.maxThinkingTokens: number                             │
 * │                                                                         │
 * │ Sets the budget for thinking tokens:                                    │
 * │ - Minimum: 1,024 tokens                                                 │
 * │ - Recommended for complex tasks: 16,000+ tokens                         │
 * │ - For very complex: 32,000+ tokens (use batch processing)              │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   query({                                                               │
 * │     prompt: "...",                                                      │
 * │     options: {                                                          │
 * │       model: "claude-opus-4-5",  // Must support thinking               │
 * │       maxThinkingTokens: 10000                                          │
 * │     }                                                                   │
 * │   })                                                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Thinking Content Block                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ When thinking is enabled, responses include thinking blocks:           │
 * │                                                                         │
 * │ {                                                                       │
 * │   type: "thinking",                                                     │
 * │   thinking: "Let me analyze step by step...",                          │
 * │   signature: "WaUjzk..."  // Encryption verification                   │
 * │ }                                                                       │
 * │                                                                         │
 * │ Followed by the normal text block:                                      │
 * │ {                                                                       │
 * │   type: "text",                                                         │
 * │   text: "The answer is..."                                             │
 * │ }                                                                       │
 * │                                                                         │
 * │ NOTE: Claude 4 models return SUMMARIZED thinking - you see condensed   │
 * │ output but are billed for FULL thinking tokens used internally.        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Token Cost for Thinking                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTANT: You are billed for FULL thinking tokens, not summarized!    │
 * │                                                                         │
 * │ Example cost breakdown:                                                 │
 * │ - Input tokens: 500                                                     │
 * │ - Thinking tokens (billed): 8,000 (even if summarized to 1,500)        │
 * │ - Output tokens: 300                                                    │
 * │ - Total billed: 8,800 tokens                                           │
 * │                                                                         │
 * │ The summarization process itself has no extra charge.                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * SUPPORTED MODELS:
 * - claude-opus-4-5 (claude-opus-4-5-20251101)
 * - claude-opus-4-1 (claude-opus-4-1-20250805)
 * - claude-sonnet-4-5 (claude-sonnet-4-5-20250929)
 * - claude-sonnet-4 (claude-sonnet-4-20250514)
 * - claude-haiku-4-5 (claude-haiku-4-5-20251001)
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_success, print_warning, c } from "./util/colors";

print_header("LESSON 23: Extended Thinking");

// ==================================================
// PART 1: Basic Extended Thinking
// ==================================================

print_section("Part 1: Enabling Extended Thinking");

/**
 * EXTENDED THINKING:
 * Claude "thinks through" the problem before responding.
 * The thinking process is visible in the response.
 */

const math_problem = "Is 127 a prime number? Explain your reasoning.";
console.log(`📤 Prompt: ${math_problem}\n`);

const result1 = query({
  prompt: math_problem,
  options: {
    /**
     * MAX THINKING TOKENS:
     * Budget for the thinking process.
     * Minimum: 1,024 tokens
     * For complex tasks: 16,000+ tokens
     */
    maxThinkingTokens: 10000,

    // Note: Extended thinking works best with supported models
    // The SDK uses the default model which supports thinking
  },
});

for await (const message of result1) {
  print_section(`--- ${message.type} ---`);
  log_json("RAW JSON", message, 600);

  if (message.type === "assistant") {
    const content = (message as any).message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        /**
         * THINKING BLOCK:
         * Contains Claude's internal reasoning process.
         * This is SUMMARIZED in Claude 4 models.
         */
        if (block.type === "thinking") {
          console.log(`\n${c.highlight("🧠 THINKING:")}`);
          console.log(c.dim(block.thinking.substring(0, 500)));
          if (block.thinking.length > 500) {
            console.log(c.dim("... (truncated)"));
          }

          // Thinking blocks include a signature for verification
          if (block.signature) {
            print_kv("Signature", block.signature.substring(0, 30) + "...");
          }
        }

        /**
         * TEXT BLOCK:
         * The actual response after thinking.
         */
        if (block.type === "text") {
          console.log(`\n${c.success("💬 RESPONSE:")}`);
          console.log(c.value(block.text));
        }
      }
    }
  }

  if (message.type === "result") {
    print_success("Query complete");
  }
}

// ==================================================
// PART 2: Complex Reasoning Task
// ==================================================

console.log("");
print_section("Part 2: Complex Reasoning");

/**
 * Extended thinking shines for multi-step problems.
 * The higher token budget allows deeper reasoning.
 */

const logic_problem = `
Three people (A, B, C) are wearing hats. Each hat is either red or blue.
Each person can see the other two hats but not their own.
A says: "I don't know my hat color."
B says: "I don't know my hat color."
C says: "I know my hat color."

What color is C's hat and why?
`;

console.log(`📤 Prompt: ${logic_problem.substring(0, 100)}...\n`);

const result2 = query({
  prompt: logic_problem,
  options: {
    maxThinkingTokens: 16000, // Higher budget for complex reasoning
  },
});

let thinking_length = 0;
let response_length = 0;

for await (const message of result2) {
  if (message.type === "assistant") {
    const content = (message as any).message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "thinking") {
          thinking_length = block.thinking.length;
          console.log(`${c.highlight("🧠 Thinking:")} ${c.dim("(analyzing the logic puzzle...)")}`);
          // Show a snippet
          console.log(c.dim(block.thinking.substring(0, 300) + "...\n"));
        }

        if (block.type === "text") {
          response_length = block.text.length;
          console.log(`${c.success("💬 Answer:")}`);
          console.log(c.value(block.text));
        }
      }
    }
  }

  if (message.type === "result") {
    console.log("");
    print_kv("Thinking length", `${thinking_length} chars`);
    print_kv("Response length", `${response_length} chars`);
    print_success("Query complete");
  }
}

// ==================================================
// PART 3: Streaming Thinking Content
// ==================================================

console.log("");
print_section("Part 3: Streaming Thinking");

/**
 * With includePartialMessages, you can stream thinking
 * as it's generated, useful for showing progress.
 */

const analysis_prompt = "What are the prime factors of 1234567890?";
console.log(`📤 Prompt: ${analysis_prompt}\n`);

const result3 = query({
  prompt: analysis_prompt,
  options: {
    maxThinkingTokens: 10000,
    includePartialMessages: true, // Enable streaming
  },
});

let in_thinking = false;
let thinking_chunks = 0;

console.log(`${c.highlight("🧠 Streaming thinking:")}`);
process.stdout.write("   ");

for await (const message of result3) {
  /**
   * STREAM EVENTS FOR THINKING:
   * thinking_delta events contain partial thinking content.
   */
  if (message.type === "stream_event") {
    const event = (message as any).event;

    if (event?.type === "content_block_delta") {
      // Thinking delta
      if (event.delta?.type === "thinking_delta" && event.delta?.thinking) {
        if (!in_thinking) {
          in_thinking = true;
        }
        thinking_chunks++;
        // Show progress indicator
        if (thinking_chunks % 10 === 0) {
          process.stdout.write(".");
        }
      }

      // Text delta (response)
      if (event.delta?.type === "text_delta" && event.delta?.text) {
        if (in_thinking) {
          in_thinking = false;
          console.log(` (${thinking_chunks} chunks)`);
          console.log(`\n${c.success("💬 Streaming response:")}`);
          process.stdout.write("   ");
        }
        process.stdout.write(c.value(event.delta.text));
      }
    }
  }

  if (message.type === "result") {
    console.log("\n");
    print_kv("Thinking chunks received", thinking_chunks);
    print_success("Streaming complete");
  }
}

// ==================================================
// PART 4: When to Use Extended Thinking
// ==================================================

console.log("");
print_section("Part 4: When to Use Extended Thinking");

/**
 * DECISION GUIDE:
 *
 * USE EXTENDED THINKING FOR:
 * ✅ Complex math and logic problems
 * ✅ Multi-step reasoning tasks
 * ✅ Detailed code analysis
 * ✅ Research and analysis
 * ✅ Tasks requiring careful deliberation
 *
 * SKIP EXTENDED THINKING FOR:
 * ❌ Simple factual queries
 * ❌ Straightforward text generation
 * ❌ Time-sensitive applications (adds latency)
 * ❌ High-volume, low-complexity tasks
 */

console.log(`${c.label("USE EXTENDED THINKING FOR:")}`);
console.log(`   ${c.success("✅")} Complex math and logic problems`);
console.log(`   ${c.success("✅")} Multi-step reasoning tasks`);
console.log(`   ${c.success("✅")} Detailed code analysis and debugging`);
console.log(`   ${c.success("✅")} Research requiring careful deliberation`);
console.log(`   ${c.success("✅")} Tasks where showing reasoning is valuable`);

console.log(`\n${c.label("SKIP EXTENDED THINKING FOR:")}`);
console.log(`   ${c.error("❌")} Simple factual queries ("What's the capital of France?")`);
console.log(`   ${c.error("❌")} Straightforward text generation`);
console.log(`   ${c.error("❌")} Time-sensitive applications (adds latency)`);
console.log(`   ${c.error("❌")} High-volume, simple tasks`);

console.log(`\n${c.label("TOKEN BUDGET GUIDELINES:")}`);
console.log(`   ${c.dim("Simple problems:")} 1,024 - 5,000 tokens`);
console.log(`   ${c.dim("Moderate complexity:")} 5,000 - 16,000 tokens`);
console.log(`   ${c.dim("Complex reasoning:")} 16,000 - 32,000 tokens`);
console.log(`   ${c.dim("Very complex:")} 32,000+ (use batch processing)`);

// ==================================================
// PART 5: Token Cost Awareness
// ==================================================

console.log("");
print_section("Part 5: Token Cost Awareness");

print_warning("IMPORTANT: Thinking tokens are billed at FULL rate!");

console.log(`
${c.label("Cost Calculation:")}

   Visible output may be SUMMARIZED (Claude 4 models):
   - You see: 1,500 tokens of thinking summary
   - Billed for: 8,000 tokens (full thinking internally)

${c.label("Example Breakdown:")}

   Input tokens:           500
   Thinking tokens (FULL): 8,000  ← Billed, not summarized amount
   Output tokens:          300
   ────────────────────────────
   Total billed:           8,800 tokens

${c.dim("Note: Summarization itself has no extra charge.")}
`);

print_footer("END OF LESSON");

/**
 * EXTENDED THINKING CONTENT BLOCKS:
 *
 * Thinking Block:
 * {
 *   "type": "thinking",
 *   "thinking": "Let me work through this step by step...",
 *   "signature": "WaUjzkypQ2mUEVM..."  // Encryption verification
 * }
 *
 * Text Block (after thinking):
 * {
 *   "type": "text",
 *   "text": "The answer is..."
 * }
 *
 *
 * STREAMING EVENTS:
 *
 * Thinking delta:
 * {
 *   type: "content_block_delta",
 *   delta: {
 *     type: "thinking_delta",
 *     thinking: "partial thinking..."
 *   }
 * }
 *
 * Text delta:
 * {
 *   type: "content_block_delta",
 *   delta: {
 *     type: "text_delta",
 *     text: "partial text..."
 *   }
 * }
 *
 *
 * SUPPORTED MODELS:
 *
 * - claude-opus-4-5 (claude-opus-4-5-20251101)
 * - claude-opus-4-1 (claude-opus-4-1-20250805)
 * - claude-sonnet-4-5 (claude-sonnet-4-5-20250929)
 * - claude-sonnet-4 (claude-sonnet-4-20250514)
 * - claude-haiku-4-5 (claude-haiku-4-5-20251001)
 *
 *
 * IMPORTANT NOTES:
 *
 * 1. Token billing: You pay for FULL thinking tokens, not summarized
 * 2. Summarization: Claude 4 models summarize thinking output
 * 3. Tool use: Preserve thinking blocks when using tools
 * 4. Context window: Thinking from previous turns is auto-removed
 * 5. Latency: Extended thinking adds significant response time
 *
 *
 * KEY TAKEAWAYS:
 * 1. Enable with maxThinkingTokens option (minimum 1,024)
 * 2. Thinking appears in content blocks with type: "thinking"
 * 3. You're billed for FULL thinking tokens, not summarized output
 * 4. Use for complex reasoning, math, and multi-step problems
 * 5. Skip for simple queries - adds latency and cost
 * 6. Stream thinking with includePartialMessages for real-time display
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - maxThinkingTokens option
 * - Thinking content block (type: "thinking")
 * - Thinking delta streaming events
 * - Token cost implications (full vs summarized)
 * - Supported models for extended thinking
 *
 * NEXT: Lesson 24 explores prompt caching for cost optimization
 */
