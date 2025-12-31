/**
 * LESSON 30: Model Configuration Options
 * =======================================
 *
 * WHAT YOU'LL LEARN:
 * - Temperature control for randomness
 * - Top-P (nucleus sampling)
 * - Top-K filtering
 * - Stop sequences to control output boundaries
 * - How these parameters interact
 *
 * PREREQUISITE: Lesson 01 (basic queries)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Sampling Parameters                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ These parameters control HOW Claude selects the next token:            │
 * │                                                                         │
 * │ temperature  → Controls randomness in selection (0.0 - 1.0)            │
 * │ top_p        → Nucleus sampling - cumulative probability cutoff        │
 * │ top_k        → Hard limit on number of tokens to consider              │
 * │                                                                         │
 * │ Order of application: temperature → top_p → top_k                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Stop Sequences                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Stop sequences define boundaries where generation should halt:         │
 * │                                                                         │
 * │ - Up to 5 sequences per request                                        │
 * │ - Generation stops when ANY sequence is encountered                    │
 * │ - Useful for: JSON boundaries, delimiters, format control              │
 * │                                                                         │
 * │ When hit, stop_reason = "stop_sequence"                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS MATTERS:
 * - Factual tasks need low temperature (deterministic)
 * - Creative tasks benefit from higher temperature
 * - Stop sequences help enforce output formats
 * - Fine-tuning these improves response quality
 */

import Anthropic from "@anthropic-ai/sdk";
import { print_header, print_section, print_footer, print_kv, c } from "./util/colors";

print_header("LESSON 30: Model Configuration Options");

const anthropic = new Anthropic();

// ==================================================
// PART 1: Temperature
// ==================================================

print_section("Part 1: Temperature");

/**
 * TEMPERATURE:
 *
 * Controls randomness in token selection.
 *
 * Range: 0.0 to 1.0 (some models support up to 2.0)
 * Default: 1.0
 *
 * 0.0  → Deterministic (always pick highest probability)
 * 0.5  → Balanced
 * 1.0  → Full randomness (sample according to probabilities)
 */

const factual_prompt = "What is the chemical formula for water?";

console.log(`${c.highlight("Prompt:")} "${factual_prompt}"\n`);

// Low temperature - deterministic
console.log(`${c.label("Temperature 0.0 (deterministic):")}`);
const response_low = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 50,
  temperature: 0.0,
  messages: [{ role: "user", content: factual_prompt }],
});
const text_low = response_low.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");
console.log(`${c.dim("→")} ${c.value(text_low)}\n`);

// High temperature - creative
console.log(`${c.label("Temperature 1.0 (full randomness):")}`);
const response_high = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 50,
  temperature: 1.0,
  messages: [{ role: "user", content: factual_prompt }],
});
const text_high = response_high.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");
console.log(`${c.dim("→")} ${c.value(text_high)}`);

console.log(`\n${c.highlight("Use Cases:")}`);
console.log(`${c.dim("• temperature=0.0: Factual Q&A, code generation, precise tasks")}`);
console.log(`${c.dim("• temperature=0.5-0.7: Balanced tasks, summaries")}`);
console.log(`${c.dim("• temperature=1.0: Creative writing, brainstorming")}`);

// ==================================================
// PART 2: Top-P (Nucleus Sampling)
// ==================================================

console.log("");
print_section("Part 2: Top-P (Nucleus Sampling)");

/**
 * TOP-P (NUCLEUS SAMPLING):
 *
 * Only consider tokens whose cumulative probability
 * exceeds the threshold. Filters out low-probability tokens.
 *
 * Range: 0.0 to 1.0
 * Default: 1.0 (all tokens considered)
 *
 * Example: top_p=0.9 means only consider tokens that make up
 * the top 90% of probability mass.
 */

console.log(`${c.label("How Top-P Works:")}`);
console.log(`${c.dim(`
Token probabilities: [0.4, 0.3, 0.15, 0.1, 0.04, 0.01, ...]
Cumulative:          [0.4, 0.7, 0.85, 0.95, 0.99, 1.0, ...]

top_p=0.9 → Only consider first 4 tokens (cumulative ≤ 0.95)
top_p=0.7 → Only consider first 2 tokens (cumulative ≤ 0.7)
`)}`);

const creative_prompt = "Suggest a name for a new coffee shop.";

console.log(`${c.highlight("Prompt:")} "${creative_prompt}"\n`);

