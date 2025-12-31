/**
 * LESSON 17: File Checkpointing and Rewind
 * =========================================
 *
 * WHAT YOU'LL LEARN:
 * - How to enable file change tracking
 * - What checkpoints are (user message UUIDs)
 * - How to rewind files to a previous state
 * - When and why to use checkpointing
 *
 * PREREQUISITE: Lesson 10 (sessions, user message UUID)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: enableFileCheckpointing Option                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.enableFileCheckpointing: boolean                      │
 * │                                                                         │
 * │ When true, the SDK tracks all file changes made during execution.       │
 * │ Required for rewindFiles() to work.                                     │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   query({                                                               │
 * │     prompt: "...",                                                      │
 * │     options: { enableFileCheckpointing: true }                          │
 * │   })                                                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: User Message UUID as Checkpoint                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Every user message (tool result) has a UUID that serves as a checkpoint:│
 * │                                                                         │
 * │ {                                                                       │
 * │   type: "user",                                                         │
 * │   uuid: "msg_abc123...",    ← THIS IS THE CHECKPOINT ID                 │
 * │   message: { role: "user", content: [...] }                             │
 * │ }                                                                       │
 * │                                                                         │
 * │ Store these UUIDs during execution to enable rewinding later.           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: rewindFiles() Method                                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Called on the query result to restore files to a checkpoint:            │
 * │                                                                         │
 * │   const result = query({ ... });                                        │
 * │   // ... iterate through messages, collect checkpoint UUIDs ...         │
 * │   await result.rewindFiles(checkpoint_uuid);                            │
 * │                                                                         │
 * │ REQUIREMENTS:                                                           │
 * │ - enableFileCheckpointing must be true                                  │
 * │ - Session must be resumed (use resume: session_id)                      │
 * │ - UUID must be from a user message in that session                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS MATTERS:
 * Agents make mistakes. Without checkpointing:
 * - A bad edit corrupts your file
 * - You have to manually restore from git
 * - Or worse, you lose work
 *
 * With checkpointing:
 * - Every tool result creates a checkpoint
 * - You can rewind files to any checkpoint
 * - Like an undo button for agent actions
 *
 * HOW IT WORKS:
 *
 * 1. Enable checkpointing:
 *    enableFileCheckpointing: true
 *
 * 2. Each user message has a UUID:
 *    { type: "user", uuid: "msg_abc123..." }
 *
 * 3. This UUID is a checkpoint - file state at that moment
 *
 * 4. Use rewindFiles(uuid) to restore files to that checkpoint
 *
 * CHECKPOINT TIMELINE:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  Agent creates file.txt (v1)                                │
 *   │        ↓                                                    │
 *   │  User message (uuid: "msg_001") ← Checkpoint 1              │
 *   │        ↓                                                    │
 *   │  Agent edits file.txt (v2)                                  │
 *   │        ↓                                                    │
 *   │  User message (uuid: "msg_002") ← Checkpoint 2              │
 *   │        ↓                                                    │
 *   │  Agent edits file.txt (v3) - BAD EDIT!                      │
 *   │        ↓                                                    │
 *   │  User message (uuid: "msg_003") ← Checkpoint 3              │
 *   │                                                              │
 *   │  rewindFiles("msg_002") → file.txt restored to v2           │
 *   └──────────────────────────────────────────────────────────────┘
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_result, print_success, print_error, print_warning, c } from "./util/colors";

print_header("LESSON 17: File Checkpointing and Rewind");

// ==================================================
// PART 1: Enable Checkpointing and Track Changes
// ==================================================

print_section("Part 1: File Checkpointing Demo");

// Store session and checkpoint info
let session_id: string | undefined;
const checkpoints: Array<{
  uuid: string;
  turn: number;
  timestamp: Date;
}> = [];
let turn_counter = 0;

const prompt1 = `Do the following in order:
1. Create a file called checkpoint_demo.txt with the text "Version 1: Initial content"
2. Edit the file to say "Version 2: Updated content"
3. Edit the file to say "Version 3: Final content"`;
console.log(`📤 Prompt: ${prompt1}\n`);

const result1 = query({
  prompt: prompt1,
  options: {
    /**
     * ENABLE FILE CHECKPOINTING:
     * This tells the SDK to track file changes.
     * Required for rewindFiles() to work.
     */
    enableFileCheckpointing: true,

    allowedTools: ["Write", "Edit", "Read"],
    permissionMode: "acceptEdits",
  },
});

for await (const message of result1) {
  // Log raw JSON for educational purposes
  print_section(`--- ${message.type} ---`);
  log_json("RAW JSON", message, 500);

  // Capture session ID from init message
  if (message.type === "system" && message.subtype === "init") {
    const init = message as any;
    session_id = init.session_id;
    print_success(`Session started: ${session_id}`);
  }

  /**
   * USER MESSAGE UUIDs ARE CHECKPOINTS:
   *
   * Every user message (which contains tool results) has a UUID.
   * This UUID represents the state of all files at that moment.
   *
   * User Message Structure:
   * {
   *   "type": "user",
   *   "uuid": "msg_abc123...",    ← THIS IS THE CHECKPOINT ID
   *   "message": {
   *     "role": "user",
   *     "content": [{ "type": "tool_result", ... }]
   *   }
   * }
   */
  if (message.type === "user" && message.uuid) {
    turn_counter++;
    checkpoints.push({
      uuid: message.uuid,
      turn: turn_counter,
      timestamp: new Date(),
    });

    print_section("📍 CHECKPOINT CAPTURED");
    print_kv("Turn", turn_counter);
    print_kv("UUID", message.uuid);
    print_kv("Time", new Date().toISOString());
  }

  // Show tool usage - check content blocks for tool_use
  if (message.type === "assistant") {
    const content = (message as any).message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use") {
          print_kv("Tool", block.name);
          if (block.input?.file_path) {
            print_kv("File", block.input.file_path);
          }
        }
      }
    }
  }

  if (message.type === "result") {
    print_success("Agent finished");
    print_kv("Total checkpoints", checkpoints.length);
  }
}

