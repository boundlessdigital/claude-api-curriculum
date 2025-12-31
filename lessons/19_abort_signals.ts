/**
 * LESSON 19: Cancellation (AbortController & Interrupt)
 * =====================================================
 *
 * WHAT YOU'LL LEARN:
 * - Hard cancellation with AbortController
 * - Graceful interruption with result.interrupt()
 * - Timeout patterns for long-running tasks
 * - Handling cancellation errors
 *
 * PREREQUISITE: Lesson 12 (error handling, try/catch patterns)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: abortController Option                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.abortController: AbortController                      │
 * │                                                                         │
 * │ Pass an AbortController to enable cancellation.                         │
 * │ When you call controller.abort(), the query stops immediately.          │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   const controller = new AbortController();                             │
 * │   query({ prompt: "...", options: { abortController: controller } });   │
 * │   // Later: controller.abort() to cancel                                │
 * │                                                                         │
 * │ BEHAVIOR: Throws AbortError - must use try/catch!                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: interrupt() Method                                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Called on the query result for graceful shutdown:                       │
 * │                                                                         │
 * │   const result = query({ ... });                                        │
 * │   await result.interrupt();  // Graceful stop                           │
 * │                                                                         │
 * │ COMPARISON:                                                             │
 * │ | AbortController       | result.interrupt()          |                 │
 * │ |-----------------------|-----------------------------|                 │
 * │ | Hard stop, throws     | Graceful, stream ends       |                 │
 * │ | May leave op incomplete| Waits for current op       |                 │
 * │ | No result message     | Result message received     |                 │
 * │ | Needs try/catch       | Stream ends normally        |                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: AbortError                                                 │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ When AbortController cancels, an AbortError is thrown:                  │
 * │                                                                         │
 * │ catch (err) {                                                           │
 * │   if (err.name === "AbortError") {                                      │
 * │     // Cancellation - expected, handle gracefully                       │
 * │   } else {                                                              │
 * │     // Real error - rethrow or handle                                   │
 * │   }                                                                     │
 * │ }                                                                       │
 * │                                                                         │
 * │ Check err.name === "AbortError" to distinguish from other errors.       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS MATTERS:
 * Long-running agent tasks need to be cancellable:
 * - User clicks "Cancel" in UI
 * - Request timeout exceeded
 * - Resource limits hit
 * - Graceful shutdown on SIGTERM
 *
 * TWO CANCELLATION METHODS:
 *
 * | Method           | Behavior                       | Use Case                |
 * |------------------|--------------------------------|-------------------------|
 * | AbortController  | Hard stop, throws AbortError   | Timeouts, user cancel   |
 * | result.interrupt()| Graceful, waits for current op | Clean shutdown          |
 *
 * CANCELLATION FLOW:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Agent running...                                          │
 *   │        ↓                                                   │
 *   │  controller.abort() called                                 │
 *   │        ↓                                                   │
 *   │  AbortError thrown                                         │
 *   │        ↓                                                   │
 *   │  Your catch block handles it                               │
 *   │        ↓                                                   │
 *   │  (No result message - interrupted)                         │
 *   └─────────────────────────────────────────────────────────────┘
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_result, print_success, print_error, print_warning, c } from "./util/colors";

print_header("LESSON 19: Cancellation (AbortController & Interrupt)");

// ==================================================
// PART 1: Basic AbortController
// ==================================================

print_section("Part 1: AbortController Basics");

/**
 * ABORT CONTROLLER:
 * Standard Web API for cancellation.
 * Create one, pass to query, call .abort() to cancel.
 */

const controller1 = new AbortController();

// Set up a timeout to abort after 3 seconds
const timeout_id = setTimeout(() => {
  print_warning("⏰ Timeout reached! Aborting...");
  controller1.abort();
}, 3000);

const prompt1 = "Count slowly from 1 to 50, with a pause between each number";
console.log(`📤 Prompt: ${prompt1}\n`);

const result1 = query({
  prompt: prompt1,
  options: {
    /**
     * ABORT CONTROLLER OPTION:
     * Pass your AbortController here.
     * When you call controller.abort(), the query stops.
     */
    abortController: controller1,
  },
});

