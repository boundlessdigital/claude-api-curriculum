/**
 * LESSON 10: Sessions (Multi-Turn Conversations)
 * ===============================================
 *
 * WHAT YOU'LL LEARN:
 * - How sessions preserve context across multiple queries
 * - How to capture and use session IDs
 * - The difference between new sessions, resume, and fork
 * - When to use sessions vs single queries
 *
 * PREREQUISITE: Lesson 01 (query(), message types)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: session_id                                                 │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Every query creates a session. The session_id uniquely identifies it.   │
 * │                                                                         │
 * │ LOCATION: In the system init message:                                   │
 * │ {                                                                       │
 * │   type: "system",                                                       │
 * │   subtype: "init",                                                      │
 * │   session_id: "sess_abc123..."  ← Capture this!                         │
 * │ }                                                                       │
 * │                                                                         │
 * │ Sessions persist on disk in ~/.claude-code/sessions/                    │
 * │ Store session_id in your database to resume later.                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: resume Option                                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.resume: string                                        │
 * │                                                                         │
 * │ Pass a session_id to continue an existing conversation.                 │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   query({ prompt: "Follow-up question", options: { resume: session_id }})│
 * │                                                                         │
 * │ Claude will have access to the full conversation history.               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: forkSession Option                                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.forkSession: boolean                                  │
 * │                                                                         │
 * │ Creates a NEW session branching from an existing one.                   │
 * │ The original session remains unchanged.                                 │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   query({                                                               │
 * │     prompt: "Try a different approach",                                 │
 * │     options: { resume: session_id, forkSession: true }                  │
 * │   })                                                                    │
 * │                                                                         │
 * │ USE CASE: "What if I tried X instead?" scenarios.                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * SESSION OPERATIONS:
 * - NEW:    Start fresh (no resume option)
 * - RESUME: Continue existing session (resume: session_id)
 * - FORK:   Branch from a point (resume + forkSession: true)
 *
 * WHEN TO USE SESSIONS:
 * ✅ Multi-turn conversations
 * ✅ Following up on previous work
 * ✅ Building chat interfaces
 * ✅ Long-running tasks you might interrupt
 *
 * WHEN NOT TO USE:
 * ❌ One-off questions
 * ❌ Parallel independent tasks
 * ❌ Stateless API-like usage
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, log_response, print_result, print_success, print_error, c } from "./util/colors";

print_header("LESSON 10: Sessions (Multi-Turn Conversations)");

// We'll capture session info from the messages
let session_id: string | undefined;
let checkpoints: string[] = [];

// ==================================================
// PART 1: Starting a new session
// ==================================================
print_section("PART 1: New Session");

const prompt1 = "Remember these three items: apple, banana, cherry";
console.log(`📤 Prompt: ${prompt1}\n`);

const result1 = query({
  prompt: prompt1,
});

for await (const message of result1) {
  // Session ID is in the system init message
  if (message.type === "system") {
    const sys = message as any;
    if (sys.subtype === "init") {
      session_id = sys.session_id;
      print_success("Session started");
      log_json("Raw init message", sys, 300);
    }
  }

  // User messages have UUIDs that are checkpoints
  if (message.type === "user" && message.uuid) {
    checkpoints.push(message.uuid);
    print_kv("Checkpoint", message.uuid);
  }

  if (message.type === "assistant" && message.message?.content) {
    log_response("Claude:", message.message.content as any);
  }

  if (message.type === "result") {
    print_success("Turn 1 complete");
    print_kv("Session ID", session_id ?? "none");
  }
}

// ==================================================
// PART 2: Resuming the session
// ==================================================
console.log("");
print_section("PART 2: Resume Session");

if (!session_id) {
  print_error("No session ID captured!");
  process.exit(1);
}

const prompt2 = "What were the three items I asked you to remember?";
console.log(`📤 Prompt: ${prompt2}\n`);

const result2 = query({
  prompt: prompt2,
  options: {
    resume: session_id, // This continues the conversation
  },
});

for await (const message of result2) {
  if (message.type === "assistant" && message.message?.content) {
    log_response("Claude:", message.message.content as any);
  }

  if (message.type === "result") {
    print_success("Turn 2 complete (resumed session)");
  }
}

// ==================================================
// PART 3: Forking a session
// ==================================================
console.log("");
print_section("PART 3: Fork Session");

// Forking creates a branch - original session is unchanged
const prompt3 = "Actually, forget the fruits. Remember these instead: dog, cat, bird";
console.log(`📤 Prompt: ${prompt3}\n`);

const result3 = query({
  prompt: prompt3,
  options: {
    resume: session_id,
    forkSession: true, // Creates a new branch
  },
});

let forked_session_id: string | undefined;

for await (const message of result3) {
  if (message.type === "system" && (message as any).subtype === "init") {
    forked_session_id = (message as any).session_id;
    print_kv("Forked session", forked_session_id);
    print_kv("Original", session_id ?? "none");
  }

  if (message.type === "assistant" && message.message?.content) {
    log_response("Claude:", message.message.content as any);
  }

  if (message.type === "result") {
    print_success("Turn 3 complete (forked session)");
  }
}

// ==================================================
// PART 4: Verify original session is unchanged
// ==================================================
console.log("");
print_section("PART 4: Original Session Unchanged");

const prompt4 = "What items am I supposed to remember?";
console.log(`📤 Prompt: ${prompt4}\n`);

const result4 = query({
  prompt: prompt4,
  options: {
    resume: session_id, // Back to original session
  },
});

for await (const message of result4) {
  if (message.type === "assistant" && message.message?.content) {
    log_response("Claude (original session):", message.message.content as any);
    // Should still say: apple, banana, cherry
  }
}

// ==================================================
// PART 5: Verify forked session has new items
// ==================================================
console.log("");
print_section("PART 5: Forked Session Has New Items");

if (forked_session_id) {
  const prompt5 = "What items am I supposed to remember?";
  console.log(`📤 Prompt: ${prompt5}\n`);

  const result5 = query({
    prompt: prompt5,
    options: {
      resume: forked_session_id,
    },
  });

  for await (const message of result5) {
    if (message.type === "assistant" && message.message?.content) {
      log_response("Claude (forked session):", message.message.content as any);
      // Should say: dog, cat, bird
    }
  }
}

print_footer("END OF LESSON");

/**
 * SESSION ID LOCATION:
 *
 * The session_id is in the system init message:
 * {
 *   "type": "system",
 *   "subtype": "init",
 *   "session_id": "sess_abc123...",
 *   "model": "claude-...",
 *   ...
 * }
 *
 *
 * RESUME VS FORK:
 *
 * RESUME (resume: session_id):
 * - Continues the same session
 * - Adds to existing conversation
 * - Both parties see all history
 *
 * FORK (resume + forkSession: true):
 * - Creates a new session branching from that point
 * - Original session unchanged
 * - New session has all history up to fork point
 * - Useful for: "What if I tried X instead?"
 *
 *
 * CHECKPOINTS (User Message UUIDs):
 *
 * Every user message has a UUID. These are checkpoints you can:
 * - Rewind files to (lesson 17)
 * - Resume from specific point (resumeSessionAt)
 *
 * {
 *   "type": "user",
 *   "uuid": "msg_xyz789...",  // <-- Checkpoint ID
 *   ...
 * }
 *
 *
 * SESSION PERSISTENCE:
 *
 * Sessions are stored on disk in ~/.claude-code/sessions/
 * They persist across process restarts.
 * Store session_id in your database to resume later.
 *
 *
 * ADVANCED: resumeSessionAt
 *
 * Resume from a specific point in the conversation:
 * {
 *   resume: session_id,
 *   resumeSessionAt: user_message_uuid
 * }
 *
 * This is like time travel - resumes from that exact point.
 *
 *
 * KEY TAKEAWAYS:
 * 1. Session ID is in the system init message
 * 2. Use resume to continue conversations
 * 3. Use forkSession to branch without affecting original
 * 4. User message UUIDs are checkpoints for rewinding
 * 5. Sessions persist on disk - store IDs in your database
 */
