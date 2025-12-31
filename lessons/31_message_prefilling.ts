/**
 * LESSON 31: Message Prefilling
 * =============================
 *
 * WHAT YOU'LL LEARN:
 * - What message prefilling is and why it's useful
 * - How to include partial assistant messages
 * - Controlling output format with prefills
 * - The trailing whitespace gotcha
 * - When to use prefilling vs structured outputs
 *
 * PREREQUISITE: Lesson 02 (Messages structure)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Message Prefilling                                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Prefilling allows you to specify the BEGINNING of Claude's response    │
 * │ by including a partial assistant message in the messages array.        │
 * │                                                                         │
 * │ Claude continues from where your prefilled text ends.                  │
 * │                                                                         │
 * │ messages: [                                                             │
 * │   { role: "user", content: "Extract data as JSON" },                   │
 * │   { role: "assistant", content: "{" }  // <-- Prefill                  │
 * │ ]                                                                       │
 * │                                                                         │
 * │ Claude's response will continue from "{", producing valid JSON.        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Why Prefill?                                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Prefilling helps with:                                                  │
 * │                                                                         │
 * │ 1. Format Control: Force JSON, XML, or specific structures             │
 * │ 2. Skip Preambles: Avoid "Sure! Here's..." introductions               │
 * │ 3. Code Generation: Start with specific language blocks                │
 * │ 4. Role Consistency: Maintain character in conversations               │
 * │ 5. Output Steering: Guide response direction                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * IMPORTANT LIMITATION:
 * - Prefilling is NOT supported with extended thinking mode
 * - Prefilled content CANNOT end with trailing whitespace
 */

import Anthropic from "@anthropic-ai/sdk";
import { print_header, print_section, print_footer, print_kv, c } from "./util/colors";

print_header("LESSON 31: Message Prefilling");

const anthropic = new Anthropic();

// ==================================================
// PART 1: Basic Prefilling
// ==================================================

print_section("Part 1: Basic Prefilling");

/**
 * BASIC PREFILLING:
 *
 * Add a partial assistant message at the end of the
 * messages array. Claude continues from that point.
 */

const prompt_without_prefill = "What is the capital of France?";

console.log(`${c.label("Without Prefilling:")}`);
console.log(`${c.dim("Just user message, no assistant prefill")}\n`);

const response_no_prefill = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 50,
  messages: [{ role: "user", content: prompt_without_prefill }],
});

const text_no_prefill = response_no_prefill.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");
console.log(`${c.dim("→")} ${c.value(text_no_prefill)}\n`);

// Now with prefilling
console.log(`${c.label("With Prefilling:")}`);
console.log(`${c.dim('Prefill: "The answer is:"')}\n`);

const response_with_prefill = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 50,
  messages: [
    { role: "user", content: prompt_without_prefill },
    { role: "assistant", content: "The answer is:" }, // <-- Prefill
  ],
});

const text_with_prefill = response_with_prefill.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

// Note: The response is just the continuation, NOT the prefill + continuation
console.log(`${c.dim("→ Prefill:")} ${c.highlight("The answer is:")}`);
console.log(`${c.dim("→ Continuation:")} ${c.value(text_with_prefill)}`);

// ==================================================
// PART 2: JSON Format Control
// ==================================================

console.log("");
print_section("Part 2: JSON Format Control");

/**
 * JSON PREFILLING:
 *
 * One of the most common uses is forcing JSON output
 * by prefilling with "{". This skips Claude's preamble
 * and goes straight to JSON.
 */

const json_prompt = `Extract the following as JSON with keys "name", "age", "city":

John Smith is a 42-year-old software engineer living in Seattle.`;

console.log(`${c.highlight("Prompt:")} "${json_prompt.slice(0, 50)}..."\n`);

// Without prefill - may include preamble
console.log(`${c.label("Without JSON Prefill:")}`);
const response_no_json = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 150,
  messages: [{ role: "user", content: json_prompt }],
});

const text_no_json = response_no_json.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");
console.log(`${c.dim("→")} ${c.value(text_no_json.slice(0, 100))}...`);

// With JSON prefill - forces immediate JSON
console.log(`\n${c.label("With JSON Prefill ({):")}`);
const response_json = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 150,
  messages: [
    { role: "user", content: json_prompt },
    { role: "assistant", content: "{" }, // Force JSON start
  ],
});

const text_json = response_json.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

// Combine prefill with response for complete JSON
const full_json = "{" + text_json;
console.log(`${c.dim("→")} ${c.value(full_json)}`);

// Parse to verify it's valid JSON
try {
  const parsed = JSON.parse(full_json);
  console.log(`${c.success("✓")} Valid JSON parsed successfully`);
  print_kv("Parsed name", parsed.name);
} catch {
  console.log(`${c.error("✗")} JSON parsing failed`);
}