try {
  console.log(`${c.dim("Starting counting task (will abort after 3 seconds)...")}\n`);

  for await (const message of result1) {
    // Log raw JSON
    print_section(`--- ${message.type} ---`);
    log_json("RAW JSON", message, 300);

    if (message.type === "assistant" && message.message?.content) {
      const content = message.message.content;
      const text = Array.isArray(content)
        ? content.map((b: any) => b.text || "").join("")
        : String(content);
      console.log(`${c.label("💬 Claude:")} ${c.value(text.substring(0, 100))}...\n`);
    }

    if (message.type === "result") {
      // We got a result - wasn't aborted
      clearTimeout(timeout_id);
      print_success("Completed without abort");
    }
  }
} catch (err: any) {
  clearTimeout(timeout_id);

  /**
   * ABORT ERROR:
   * When aborted, an AbortError is thrown.
   * Check err.name === "AbortError" to distinguish from other errors.
   */
  if (err.name === "AbortError") {
    print_error("🛑 ABORTED: Task was cancelled by AbortController");
    console.log(`   ${c.dim("This is expected behavior - we set a 3-second timeout")}`);
  } else {
    print_error(`ERROR: ${err.message}`);
    throw err;
  }
}

// ==================================================
// PART 2: User-Triggered Cancellation
// ==================================================

console.log("");
print_section("Part 2: User-Triggered Cancellation");

/**
 * Real-world pattern: Cancel when user clicks a button.
 * The cancel function can be exposed to your UI.
 */

async function run_with_cancel_button() {
  const controller = new AbortController();

  // Expose cancel function (in real app, this would be called by UI)
  const cancel = () => {
    print_warning("🖱️ User clicked cancel!");
    controller.abort();
  };

  // Simulate user clicking cancel after 2 seconds
  const cancel_timer = setTimeout(cancel, 2000);

  const prompt2 = "Write a detailed essay about the history of computing";
  console.log(`📤 Prompt: ${prompt2}\n`);

  const result = query({
    prompt: prompt2,
    options: {
      abortController: controller,
    },
  });

  try {
    console.log(`${c.dim("Starting essay (user will cancel after 2 seconds)...")}\n`);

    for await (const message of result) {
      if (message.type === "assistant" && message.message?.content) {
        // Show partial output
        const content = message.message.content;
        const text = Array.isArray(content)
          ? content.map((b: any) => b.text || "").join("")
          : String(content);
        console.log(`${c.label("📝 Writing:")} ${c.value(text.substring(0, 80))}...\n`);
      }
    }

    clearTimeout(cancel_timer);
    return { cancelled: false, partial: null };

  } catch (err: any) {
    clearTimeout(cancel_timer);

    if (err.name === "AbortError") {
      print_success("Handled user cancellation gracefully");
      return { cancelled: true, partial: "User cancelled" };
    }
    throw err;
  }
}

const cancel_result = await run_with_cancel_button();
print_kv("Result", JSON.stringify(cancel_result));

// ==================================================
// PART 3: Graceful Interrupt
// ==================================================

console.log("");
print_section("Part 3: Graceful Interrupt");

/**
 * INTERRUPT vs ABORT:
 *
 * AbortController.abort():
 *   - Hard stop
 *   - Throws AbortError
 *   - May leave operations incomplete
 *
 * result.interrupt():
 *   - Graceful stop
 *   - Waits for current operation to finish
 *   - Stream ends normally (with result message)
 */

async function graceful_example() {
  const prompt3 = "Read package.json and describe what you find";
  console.log(`📤 Prompt: ${prompt3}\n`);

  const result = query({
    prompt: prompt3,
    options: {
      allowedTools: ["Read"],
      permissionMode: "acceptEdits",
    },
  });

  // Set up graceful interrupt after 2 seconds
  const interrupt_timer = setTimeout(async () => {
    print_warning("⏸️ Requesting graceful interrupt...");

    /**
     * INTERRUPT METHOD:
     * Called on the query result, not an external controller.
     * Waits for current operation, then stops.
     */
    await result.interrupt();

    print_success("Interrupt request completed");
  }, 2000);

  console.log(`${c.dim("Starting task (will interrupt after 2 seconds)...")}\n`);

  for await (const message of result) {
    print_section(`--- ${message.type} ---`);

    if (message.type === "assistant" && message.message?.content) {
      const content = message.message.content;
      const text = Array.isArray(content)
        ? content.map((b: any) => b.text || "").join("")
        : String(content);
      console.log(`${c.label("💬:")} ${c.value(text.substring(0, 100))}...\n`);
    }

    if (message.type === "result") {
      clearTimeout(interrupt_timer);
      const res = message as any;
      print_section("📊 Result received (graceful)");
      print_kv("Subtype", res.subtype);
      print_kv("Cost", `$${res.total_cost_usd?.toFixed(4)}`);
    }
  }
}

