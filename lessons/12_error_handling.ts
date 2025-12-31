/**
 * LESSON 12: Production Error Handling
 * =====================================
 *
 * WHAT YOU'LL LEARN:
 * - Every way an agent can fail
 * - How to detect and handle each failure mode
 * - Building a robust wrapper for production use
 * - The difference between result subtypes
 *
 * PREREQUISITE: Lesson 11 (message types, result message)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Result Subtypes                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The result message subtype tells you exactly what happened:             │
 * │                                                                         │
 * │ | Subtype                             | Meaning                       | │
 * │ |-------------------------------------|-------------------------------| │
 * │ | success                             | Task completed normally       | │
 * │ | error_max_budget_usd                | Hit maxBudgetUsd limit        | │
 * │ | error_max_turns                     | Hit maxTurns limit            | │
 * │ | error_during_execution              | Tool or internal error        | │
 * │ | error_max_structured_output_retries | JSON validation kept failing  | │
 * │                                                                         │
 * │ IMPORTANT: Check subtype, not just is_error!                            │
 * │ The subtype tells you WHY it failed, not just that it did.              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: maxBudgetUsd Option                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.maxBudgetUsd: number                                  │
 * │                                                                         │
 * │ Sets a cost limit for the query. When exceeded:                         │
 * │ - Execution stops                                                       │
 * │ - Result subtype = "error_max_budget_usd"                               │
 * │ - Partial results may exist in result.result                            │
 * │                                                                         │
 * │ ALWAYS set this in production to prevent runaway costs!                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: maxTurns Option                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.maxTurns: number                                      │
 * │                                                                         │
 * │ Limits the number of back-and-forth exchanges. When exceeded:           │
 * │ - Execution stops                                                       │
 * │ - Result subtype = "error_max_turns"                                    │
 * │ - Usually means task is too complex or agent is stuck                   │
 * │                                                                         │
 * │ Set this to prevent infinite loops!                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS MATTERS:
 * Agents can fail in MANY ways - not just exceptions. If you only use try/catch,
 * you'll miss most failure modes. The result message tells you exactly what happened.
 *
 * ADDITIONAL FAILURES (not in result):
 * - AbortError: Your AbortController cancelled the request
 * - Network errors: Connection issues
 * - Authentication errors: Invalid API key
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_result, print_success, print_error, print_warning, c } from "./util/colors";

print_header("LESSON 12: Production Error Handling");

// A comprehensive result type that captures all outcomes
interface AgentResult {
  success: boolean;
  data?: string;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
  cost_usd: number;
  duration_ms: number;
  turns: number;
  raw_result?: any; // For debugging
}

/**
 * A production-ready wrapper that handles ALL failure modes.
 * This is the pattern you should use in real applications.
 */