// ==================================================
// PART 2: Display Checkpoints
// ==================================================

console.log("");
print_section("Part 2: Available Checkpoints");

console.log(`${c.label("Checkpoints captured during execution:")}`);
for (const cp of checkpoints) {
  console.log(`   ${c.dim("Turn")} ${c.highlight(String(cp.turn))}: ${c.value(cp.uuid)}`);
}

// ==================================================
// PART 3: Rewind to a Previous Checkpoint
// ==================================================

console.log("");
print_section("Part 3: Rewinding Files");

if (!session_id) {
  print_error("No session ID captured - cannot rewind");
  process.exit(1);
}

if (checkpoints.length < 2) {
  print_error("Need at least 2 checkpoints to demonstrate rewind");
  process.exit(1);
}

// We'll rewind to checkpoint 1 (after first write, before edits)
const target_checkpoint = checkpoints[0];
print_warning(`Rewinding to checkpoint from Turn ${target_checkpoint.turn}...`);
print_kv("UUID", target_checkpoint.uuid);

/**
 * REWIND PROCESS:
 *
 * 1. Resume the session
 * 2. Call rewindFiles(checkpoint_uuid)
 * 3. Files are restored to their state at that checkpoint
 *
 * NOTE: rewindFiles() is called on the query result object,
 * not as a standalone function.
 */

const rewind_result = query({
  prompt: "", // Empty prompt - we just want to rewind
  options: {
    enableFileCheckpointing: true,
    resume: session_id, // Resume the existing session
    allowedTools: ["Read"],
    permissionMode: "acceptEdits",
  },
});

// Need to start iterating before we can call rewindFiles
for await (const message of rewind_result) {
  if (message.type === "system" && message.subtype === "init") {
    print_success("Session resumed");

    /**
     * REWIND FILES:
     *
     * rewindFiles(uuid) restores all tracked files to their state
     * at the checkpoint with that UUID.
     *
     * Returns: Promise that resolves when rewind is complete
     */
    await rewind_result.rewindFiles(target_checkpoint.uuid);

    print_success("Files rewound successfully!");
    console.log(`   ${c.dim("The file checkpoint_demo.txt should now contain 'Version 1'")}`);
    break; // Exit after rewind
  }
}

// ==================================================
// PART 4: Verify the Rewind
// ==================================================

console.log("");
print_section("Part 4: Verifying Rewind");

const verify_prompt = "Read the file checkpoint_demo.txt and tell me its contents";
console.log(`📤 Prompt: ${verify_prompt}\n`);

const verify_result = query({
  prompt: verify_prompt,
  options: {
    allowedTools: ["Read"],
    permissionMode: "acceptEdits",
  },
});

for await (const message of verify_result) {
  if (message.type === "assistant" && message.message?.content) {
    const content = message.message.content;
    const text = Array.isArray(content)
      ? content.map((b: any) => b.text || "").join("")
      : String(content);
    console.log(`${c.label("💬 Claude:")} ${c.value(text)}`);
  }
}

print_footer("END OF LESSON");

/**
 * USER MESSAGE WITH CHECKPOINT (raw JSON):
 *
 * {
 *   "type": "user",
 *   "uuid": "msg_01JGXYZ...",           ← CHECKPOINT UUID
 *   "message": {
 *     "role": "user",
 *     "content": [
 *       {
 *         "type": "tool_result",
 *         "tool_use_id": "toolu_01ABC...",
 *         "content": "File written successfully"
 *       }
 *     ]
 *   }
 * }
 *
 *
 * CHECKPOINT USE CASES:
 *
 * 1. Undo bad edits
 *    Agent made a mistake? Rewind to before the error.
 *
 * 2. Try multiple approaches
 *    Save checkpoint, try approach A. If it fails, rewind, try B.
 *
 * 3. Review changes
 *    Compare file state at different checkpoints.
 *
 * 4. Interactive approval
 *    Show user what changed, let them approve or rewind.
 *
 * 5. Error recovery
 *    On error, automatically rewind to last known good state.
 *
 *
 * IMPORTANT NOTES:
 *
 * 1. Checkpoints are per-session
 *    Store session_id to access checkpoints later.
 *
 * 2. Only tracked files are rewound
 *    Files modified through the SDK are tracked.
 *
 * 3. rewindFiles() requires resumed session
 *    You must resume the session before rewinding.
 *
 * 4. Checkpoints are lightweight
 *    They don't duplicate file contents, just track changes.
 *
 *
 * KEY TAKEAWAYS:
 * 1. Enable with enableFileCheckpointing: true
 * 2. User message UUIDs are checkpoint identifiers
 * 3. Store UUIDs during execution for later rewind
 * 4. Resume session, then call result.rewindFiles(uuid)
 * 5. Files are restored to their state at that checkpoint
 * 6. Use for undo, error recovery, and experimentation
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - enableFileCheckpointing option
 * - User message UUID as checkpoint identifier
 * - rewindFiles(uuid) method on query result
 * - Checkpoint use cases (undo, recovery, experimentation)
 *
 * NEXT: Lesson 18 explores streaming input with async generators
 */
