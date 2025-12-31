/**
 * LESSON 18: Streaming Input (Async Generators)
 * ==============================================
 *
 * WHAT YOU'LL LEARN:
 * - Using async generators instead of string prompts
 * - Dynamic multi-turn conversations
 * - Controlling conversation flow programmatically
 * - Real-world use cases for streaming input
 *
 * PREREQUISITE: Lesson 01 (query(), message types)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: AsyncIterable Prompt                                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: prompt: string | AsyncIterable<UserMessage>                   │
 * │                                                                         │
 * │ Instead of a string, you can pass an async generator that yields        │
 * │ user messages. Claude responds to each one in sequence.                 │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   query({ prompt: myAsyncGenerator() })                                 │
 * │                                                                         │
 * │ The generator must yield UserMessage objects (see below).               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: UserMessage Object Structure                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Each yielded message must have this structure:                          │
 * │                                                                         │
 * │ {                                                                       │
 * │   type: "user",                                                         │
 * │   message: {                                                            │
 * │     role: "user",                                                       │
 * │     content: string | ContentBlock[]  // Text or structured content     │
 * │   }                                                                     │
 * │ }                                                                       │
 * │                                                                         │
 * │ Content can be a simple string or an array with text/image blocks.      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS MATTERS:
 * A simple string prompt works for one-shot queries.
 * But for complex interactions, you need more control:
 *
 * - MCP servers that need to inject context
 * - Multi-turn conversations with external input
 * - Reactive systems that respond to events
 * - Agents that need to pause and wait for data
 *
 * HOW IT WORKS:
 *
 * Instead of:
 *   query({ prompt: "Hello" })
 *
 * You can use:
 *   query({ prompt: myAsyncGenerator() })
 *
 * The generator yields user messages, and Claude responds to each.
 *
 * FLOW COMPARISON:
 *
 * String prompt:
 *   You: "What is 2+2?" → Claude: "4" → Done
 *
 * Streaming input:
 *   Generator yields "What is 2+2?"
 *   Claude responds "4"
 *   Generator yields "Multiply by 3"
 *   Claude responds "12"
 *   Generator yields "Is that prime?"
 *   Claude responds "No..."
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_result, c } from "./util/colors";

print_header("LESSON 18: Streaming Input (Async Generators)");

// ==================================================
// PART 1: Basic Streaming Input
// ==================================================

print_section("Part 1: Basic Streaming Input");

/**
 * ASYNC GENERATOR FOR USER MESSAGES:
 *
 * The generator must yield objects with this structure:
 * {
 *   type: "user",
 *   message: {
 *     role: "user",
 *     content: string  // Your message
 *   }
 * }
 */
async function* simple_conversation() {
  console.log(`${c.highlight("📤 Sending:")} ${c.value("'What is the capital of France?'")}`);

  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "What is the capital of France?",
    },
  };

  // You can do async operations between messages
  console.log(`${c.dim("⏳ Waiting 500ms before next message...")}`);
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(`${c.highlight("📤 Sending:")} ${c.value("'What is its population?'")}`);

  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "What is its population?",
    },
  };
}

const result1 = query({
  prompt: simple_conversation(), // Generator instead of string
  options: {},
});

for await (const message of result1) {
  // Log raw JSON
  print_section(`--- ${message.type} ---`);
  log_json("RAW JSON", message, 400);

  if (message.type === "assistant" && message.message?.content) {
    const content = message.message.content;
    const text = Array.isArray(content)
      ? content.map((b: any) => b.text || "").join("")
      : String(content);
    console.log(`${c.label("💬 Claude:")} ${c.value(text)}\n`);
  }
}

// ==================================================
// PART 2: Interactive Question Flow
// ==================================================

console.log("");
print_section("Part 2: Interactive Question Flow");

/**
 * This pattern is useful for:
 * - Quiz/interview agents
 * - Step-by-step wizards
 * - Data collection workflows
 */
async function* question_series() {
  const questions = [
    "What is 2 + 2?",
    "Now multiply that by 3",
    "Is the result a prime number?",
    "What's the next prime number after it?",
  ];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`${c.highlight(`📤 Question ${i + 1}:`)} ${c.value(q)}`);

    yield {
      type: "user" as const,
      message: { role: "user" as const, content: q },
    };

    // Brief pause between questions
    if (i < questions.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`${c.success("📤 All questions sent")}`);
}

const result2 = query({ prompt: question_series() });

let answer_count = 0;
for await (const message of result2) {
  if (message.type === "assistant" && message.message?.content) {
    answer_count++;
    const content = message.message.content;
    const text = Array.isArray(content)
      ? content.map((b: any) => b.text || "").join("")
      : String(content);
    console.log(`${c.label(`💬 Answer ${answer_count}:`)} ${c.value(text)}\n`);
  }
}

// ==================================================
// PART 3: Data-Driven Conversation
// ==================================================