// Top-P = 0.9 (balanced)
console.log(`${c.label("top_p=0.9 (balanced):")}`);
const response_p9 = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 30,
  temperature: 1.0,
  top_p: 0.9,
  messages: [{ role: "user", content: creative_prompt }],
});
const text_p9 = response_p9.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");
console.log(`${c.dim("→")} ${c.value(text_p9)}\n`);

// Top-P = 0.5 (more focused)
console.log(`${c.label("top_p=0.5 (more focused):")}`);
const response_p5 = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 30,
  temperature: 1.0,
  top_p: 0.5,
  messages: [{ role: "user", content: creative_prompt }],
});
const text_p5 = response_p5.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");
console.log(`${c.dim("→")} ${c.value(text_p5)}`);

// ==================================================
// PART 3: Top-K
// ==================================================

console.log("");
print_section("Part 3: Top-K");

/**
 * TOP-K:
 *
 * Hard limit on number of tokens to consider.
 * Only the K highest-probability tokens are eligible.
 *
 * Range: 1 and up (common: 5-100)
 * Default: Not set (all tokens)
 *
 * More aggressive than top_p - hard cutoff regardless
 * of probability distribution.
 */

console.log(`${c.label("How Top-K Works:")}`);
console.log(`${c.dim(`
Token probabilities: [0.4, 0.3, 0.15, 0.1, 0.04, 0.01, ...]

top_k=3 → Only consider first 3 tokens [0.4, 0.3, 0.15]
top_k=5 → Only consider first 5 tokens [0.4, 0.3, 0.15, 0.1, 0.04]
`)}`);

console.log(`\n${c.highlight("Prompt:")} "${creative_prompt}"\n`);

// Top-K = 10
console.log(`${c.label("top_k=10 (top 10 tokens only):")}`);
const response_k10 = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 30,
  temperature: 1.0,
  top_k: 10,
  messages: [{ role: "user", content: creative_prompt }],
});
const text_k10 = response_k10.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");
console.log(`${c.dim("→")} ${c.value(text_k10)}`);

// ==================================================
// PART 4: Stop Sequences
// ==================================================

console.log("");
print_section("Part 4: Stop Sequences");

/**
 * STOP SEQUENCES:
 *
 * Define text patterns that halt generation when encountered.
 *
 * - Up to 5 sequences per request
 * - Generation stops BEFORE outputting the sequence
 * - stop_reason becomes "stop_sequence"
 *
 * Use cases:
 * - Stop at delimiters (----, END, etc.)
 * - Limit to single JSON object
 * - Format control
 */

// Demo: Stop at numbered list boundary
const list_prompt = "List 5 programming languages. Number them 1-5.";

console.log(`${c.highlight("Prompt:")} "${list_prompt}"`);
console.log(`${c.highlight("Stop sequence:")} "3." (stop before item 3)\n`);

const response_stop = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 200,
  stop_sequences: ["3."],
  messages: [{ role: "user", content: list_prompt }],
});

const text_stop = response_stop.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

console.log(`${c.label("Response:")}`);
console.log(`${c.value(text_stop)}`);
print_kv("stop_reason", response_stop.stop_reason);

// Demo: Multiple stop sequences
console.log(`\n${c.label("Multiple Stop Sequences:")}`);
console.log(`${c.dim(`stop_sequences: ["END", "---", "STOP", "\\n\\n\\n"]`)}`);
console.log(`${c.dim("Generation halts at the FIRST match found.")}`);

// ==================================================
// PART 5: Combining Parameters
// ==================================================

console.log("");
print_section("Part 5: Combining Parameters");

/**
 * PARAMETER INTERACTION:
 *
 * When multiple parameters are set:
 * 1. Temperature adjusts probability distribution
 * 2. Top-P filters by cumulative probability
 * 3. Top-K further limits to K tokens
 *
 * Common combinations:
 * - Factual: temperature=0, no top_p/top_k
 * - Balanced: temperature=0.7, top_p=0.9
 * - Creative: temperature=1.0, top_p=0.95
 */

const combined_prompt = "Write a one-sentence product tagline for a fitness app.";

console.log(`${c.highlight("Prompt:")} "${combined_prompt}"\n`);

// Deterministic configuration
console.log(`${c.label("Config 1: Deterministic")}`);
console.log(`${c.dim("temperature=0.0, top_p=1.0 (default)")}`);
const response_det = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 50,
  temperature: 0.0,
  messages: [{ role: "user", content: combined_prompt }],
});
console.log(`${c.dim("→")} ${response_det.content[0].type === "text" ? response_det.content[0].text : ""}\n`);