await graceful_example();

// ==================================================
// PART 4: Combined Pattern (Timeout + User Cancel)
// ==================================================

console.log("");
print_section("Part 4: Combined Timeout + User Cancel");

/**
 * Production pattern: Support both timeout and user cancellation.
 */

interface AgentOptions {
  timeout_ms: number;
  on_cancel?: () => void;
}

async function run_with_timeout_and_cancel(
  prompt: string,
  options: AgentOptions
) {
  const controller = new AbortController();

  // Timeout
  const timeout_id = setTimeout(() => {
    print_warning(`⏰ Timeout after ${options.timeout_ms}ms`);
    controller.abort();
  }, options.timeout_ms);

  // External cancel function (for UI)
  const cancel = () => {
    print_error("🛑 External cancel requested");
    options.on_cancel?.();
    controller.abort();
  };

  // Return cancel function so UI can use it
  const query_promise = (async () => {
    try {
      const result = query({
        prompt,
        options: { abortController: controller },
      });

      let response = "";
      for await (const message of result) {
        if (message.type === "assistant" && message.message?.content) {
          const content = message.message.content;
          response = Array.isArray(content)
            ? content.map((b: any) => b.text || "").join("")
            : String(content);
        }
        if (message.type === "result") {
          clearTimeout(timeout_id);
          return { success: true, response, cancelled: false };
        }
      }
      return { success: false, response: "", cancelled: false };

    } catch (err: any) {
      clearTimeout(timeout_id);
      if (err.name === "AbortError") {
        return { success: false, response: "", cancelled: true };
      }
      throw err;
    }
  })();

  return { promise: query_promise, cancel };
}

// Demo
console.log(`${c.dim("Starting with 10s timeout...")}\n`);
const { promise, cancel } = run_with_timeout_and_cancel(
  "What is 2 + 2?",
  {
    timeout_ms: 10000,
    on_cancel: () => console.log(`${c.dim("Cleanup on cancel...")}`),
  }
);

// Could expose `cancel` to UI button
// For demo, we just wait for completion
const demo_result = await promise;
print_kv("Demo result", JSON.stringify(demo_result));

print_footer("END OF LESSON");

/**
 * ABORT ERROR STRUCTURE:
 *
 * When caught, an AbortError looks like:
 * {
 *   name: "AbortError",
 *   message: "The operation was aborted"
 * }
 *
 *
 * COMPARISON: AbortController vs interrupt()
 *
 * ┌───────────────────┬─────────────────────┬─────────────────────┐
 * │                   │ AbortController     │ result.interrupt()  │
 * ├───────────────────┼─────────────────────┼─────────────────────┤
 * │ How to use        │ controller.abort()  │ await result.interrupt()│
 * │ Behavior          │ Hard stop, throws   │ Graceful, completes │
 * │ Current operation │ May be interrupted  │ Finishes first      │
 * │ Result message    │ No (throws)         │ Yes (received)      │
 * │ Error handling    │ try/catch required  │ Stream ends normally│
 * │ Use case          │ Timeouts, hard stop │ Clean shutdown      │
 * └───────────────────┴─────────────────────┴─────────────────────┘
 *
 *
 * WHEN TO USE WHICH:
 *
 * AbortController:
 *   - User clicks "Cancel" - wants immediate stop
 *   - Hard timeout exceeded
 *   - System shutdown with deadline
 *
 * result.interrupt():
 *   - Graceful shutdown (SIGTERM handler)
 *   - When you want the final result message
 *   - When current operation must complete
 *
 *
 * KEY TAKEAWAYS:
 * 1. AbortController for hard cancellation (throws AbortError)
 * 2. result.interrupt() for graceful stop (stream ends normally)
 * 3. Always wrap in try/catch when using AbortController
 * 4. Check err.name === "AbortError" to distinguish cancellation
 * 5. Combine with setTimeout for timeout patterns
 * 6. Expose cancel function to UI for user cancellation
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - abortController option (AbortController type)
 * - result.interrupt() method
 * - AbortError (name: "AbortError")
 * - Timeout + cancellation patterns
 *
 * NEXT: Lesson 20 combines all concepts into a production-ready agent
 */
