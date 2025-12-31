/**
 * LESSON 25: Batch Processing
 * =============================
 *
 * WHAT YOU'LL LEARN:
 * - What batch processing is and when to use it
 * - How to create, monitor, and retrieve batch results
 * - 50% cost savings compared to synchronous API
 * - Handling different result types (success, error, expired)
 * - Combining batch with prompt caching for maximum savings
 *
 * PREREQUISITE: Lesson 14 (cost tracking), Lesson 24 (caching)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Batch Processing                                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Submit multiple requests at once for asynchronous processing.          │
 * │                                                                         │
 * │ Benefits:                                                               │
 * │ - 50% discount on ALL tokens (input + output)                          │
 * │ - Process up to 100,000 requests per batch                             │
 * │ - No timeout limits on individual requests                             │
 * │ - Ideal for bulk processing, data pipelines, offline tasks             │
 * │                                                                         │
 * │ Trade-offs:                                                             │
 * │ - Asynchronous (results not immediate)                                  │
 * │ - Up to 24 hours processing time (usually <1 hour)                     │
 * │ - Results expire after 29 days                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Batch Request Structure                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Each request needs a custom_id for matching results:                    │
 * │                                                                         │
 * │ {                                                                       │
 * │   custom_id: "unique-id-1",     // Your ID for tracking                │
 * │   params: {                                                             │
 * │     model: "claude-sonnet-4-5-20250929",                               │
 * │     max_tokens: 1024,                                                   │
 * │     messages: [{ role: "user", content: "..." }]                       │
 * │   }                                                                     │
 * │ }                                                                       │
 * │                                                                         │
 * │ Results are UNORDERED - always use custom_id to match!                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Batch Processing Status                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Batches go through these states:                                        │
 * │                                                                         │
 * │ in_progress → ended                                                     │
 * │       ↓                                                                 │
 * │   canceling → ended                                                     │
 * │                                                                         │
 * │ Request counts available during processing:                             │
 * │ - processing: Still being processed                                     │
 * │ - succeeded: Completed successfully                                     │
 * │ - errored: Failed (validation or server error)                         │
 * │ - canceled: User canceled before processing                             │
 * │ - expired: 24-hour limit reached                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * PRICING (50% OFF regular API):
 *
 * | Model           | Batch Input  | Batch Output |
 * |-----------------|--------------|--------------|
 * | Claude Opus 4.5 | $2.50 / MTok | $12.50 / MTok|
 * | Claude Sonnet 4.5| $1.50 / MTok| $7.50 / MTok |
 * | Claude Haiku 4.5| $0.50 / MTok | $2.50 / MTok |
 *
 * NOTE: The Claude Agent SDK focuses on interactive sessions.
 * For batch processing, use the Anthropic SDK directly.
 * This lesson demonstrates the concepts and patterns.
 */

import Anthropic from "@anthropic-ai/sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_success, print_error, print_warning, c } from "./util/colors";

print_header("LESSON 25: Batch Processing");

// Initialize the Anthropic client
const anthropic = new Anthropic();

// ==================================================
// PART 1: Creating a Batch
// ==================================================

print_section("Part 1: Creating a Batch");

/**
 * BATCH REQUEST:
 * Each request has a custom_id and params (standard Messages API params).
 */

const batch_requests = [
  {
    custom_id: "translation-1",
    params: {
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
      messages: [
        { role: "user" as const, content: "Translate 'Hello, world!' to French" },
      ],
    },
  },
  {
    custom_id: "translation-2",
    params: {
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
      messages: [
        { role: "user" as const, content: "Translate 'Hello, world!' to Spanish" },
      ],
    },
  },
  {
    custom_id: "translation-3",
    params: {
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
      messages: [
        { role: "user" as const, content: "Translate 'Hello, world!' to Japanese" },
      ],
    },
  },
];

console.log(`${c.label("Batch requests to submit:")}`);
for (const req of batch_requests) {
  console.log(`   ${c.highlight(req.custom_id)}: ${c.dim(req.params.messages[0].content)}`);
}

console.log(`\n${c.dim("Creating batch...")}`);

let batch_id: string;

try {
  /**
   * CREATE BATCH:
   * Submit all requests at once.
   * Returns immediately with batch ID.
   */
  const batch = await anthropic.messages.batches.create({
    requests: batch_requests,
  });

  batch_id = batch.id;

  print_section("📦 Batch Created");
  print_kv("Batch ID", batch.id);
  print_kv("Status", batch.processing_status);
  print_kv("Created", batch.created_at);

  console.log(`\n${c.label("Request counts:")}`);
  print_kv("Processing", batch.request_counts.processing);
  print_kv("Succeeded", batch.request_counts.succeeded);
  print_kv("Errored", batch.request_counts.errored);

} catch (error: any) {
  print_error(`Failed to create batch: ${error.message}`);
  print_warning("Note: Batch API requires valid API key with batch permissions");
  print_warning("Continuing with simulated batch for demonstration...");

  // Simulate batch for demonstration
  batch_id = "batch_demo_12345";
}

// ==================================================
// PART 2: Polling for Completion
// ==================================================