async function run_agent_safely(
  prompt: string,
  options: {
    budget_usd?: number;
    max_turns?: number;
    timeout_ms?: number;
  } = {}
): Promise<AgentResult> {
  const {
    budget_usd = 0.50,
    max_turns = 10,
    timeout_ms = 30000,
  } = options;

  // Create abort controller for timeout
  const abort_controller = new AbortController();
  const timeout_id = setTimeout(() => {
    print_warning("Timeout reached, aborting...");
    abort_controller.abort();
  }, timeout_ms);

  const start_time = Date.now();

  try {
    const result = query({
      prompt,
      options: {
        abortController: abort_controller,
        maxBudgetUsd: budget_usd,
        maxTurns: max_turns,
      },
    });

    for await (const message of result) {
      // Log raw JSON for every message
      print_section(`\n📨 MESSAGE: ${message.type}`);
      log_json("RAW JSON", message);

      // Handle the result message - this is where we learn the outcome
      if (message.type === "result") {
        clearTimeout(timeout_id);
        const res = message as any;

        // Store raw result for debugging
        const raw_result = {
          subtype: res.subtype,
          is_error: res.is_error,
          errors: res.errors,
          permission_denials: res.permission_denials,
        };

        print_section("📊 RESULT ANALYSIS");
        print_kv("Subtype", res.subtype);
        print_kv("Is Error", res.is_error);
        print_kv("Cost", `$${res.total_cost_usd?.toFixed(4)}`);
        print_kv("Turns", res.num_turns);

        // Handle each subtype explicitly
        switch (res.subtype) {
          case "success":
            /**
             * SUCCESS
             * The agent completed its task normally.
             * res.result contains the final response.
             */
            return {
              success: true,
              data: res.result,
              cost_usd: res.total_cost_usd || 0,
              duration_ms: Date.now() - start_time,
              turns: res.num_turns || 0,
              raw_result,
            };

          case "error_max_budget_usd":
            /**
             * BUDGET EXCEEDED
             * The agent was stopped because cost exceeded maxBudgetUsd.
             * You got SOME work done, but not everything.
             * res.result may contain partial results.
             */
            return {
              success: false,
              data: res.result, // Partial result might exist
              error: {
                type: "budget_exceeded",
                message: `Cost exceeded limit of $${budget_usd}`,
                details: { actual_cost: res.total_cost_usd },
              },
              cost_usd: res.total_cost_usd || 0,
              duration_ms: Date.now() - start_time,
              turns: res.num_turns || 0,
              raw_result,
            };

          case "error_max_turns":
            /**
             * TOO MANY TURNS
             * The agent hit the maxTurns limit.
             * This usually means:
             * - Task is too complex
             * - Agent is stuck in a loop
             * - Task wasn't clear enough
             */
            return {
              success: false,
              data: res.result,
              error: {
                type: "max_turns_exceeded",
                message: `Exceeded ${max_turns} turns - task may be too complex`,
                details: { turns_used: res.num_turns },
              },
              cost_usd: res.total_cost_usd || 0,
              duration_ms: Date.now() - start_time,
              turns: res.num_turns || 0,
              raw_result,
            };

          case "error_during_execution":
            /**
             * EXECUTION ERROR
             * Something went wrong during tool execution.
             * Check res.errors for details.
             * Common causes:
             * - Tool threw an exception
             * - File not found
             * - Permission denied
             * - Network error in tool
             */
            return {
              success: false,
              error: {
                type: "execution_error",
                message: res.errors?.join("; ") || "Execution failed",
                details: { errors: res.errors },
              },
              cost_usd: res.total_cost_usd || 0,
              duration_ms: Date.now() - start_time,
              turns: res.num_turns || 0,
              raw_result,
            };

          case "error_max_structured_output_retries":
            /**
             * STRUCTURED OUTPUT FAILED
             * When using outputFormat, Claude must return valid JSON.
             * If it keeps failing validation, you get this error.
             * Possible causes:
             * - Schema is too complex
             * - Task doesn't match expected output format
             * - Model confusion
             */
            return {
              success: false,
              error: {
                type: "structured_output_failed",
                message: "Failed to generate valid structured output",
                details: { errors: res.errors },
              },
              cost_usd: res.total_cost_usd || 0,
              duration_ms: Date.now() - start_time,
              turns: res.num_turns || 0,
              raw_result,
            };

          default:
            /**
             * UNKNOWN ERROR
             * New error type we haven't seen before.
             * Log it and handle gracefully.
             */
            return {
              success: false,
              error: {
                type: "unknown",
                message: `Unknown result subtype: ${res.subtype}`,
                details: { subtype: res.subtype, is_error: res.is_error },
              },
              cost_usd: res.total_cost_usd || 0,
              duration_ms: Date.now() - start_time,
              turns: res.num_turns || 0,
              raw_result,
            };
        }
      }
    }

    // If we get here without a result message, something is very wrong
    clearTimeout(timeout_id);
    return {
      success: false,
      error: {
        type: "no_result",
        message: "Stream ended without a result message",
      },
      cost_usd: 0,
      duration_ms: Date.now() - start_time,
      turns: 0,
    };

  } catch (err: any) {
    clearTimeout(timeout_id);

    /**
     * EXCEPTION HANDLING
     * These are errors that happen OUTSIDE the normal message flow.
     */

    if (err.name === "AbortError") {
      /**
       * ABORTED
       * Your AbortController cancelled the request.
       * This happens on timeout or manual cancellation.
       */
      return {
        success: false,
        error: {
          type: "aborted",
          message: "Request was aborted (timeout or manual cancellation)",
        },
        cost_usd: 0, // Unknown - request was cut off
        duration_ms: Date.now() - start_time,
        turns: 0,
      };
    }

    if (err.message?.includes("API key")) {
      /**
       * AUTHENTICATION ERROR
       * Invalid or missing API key.
       */
      return {
        success: false,
        error: {
          type: "auth_error",
          message: "Authentication failed - check your API key",
        },
        cost_usd: 0,
        duration_ms: Date.now() - start_time,
        turns: 0,
      };
    }

    // Generic error
    return {
      success: false,
      error: {
        type: "exception",
        message: err.message || "Unknown error",
        details: { name: err.name, stack: err.stack },
      },
      cost_usd: 0,
      duration_ms: Date.now() - start_time,
      turns: 0,
    };
  }
}

// ==================================================
// DEMO: Test the error handler
// ==================================================

print_section("Testing Error Handler");

// Normal successful request
print_section("\n--- Test 1: Normal Request ---");
const test_prompt = "What is 2 + 2?";
console.log(`📤 Prompt: ${test_prompt}\n`);
const result1 = await run_agent_safely(test_prompt, {
  budget_usd: 0.10,
  max_turns: 5,
  timeout_ms: 30000,
});

print_section("\n📋 FINAL RESULT");
log_json("Result", result1);

print_footer("END OF LESSON");

// You could also test edge cases:
// - Very low budget to trigger error_max_budget_usd
// - maxTurns: 1 to trigger error_max_turns on complex tasks
// - timeout_ms: 100 to trigger AbortError

/**
 * RESULT MESSAGE STRUCTURE (raw JSON example):
 *
 * {
 *   "type": "result",
 *   "subtype": "success",           // or error_*
 *   "is_error": false,              // true for any error
 *   "result": "4",                  // Claude's final response
 *   "total_cost_usd": 0.0012,       // Total cost
 *   "duration_ms": 1234,            // Total time
 *   "duration_api_ms": 800,         // Time in API calls
 *   "num_turns": 1,                 // Back-and-forth count
 *   "usage": {
 *     "input_tokens": 150,
 *     "output_tokens": 10,
 *     "cache_read_input_tokens": 0,
 *     "cache_creation_input_tokens": 0
 *   },
 *   "modelUsage": {
 *     "claude-sonnet-4-20250514": {
 *       "inputTokens": 150,
 *       "outputTokens": 10,
 *       "cacheReadInputTokens": 0,
 *       "cacheCreationInputTokens": 0,
 *       "costUSD": 0.0012
 *     }
 *   },
 *   "errors": [],                   // Empty for success
 *   "permission_denials": []        // Empty if no denials
 * }
 *
 *
 * KEY TAKEAWAYS:
 * 1. ALWAYS handle the result message - it's the source of truth
 * 2. Check res.subtype, not just res.is_error - it tells you WHY it failed
 * 3. Set maxBudgetUsd and maxTurns in production - unbounded agents are dangerous
 * 4. Use AbortController with setTimeout for hard timeouts
 * 5. Wrap everything in try/catch for network/auth errors
 * 6. Partial results (res.result) may exist even on failure
 * 7. Check permission_denials to see if canUseTool blocked anything
 */