// ==================================================
// PART 3: Code Block Prefilling
// ==================================================

console.log("");
print_section("Part 3: Code Block Prefilling");

/**
 * CODE BLOCK PREFILLING:
 *
 * Force specific code block formatting by prefilling
 * with the language fence.
 */

const code_prompt = "Write a function to calculate factorial in Python.";

console.log(`${c.highlight("Prompt:")} "${code_prompt}"\n`);

console.log(`${c.label("With Code Block Prefill:")}`);
console.log(`${c.dim('Prefill: "```python"')}\n`);

const response_code = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 200,
  messages: [
    { role: "user", content: code_prompt },
    { role: "assistant", content: "```python" }, // Force Python block (no trailing newline!)
  ],
});

const text_code = response_code.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

// Show the prefill + continuation
console.log(`${c.value("```python" + text_code.slice(0, 300))}`);

// ==================================================
// PART 4: List Formatting
// ==================================================

console.log("");
print_section("Part 4: List Formatting");

/**
 * LIST PREFILLING:
 *
 * Guide the format of lists by prefilling the structure.
 */

const list_prompt = "List 3 benefits of exercise.";

console.log(`${c.highlight("Prompt:")} "${list_prompt}"\n`);

console.log(`${c.label("With List Prefill:")}`);
console.log(`${c.dim('Prefill: "Here are the key benefits:\\n\\n1."')}\n`);

const response_list = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 200,
  messages: [
    { role: "user", content: list_prompt },
    { role: "assistant", content: "Here are the key benefits:\n\n1." }, // No trailing space!
  ],
});

const text_list = response_list.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

// Show full output with prefill
console.log(`${c.value("Here are the key benefits:\n\n1." + text_list)}`);

// ==================================================
// PART 5: The Trailing Whitespace Gotcha
// ==================================================

console.log("");
print_section("Part 5: The Trailing Whitespace Gotcha");

/**
 * CRITICAL: NO TRAILING WHITESPACE!
 *
 * Prefilled content CANNOT end with trailing whitespace.
 * This will cause an error.
 *
 * WRONG: "The answer is "  (trailing space)
 * RIGHT: "The answer is:"  (no trailing space)
 * RIGHT: "The answer is"   (no trailing space)
 */

console.log(`${c.warning("WARNING:")} Prefills CANNOT end with trailing whitespace!\n`);

console.log(`${c.error("✗ WRONG:")} "The answer is "  ${c.dim("(trailing space)")}`);
console.log(`${c.success("✓ RIGHT:")} "The answer is:"  ${c.dim("(ends with colon)")}`);
console.log(`${c.success("✓ RIGHT:")} "The answer is"   ${c.dim("(no trailing space)")}`);
console.log(`${c.success("✓ RIGHT:")} "{"               ${c.dim("(single character)")}`);

console.log(`\n${c.label("Demo - What happens with trailing whitespace:")}`);
console.log(`${c.dim("Attempting: { role: 'assistant', content: 'Hi there ' }")}`);
try {
  await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 50,
    messages: [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there " }, // Trailing space!
    ],
  });
  console.log(`${c.dim("(Unexpectedly succeeded)")}`);
} catch (error: unknown) {
  const err = error as { message?: string; status?: number };
  console.log(`${c.error("✗ API Error (400):")}`);
  console.log(`${c.dim("  'final assistant content cannot end with trailing whitespace'")}`);
}

// ==================================================
// PART 6: Role-Play / Character Consistency
// ==================================================

console.log("");
print_section("Part 6: Role-Play / Character Consistency");

/**
 * ROLE-PLAY PREFILLING:
 *
 * Maintain character consistency in long conversations
 * by prefilling with a character marker.
 */

const roleplay_prompt = "What do you think about modern technology?";

console.log(`${c.highlight("Prompt:")} "${roleplay_prompt}"\n`);

console.log(`${c.label("With Character Prefill:")}`);
console.log(`${c.dim('Prefill: "[Victorian Scholar]"')}\n`);

const response_roleplay = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 150,
  system:
    "You are a Victorian-era scholar from 1890. Respond in character, expressing wonder and sometimes concern about modern inventions.",
  messages: [
    { role: "user", content: roleplay_prompt },
    { role: "assistant", content: "[Victorian Scholar]" },
  ],
});

const text_roleplay = response_roleplay.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

console.log(`${c.value("[Victorian Scholar]" + text_roleplay)}`);

// ==================================================
// PART 7: Prefilling vs Structured Outputs
// ==================================================

console.log("");
print_section("Part 7: Prefilling vs Structured Outputs");