console.log("");
print_section("Part 2: Monitoring Batch Status");

/**
 * POLLING:
 * Check batch status periodically until complete.
 */

console.log(`${c.dim("Polling for batch completion...")}\n`);

async function poll_batch(id: string, max_attempts = 10): Promise<any> {
  for (let attempt = 1; attempt <= max_attempts; attempt++) {
    try {
      const batch = await anthropic.messages.batches.retrieve(id);

      console.log(`   ${c.dim(`Attempt ${attempt}:`)} Status = ${c.highlight(batch.processing_status)}`);
      console.log(`      Processing: ${batch.request_counts.processing}, Succeeded: ${batch.request_counts.succeeded}`);

      if (batch.processing_status === "ended") {
        return batch;
      }

      // Wait before next poll (30 seconds for demo, 60s recommended in production)
      await new Promise((resolve) => setTimeout(resolve, 5000));

    } catch (error: any) {
      console.log(`   ${c.error(`Attempt ${attempt} failed:`)} ${error.message}`);
    }
  }

  return null;
}

let completed_batch: any;

try {
  completed_batch = await poll_batch(batch_id);
} catch (error) {
  print_warning("Batch polling simulated for demonstration");
  completed_batch = {
    id: batch_id,
    processing_status: "ended",
    request_counts: {
      processing: 0,
      succeeded: 3,
      errored: 0,
      canceled: 0,
      expired: 0,
    },
  };
}

if (completed_batch) {
  print_success("Batch processing complete!");
  print_kv("Final status", completed_batch.processing_status);
  console.log(`\n${c.label("Final request counts:")}`);
  print_kv("Succeeded", completed_batch.request_counts?.succeeded || 0);
  print_kv("Errored", completed_batch.request_counts?.errored || 0);
  print_kv("Expired", completed_batch.request_counts?.expired || 0);
  print_kv("Canceled", completed_batch.request_counts?.canceled || 0);
}

// ==================================================
// PART 3: Retrieving Results
// ==================================================

console.log("");
print_section("Part 3: Retrieving Results");

/**
 * RESULTS:
 * Stream results and match by custom_id.
 */

console.log(`${c.dim("Fetching results...")}\n`);

try {
  for await (const result of await anthropic.messages.batches.results(batch_id)) {
    console.log(`${c.highlight(result.custom_id)}:`);

    switch (result.result.type) {
      case "succeeded":
        /**
         * SUCCESS:
         * result.result.message contains the full API response.
         */
        const message = result.result.message;
        const text = message.content[0].type === "text" ? message.content[0].text : "";
        console.log(`   ${c.success("✅")} ${c.value(text)}`);
        break;

      case "errored":
        /**
         * ERROR:
         * Two types: invalid_request (fix and retry) or server error (can retry as-is)
         */
        const error = result.result.error;
        if (error.type === "invalid_request") {
          console.log(`   ${c.error("❌ Validation error:")} ${error.message}`);
        } else {
          console.log(`   ${c.error("❌ Server error:")} Retry this request`);
        }
        break;

      case "expired":
        /**
         * EXPIRED:
         * Request didn't process within 24 hours.
         */
        console.log(`   ${c.warning("⏰ Expired:")} Re-submit this request`);
        break;

      case "canceled":
        /**
         * CANCELED:
         * Batch was canceled before this request processed.
         */
        console.log(`   ${c.warning("🚫 Canceled:")} Re-submit if needed`);
        break;
    }
  }

} catch (error: any) {
  print_warning(`Result retrieval simulated: ${error.message}`);

  // Simulate results for demonstration
  console.log(`${c.highlight("translation-1")}:`);
  console.log(`   ${c.success("✅")} ${c.value("Bonjour, le monde!")}`);
  console.log(`${c.highlight("translation-2")}:`);
  console.log(`   ${c.success("✅")} ${c.value("¡Hola, mundo!")}`);
  console.log(`${c.highlight("translation-3")}:`);
  console.log(`   ${c.success("✅")} ${c.value("こんにちは、世界!")}`);
}

// ==================================================
// PART 4: Cost Comparison
// ==================================================

console.log("");
print_section("Part 4: Cost Savings");

/**
 * BATCH PRICING:
 * 50% off standard API pricing!
 */

const example_tokens = 100000; // 100K tokens

console.log(`
${c.label("Cost comparison for 100K input tokens (Claude Sonnet 4.5):")}

   ${c.highlight("Standard API:")}
   100K × $3.00/MTok = ${c.value("$0.30")}

   ${c.highlight("Batch API (50% off):")}
   100K × $1.50/MTok = ${c.success("$0.15")}

   ${c.highlight("Savings:")} ${c.success("$0.15 (50%)")}
`);

console.log(`
${c.label("Even more savings with caching + batch:")}

   ${c.highlight("Batch + cache write:")}
   $1.50 × 1.25 = $1.875/MTok (first request)

   ${c.highlight("Batch + cache read:")}
   $1.50 × 0.1 = ${c.success("$0.15/MTok")} (subsequent requests)

   For repeated prompts, combine batch + cache for up to ${c.success("95% savings!")}
`);

// ==================================================
// PART 5: When to Use Batch
// ==================================================