// Balanced configuration
console.log(`${c.label("Config 2: Balanced")}`);
console.log(`${c.dim("temperature=0.7, top_p=0.9")}`);
const response_bal = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 50,
  temperature: 0.7,
  top_p: 0.9,
  messages: [{ role: "user", content: combined_prompt }],
});
console.log(`${c.dim("→")} ${response_bal.content[0].type === "text" ? response_bal.content[0].text : ""}\n`);

// Creative configuration
console.log(`${c.label("Config 3: Creative")}`);
console.log(`${c.dim("temperature=1.0, top_p=0.95, top_k=50")}`);
const response_cre = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 50,
  temperature: 1.0,
  top_p: 0.95,
  top_k: 50,
  messages: [{ role: "user", content: combined_prompt }],
});
console.log(`${c.dim("→")} ${response_cre.content[0].type === "text" ? response_cre.content[0].text : ""}`);

// ==================================================
// PART 6: Recommended Configurations
// ==================================================

console.log("");
print_section("Part 6: Recommended Configurations");

const configs = [
  {
    name: "Factual Q&A",
    temp: "0.0",
    top_p: "1.0",
    top_k: "-",
    desc: "Code, math, precise answers",
  },
  {
    name: "Document Summary",
    temp: "0.3",
    top_p: "0.9",
    top_k: "-",
    desc: "Consistent but varied phrasing",
  },
  {
    name: "Conversational",
    temp: "0.7",
    top_p: "0.9",
    top_k: "-",
    desc: "Natural dialogue",
  },
  {
    name: "Creative Writing",
    temp: "1.0",
    top_p: "0.95",
    top_k: "50",
    desc: "Stories, poetry, brainstorming",
  },
  {
    name: "Highly Creative",
    temp: "1.0",
    top_p: "1.0",
    top_k: "-",
    desc: "Maximum variety",
  },
];

console.log(`${c.label("Recommended Settings by Task:")}\n`);
console.log(`  ${c.dim("Task".padEnd(18))} ${c.dim("Temp".padEnd(6))} ${c.dim("top_p".padEnd(6))} ${c.dim("top_k".padEnd(6))} ${c.dim("Use Case")}`);
console.log(`  ${c.dim("-".repeat(60))}`);
for (const cfg of configs) {
  console.log(`  ${c.value(cfg.name.padEnd(18))} ${cfg.temp.padEnd(6)} ${cfg.top_p.padEnd(6)} ${cfg.top_k.padEnd(6)} ${c.dim(cfg.desc)}`);
}

print_footer("END OF LESSON");

/**
 * MODEL CONFIGURATION SUMMARY:
 *
 * TEMPERATURE (0.0 - 1.0):
 * - 0.0 = Deterministic (same input → same output)
 * - 1.0 = Full randomness (sample by probability)
 * - Default: 1.0
 *
 * TOP-P / NUCLEUS SAMPLING (0.0 - 1.0):
 * - Only consider tokens in top X% of probability
 * - 0.9 = Top 90% of cumulative probability
 * - Default: 1.0 (all tokens)
 *
 * TOP-K (integer):
 * - Hard limit on number of tokens
 * - top_k=10 = Only consider 10 most likely tokens
 * - Default: Not set
 *
 * STOP SEQUENCES (array of strings):
 * - Generation stops when any sequence is encountered
 * - Up to 5 sequences per request
 * - stop_reason becomes "stop_sequence"
 *
 * APPLICATION ORDER:
 * 1. Temperature shapes probability distribution
 * 2. Top-P filters by cumulative probability
 * 3. Top-K limits to K tokens
 *
 * BEST PRACTICES:
 * - Use temperature=0 for factual/deterministic tasks
 * - Use temperature=0.7-1.0 with top_p=0.9 for balance
 * - Stop sequences help enforce output formats
 * - Avoid very low top_p (<0.5) - can cause incoherence
 *
 * KEY TAKEAWAYS:
 * 1. Temperature is your primary randomness control
 * 2. Top-P provides probability-based filtering
 * 3. Top-K provides hard token count limits
 * 4. Stop sequences define generation boundaries
 * 5. Combine parameters thoughtfully for your use case
 *
 * NEXT: Lesson 31 covers Message Prefilling
 */