/**
 * WHEN TO USE WHICH:
 *
 * PREFILLING:
 * - Quick format hints
 * - Simple JSON extraction
 * - Skip preambles
 * - Doesn't guarantee schema compliance
 *
 * STRUCTURED OUTPUTS (Lesson 13):
 * - Guaranteed JSON schema compliance
 * - Complex nested structures
 * - Production reliability
 * - Type-safe parsing
 */

console.log(`${c.label("Comparison:")}\n`);

const comparison = [
  {
    aspect: "Use Case",
    prefill: "Quick format hints",
    structured: "Guaranteed schema compliance",
  },
  {
    aspect: "Reliability",
    prefill: "May deviate from expected format",
    structured: "100% schema compliance",
  },
  {
    aspect: "Complexity",
    prefill: "Simple - just add assistant message",
    structured: "Requires JSON schema definition",
  },
  {
    aspect: "Best For",
    prefill: "Simple extraction, code blocks",
    structured: "Production APIs, complex data",
  },
];

for (const row of comparison) {
  console.log(`  ${c.highlight(row.aspect + ":")}`);
  console.log(`    ${c.dim("Prefill:")} ${row.prefill}`);
  console.log(`    ${c.dim("Structured:")} ${row.structured}\n`);
}

console.log(`${c.label("Recommendation:")}`);
console.log(`${c.dim("• Use prefilling for quick wins and simple format control")}`);
console.log(`${c.dim("• Use Structured Outputs (Lesson 13) for production reliability")}`);

// ==================================================
// PART 8: Practical Examples
// ==================================================

console.log("");
print_section("Part 8: Practical Examples");

// Note: These are for display only - actual usage must not have trailing whitespace!
const examples = [
  {
    name: "Force JSON",
    prefill: "{",
    use: "Skip preamble, get raw JSON",
  },
  {
    name: "XML Output",
    prefill: "<response>",
    use: "Start XML document",
  },
  {
    name: "Markdown Table",
    prefill: "| Column 1 |",
    use: "Force table format",
  },
  {
    name: "Direct Answer",
    prefill: "The answer is:",
    use: "Skip explanations",
  },
  {
    name: "Step-by-Step",
    prefill: "Step 1:",
    use: "Force structured reasoning",
  },
  {
    name: "Code Only",
    prefill: "```typescript",
    use: "Get just the code",
  },
];

console.log(`${c.label("Common Prefill Patterns:")}\n`);
console.log(
  `  ${c.dim("Pattern".padEnd(16))} ${c.dim("Prefill".padEnd(30))} ${c.dim("Use Case")}`
);
console.log(`  ${c.dim("-".repeat(70))}`);
for (const ex of examples) {
  const prefill_display = `"${ex.prefill.replace(/\n/g, "\\n")}"`;
  console.log(
    `  ${c.value(ex.name.padEnd(16))} ${c.highlight(prefill_display.padEnd(30))} ${c.dim(ex.use)}`
  );
}

print_footer("END OF LESSON");

/**
 * MESSAGE PREFILLING SUMMARY:
 *
 * WHAT IT IS:
 * - Adding a partial assistant message to guide response format
 * - Claude continues from where the prefill ends
 * - Response contains ONLY the continuation, not the prefill
 *
 * SYNTAX:
 * messages: [
 *   { role: "user", content: "Your prompt" },
 *   { role: "assistant", content: "Your prefill" }  // <-- Add this
 * ]
 *
 * COMMON USES:
 * - "{" for JSON output
 * - "```language\n" for code blocks
 * - Skip preambles and introductions
 * - Maintain role-play consistency
 * - Force specific list/table formats
 *
 * CRITICAL RULE:
 * - Prefill CANNOT end with trailing whitespace!
 * - "Hello " (space) = ERROR
 * - "Hello:" (colon) = OK
 *
 * LIMITATIONS:
 * - NOT supported with extended thinking mode
 * - Doesn't guarantee schema compliance (use Structured Outputs)
 * - Claude may still deviate from expected format
 *
 * BEST PRACTICES:
 * 1. Keep prefills concise and natural
 * 2. No trailing whitespace!
 * 3. Combine prefill + continuation for full output
 * 4. For production reliability, prefer Structured Outputs
 * 5. Test to ensure prefilling produces desired results
 *
 * KEY TAKEAWAYS:
 * 1. Prefilling is a simple way to control output format
 * 2. Add partial assistant message at end of messages array
 * 3. Response is continuation only - combine with prefill
 * 4. Never end prefill with whitespace
 * 5. For strict schema compliance, use Structured Outputs
 *
 * NEXT: Lesson 32 covers Citations
 */