console.log("");
print_section("Part 3: Data-Driven Conversation");

/**
 * Streaming input can fetch data dynamically.
 * This is useful for:
 * - Processing items from a database
 * - Handling real-time events
 * - Injecting live context
 */

// Simulated data source
const data_items = [
  { name: "Project Alpha", status: "active", budget: 50000 },
  { name: "Project Beta", status: "completed", budget: 30000 },
  { name: "Project Gamma", status: "on hold", budget: 75000 },
];

async function* analyze_projects() {
  // First, set the context
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content:
        "I'm going to show you some projects. Analyze each briefly and at the end provide a summary.",
    },
  };

  // Simulate fetching and sending each project
  for (const project of data_items) {
    console.log(`${c.highlight("📤 Sending project:")} ${c.value(project.name)}`);

    // In real code, you might fetch this from a database
    await new Promise((r) => setTimeout(r, 100));

    yield {
      type: "user" as const,
      message: {
        role: "user" as const,
        content: `Project: ${project.name}, Status: ${project.status}, Budget: $${project.budget}`,
      },
    };
  }

  // Request summary
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "Now give me a brief summary of all projects.",
    },
  };
}

const result3 = query({ prompt: analyze_projects() });

for await (const message of result3) {
  if (message.type === "assistant" && message.message?.content) {
    const content = message.message.content;
    const text = Array.isArray(content)
      ? content.map((b: any) => b.text || "").join("")
      : String(content);
    console.log(`${c.label("💬 Claude:")} ${c.value(text)}\n`);
  }
}

// ==================================================
// PART 4: Conditional Flow
// ==================================================

console.log("");
print_section("Part 4: Conditional Flow");

/**
 * Generators can make decisions based on responses.
 * This pattern enables:
 * - Branching conversations
 * - Error handling with retry
 * - Adaptive questioning
 */

// Track responses to make decisions
let last_response = "";

async function* conditional_flow() {
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "Pick a number between 1 and 10",
    },
  };

  // We can't actually access Claude's response here in the generator
  // But we could use external state or callbacks

  // Example: Always ask for explanation
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "Why did you pick that number? Be brief.",
    },
  };

  // Example: End with validation
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "Now multiply your number by 7 and tell me the result.",
    },
  };
}

const result4 = query({ prompt: conditional_flow() });

for await (const message of result4) {
  if (message.type === "assistant" && message.message?.content) {
    const content = message.message.content;
    last_response = Array.isArray(content)
      ? content.map((b: any) => b.text || "").join("")
      : String(content);
    console.log(`${c.label("💬 Claude:")} ${c.value(last_response)}\n`);
  }
}

print_footer("END OF LESSON");

/**
 * USER MESSAGE STRUCTURE (raw JSON):
 *
 * {
 *   "type": "user",
 *   "message": {
 *     "role": "user",
 *     "content": "Your message here"
 *   }
 * }
 *
 *
 * ALTERNATIVE: Complex Content
 *
 * You can also send structured content:
 * {
 *   "type": "user",
 *   "message": {
 *     "role": "user",
 *     "content": [
 *       { "type": "text", "text": "What's in this image?" },
 *       { "type": "image", "source": { ... } }
 *     ]
 *   }
 * }
 *
 *
 * USE CASES FOR STREAMING INPUT:
 *
 * 1. MCP Server Integration
 *    Inject tool results and context dynamically
 *
 * 2. Multi-turn Wizards
 *    Guide user through complex workflows
 *
 * 3. Real-time Data Processing
 *    Feed live data to Claude for analysis
 *
 * 4. Event-Driven Conversations
 *    React to webhooks, user actions, etc.
 *
 * 5. Batch Processing
 *    Process items one by one with context preservation
 *
 * 6. Interactive Debugging
 *    Step through code execution with Claude
 *
 *
 * COMPARISON: String vs Generator
 *
 * String prompt:
 *   - Simple, one-shot queries
 *   - All input known upfront
 *   - No mid-conversation control
 *
 * Generator prompt:
 *   - Complex, multi-turn flows
 *   - Dynamic input based on events/data
 *   - Full control over timing and flow
 *   - Can pause, wait, fetch data
 *
 *
 * KEY TAKEAWAYS:
 * 1. Use async generators for dynamic conversation control
 * 2. Yield objects with { type: "user", message: { role: "user", content: "..." } }
 * 3. You can do async operations between yields
 * 4. Useful for MCP servers, batch processing, wizards
 * 5. Claude responds to each yielded message in order
 * 6. Combine with sessions for persistent multi-turn conversations
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - AsyncIterable<UserMessage> as prompt type
 * - UserMessage object structure
 * - Multi-turn conversation flow via generators
 * - String vs generator prompt comparison
 *
 * NEXT: Lesson 19 explores cancellation with AbortController and interrupt()
 */