console.log("");
print_section("Part 5: When to Use Batch Processing");

console.log(`${c.label("IDEAL USE CASES:")}`);
console.log(`   ${c.success("✅")} Bulk document analysis (100s-1000s of documents)`);
console.log(`   ${c.success("✅")} Data processing pipelines`);
console.log(`   ${c.success("✅")} Content moderation at scale`);
console.log(`   ${c.success("✅")} Translation workflows`);
console.log(`   ${c.success("✅")} Nightly/scheduled processing jobs`);
console.log(`   ${c.success("✅")} Any non-time-sensitive bulk work`);

console.log(`\n${c.label("NOT IDEAL FOR:")}`);
console.log(`   ${c.error("❌")} Interactive/real-time applications`);
console.log(`   ${c.error("❌")} User-facing features needing immediate response`);
console.log(`   ${c.error("❌")} Single or few requests (overhead not worth it)`);
console.log(`   ${c.error("❌")} Time-sensitive workflows`);

console.log(`\n${c.label("BATCH LIMITS:")}`);
console.log(`   ${c.dim("Max requests:")} 100,000 per batch`);
console.log(`   ${c.dim("Max size:")} 256 MB per batch`);
console.log(`   ${c.dim("Processing time:")} Up to 24 hours (usually <1 hour)`);
console.log(`   ${c.dim("Result expiry:")} 29 days after creation`);

// ==================================================
// PART 6: Batch Management
// ==================================================

console.log("");
print_section("Part 6: Batch Management API");

/**
 * BATCH MANAGEMENT:
 * List, cancel, and monitor batches.
 */

console.log(`${c.label("Available batch operations:")}`);

console.log(`
   ${c.highlight("Create:")}
   const batch = await client.messages.batches.create({ requests: [...] });

   ${c.highlight("Retrieve:")}
   const batch = await client.messages.batches.retrieve(batch_id);

   ${c.highlight("List all:")}
   for await (const batch of client.messages.batches.list({ limit: 20 })) {
     console.log(batch.id, batch.processing_status);
   }

   ${c.highlight("Cancel:")}
   const batch = await client.messages.batches.cancel(batch_id);
   // Status becomes "canceling", then "ended"

   ${c.highlight("Get results:")}
   for await (const result of await client.messages.batches.results(batch_id)) {
     console.log(result.custom_id, result.result.type);
   }
`);

print_footer("END OF LESSON");

/**
 * BATCH REQUEST STRUCTURE:
 *
 * {
 *   custom_id: "unique-id",     // Your tracking ID (required)
 *   params: {
 *     model: "claude-sonnet-4-5-20250929",
 *     max_tokens: 1024,
 *     system: "...",           // Optional
 *     messages: [
 *       { role: "user", content: "..." }
 *     ],
 *     tools: [...],            // Optional
 *     // Any other Messages API params
 *   }
 * }
 *
 *
 * BATCH STATUS OBJECT:
 *
 * {
 *   id: "batch_abc123",
 *   type: "message_batch",
 *   processing_status: "in_progress" | "canceling" | "ended",
 *   request_counts: {
 *     processing: number,
 *     succeeded: number,
 *     errored: number,
 *     canceled: number,
 *     expired: number
 *   },
 *   created_at: "2024-01-15T12:00:00Z",
 *   ended_at: "2024-01-15T12:30:00Z",  // When status = "ended"
 *   results_url: "https://..."         // When results ready
 * }
 *
 *
 * RESULT STRUCTURE:
 *
 * {
 *   custom_id: "unique-id",
 *   result: {
 *     type: "succeeded" | "errored" | "canceled" | "expired",
 *     message?: Message,        // If succeeded
 *     error?: {                 // If errored
 *       type: "invalid_request" | "server_error",
 *       message: string
 *     }
 *   }
 * }
 *
 *
 * PRICING COMPARISON:
 *
 * | Model           | Standard Input | Batch Input | Savings |
 * |-----------------|----------------|-------------|---------|
 * | Claude Opus 4.5 | $5.00 / MTok   | $2.50 / MTok| 50%     |
 * | Claude Sonnet 4.5| $3.00 / MTok  | $1.50 / MTok| 50%     |
 * | Claude Haiku 4.5| $1.00 / MTok   | $0.50 / MTok| 50%     |
 *
 *
 * KEY TAKEAWAYS:
 * 1. Batch processing gives 50% discount on all tokens
 * 2. Use custom_id to match requests with results
 * 3. Results are unordered - always match by custom_id
 * 4. Handle all result types: succeeded, errored, expired, canceled
 * 5. Combine with prompt caching for up to 95% savings
 * 6. Ideal for bulk, non-time-sensitive workloads
 * 7. Use Anthropic SDK (not Agent SDK) for batch operations
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - messages.batches.create() for submitting batches
 * - messages.batches.retrieve() for status checking
 * - messages.batches.results() for streaming results
 * - Batch pricing (50% discount)
 * - Result types (succeeded, errored, expired, canceled)
 * - Batch limits (100K requests, 256MB, 24h processing)
 *
 * NEXT: Lesson 26 explores vision and image processing
 */
