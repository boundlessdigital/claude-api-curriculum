/**
 * LESSON 09: Hooks (Intercepting and Controlling Tool Calls)
 * ==========================================================
 *
 * WHAT YOU'LL LEARN:
 * - How to intercept tool calls with hooks
 * - Different hook events (PreToolUse, PostToolUse, etc.)
 * - How to allow, deny, or modify tool calls
 * - Building audit logs and security controls
 *
 * PREREQUISITE: Lesson 03 (allowedTools, tool flow)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: hooks Option                                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.hooks: Partial<Record<HookEvent, HookCallbackMatcher[]>>│
 * │                                                                         │
 * │ Registers callbacks that run at specific points during execution.       │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   hooks: {                                                              │
 * │     PreToolUse: [ { matcher: "Bash", hooks: [callback] } ],             │
 * │     PostToolUse: [ { hooks: [callback] } ]                              │
 * │   }                                                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: HookEvent Types                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Available hook events:                                                  │
 * │                                                                         │
 * │ - PreToolUse        : BEFORE a tool executes (can block/modify)         │
 * │ - PostToolUse       : AFTER successful execution                        │
 * │ - PostToolUseFailure: AFTER a tool fails                                │
 * │ - UserPromptSubmit  : When user sends a prompt                          │
 * │ - SessionStart/End  : Session lifecycle                                 │
 * │ - SubagentStart/Stop: Subagent lifecycle                                │
 * │                                                                         │
 * │ PreToolUse is the most powerful - it can BLOCK or MODIFY tool calls.    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: HookCallbackMatcher                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Each hook event contains an array of matchers:                          │
 * │                                                                         │
 * │ {                                                                       │
 * │   matcher?: string;   // Regex pattern to filter tools (undefined=all)  │
 * │   hooks: HookCallback[]  // Functions to run                            │
 * │ }                                                                       │
 * │                                                                         │
 * │ MATCHER PATTERNS:                                                       │
 * │   - "Bash"        : Exact match                                         │
 * │   - "Bash|Read"   : Multiple tools (regex OR)                           │
 * │   - "mcp__.*"     : All MCP tools                                       │
 * │   - undefined     : All tools                                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: HookCallback Return Values (PreToolUse)                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ PreToolUse hooks can ALLOW, DENY, or MODIFY the tool call:              │
 * │                                                                         │
 * │ TO ALLOW:                                                               │
 * │   return {                                                              │
 * │     hookSpecificOutput: {                                               │
 * │       hookEventName: "PreToolUse",                                      │
 * │       permissionDecision: "allow"                                       │
 * │     }                                                                   │
 * │   };                                                                    │
 * │                                                                         │
 * │ TO DENY:                                                                │
 * │   return {                                                              │
 * │     hookSpecificOutput: {                                               │
 * │       hookEventName: "PreToolUse",                                      │
 * │       permissionDecision: "deny",                                       │
 * │       permissionDecisionReason: "Why denied"                            │
 * │     }                                                                   │
 * │   };                                                                    │
 * │                                                                         │
 * │ TO MODIFY:                                                              │
 * │   return {                                                              │
 * │     hookSpecificOutput: {                                               │
 * │       hookEventName: "PreToolUse",                                      │
 * │       permissionDecision: "allow",                                      │
 * │       updatedInput: { command: "modified command" }                     │
 * │     }                                                                   │
 * │   };                                                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHAT ARE HOOKS?
 * Hooks are callbacks that run at specific points during agent execution.
 * They let you:
 * - LOG: Record every action for audit trails
 * - VALIDATE: Check inputs before tools run
 * - BLOCK: Deny dangerous operations
 * - MODIFY: Change tool inputs on the fly
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, log_response, print_result, print_success, print_error, c } from "./util/colors";

print_header("LESSON 09: Hooks (Intercepting Tool Calls)");

// Collect hook events for analysis
const hook_events: any[] = [];

const prompt = "List files in /tmp, then try to list files in /etc";

// Show the prompt being sent
console.log(`📤 Prompt: ${prompt}\n`);

const result = query({
  prompt,
  options: {
    allowedTools: ["Bash"],
    permissionMode: "acceptEdits",

    hooks: {
      // PreToolUse hooks run BEFORE the tool executes
      PreToolUse: [
        {
          // matcher: regex to filter which tools this hook applies to
          // undefined = all tools
          matcher: "Bash", // Only for Bash tool

          hooks: [
            async (input, tool_use_id, { signal }) => {
              // input contains all the hook data
              print_section("\n🔗 HOOK TRIGGERED");
              log_json("Raw input", input);

              // Extract the command from Bash input
              const command = (input as any).tool_input?.command || "";

              // Log this event
              hook_events.push({
                timestamp: new Date().toISOString(),
                tool: input.tool_name,
                command,
                tool_use_id,
              });

              // SECURITY CHECK: Block access to sensitive directories
              const blocked_paths = ["/etc", "/var", "/root", "/home"];
              const is_blocked = blocked_paths.some(
                (path) => command.includes(path) && !command.includes("/tmp")
              );

              if (is_blocked) {
                print_error("BLOCKED: Access to sensitive directory");

                // Return deny decision
                return {
                  hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "deny",
                    permissionDecisionReason: `Access to sensitive directories (${blocked_paths.join(", ")}) is not allowed`,
                  },
                };
              }

              // MODIFICATION EXAMPLE: Add safety flags to rm commands
              if (command.startsWith("rm ")) {
                const safe_command = command.replace("rm ", "rm -i ");
                console.log(`${c.warning("⚠️  MODIFIED:")} ${c.dim(`"${command}"`)} → ${c.value(`"${safe_command}"`)}`);

                return {
                  hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "allow",
                    updatedInput: {
                      command: safe_command,
                    },
                  },
                };
              }

              // Allow everything else
              print_success("ALLOWED");
              return {
                hookSpecificOutput: {
                  hookEventName: "PreToolUse",
                  permissionDecision: "allow",
                },
              };
            },
          ],
        },
      ],

      // PostToolUse hooks run AFTER successful execution
      PostToolUse: [
        {
          hooks: [
            async (input) => {
              print_section("\n📤 POST-TOOL HOOK");
              print_kv("Tool completed", input.tool_name);
              // You could log the result, send metrics, etc.
              return {};
            },
          ],
        },
      ],
    },
  },
});

for await (const message of result) {
  if (message.type === "assistant" && message.message?.content) {
    log_response("Claude's response:", message.message.content as any);
  }

  if (message.type === "result") {
    const res = message as any;
    print_section("\n📊 EXECUTION SUMMARY");
    print_kv("Status", res.subtype);

    // Show any permission denials
    if (res.permission_denials?.length > 0) {
      console.log(c.label("\nPermission denials:"));
      for (const denial of res.permission_denials) {
        console.log(`  ${c.error("•")} ${c.highlight(denial.tool_name)}: ${c.dim(denial.reason)}`);
      }
    }

    // Show our hook log
    console.log(c.label("\nHook event log:"));
    for (const event of hook_events) {
      console.log(`  ${c.dim(event.timestamp)}: ${c.highlight(event.tool)} - ${c.value(event.command)}`);
    }

    print_result(res);
  }
}

print_footer("END OF LESSON");

/**
 * HOOK INPUT STRUCTURE (PreToolUse):
 *
 * {
 *   "hook_event_name": "PreToolUse",
 *   "tool_name": "Bash",
 *   "tool_input": {
 *     "command": "ls /tmp"
 *   },
 *   "session_id": "abc123",
 *   "cwd": "/path/to/dir",
 *   "transcript_path": "/path/to/transcript.json"
 * }
 *
 *
 * HOOK RETURN VALUES:
 *
 * To ALLOW:
 * {
 *   hookSpecificOutput: {
 *     hookEventName: "PreToolUse",
 *     permissionDecision: "allow"
 *   }
 * }
 *
 * To DENY:
 * {
 *   hookSpecificOutput: {
 *     hookEventName: "PreToolUse",
 *     permissionDecision: "deny",
 *     permissionDecisionReason: "Why it was denied"
 *   }
 * }
 *
 * To MODIFY input:
 * {
 *   hookSpecificOutput: {
 *     hookEventName: "PreToolUse",
 *     permissionDecision: "allow",
 *     updatedInput: { command: "modified command" }
 *   }
 * }
 *
 *
 * MATCHER PATTERNS:
 *
 * matcher: "Bash"           // Exact match
 * matcher: "Bash|Read"      // Multiple tools (regex OR)
 * matcher: "mcp__.*"        // All MCP tools
 * matcher: undefined        // All tools
 *
 *
 * COMMON USE CASES:
 *
 * 1. AUDIT LOGGING:
 *    Log every tool call with timestamp, input, user
 *
 * 2. SECURITY CONTROLS:
 *    Block dangerous commands (rm -rf, curl to external URLs)
 *    Restrict file access to certain directories
 *
 * 3. INPUT SANITIZATION:
 *    Remove sensitive data from inputs
 *    Add safety flags to commands
 *
 * 4. RATE LIMITING:
 *    Track how many times a tool is called
 *    Deny if rate limit exceeded
 *
 * 5. CREDENTIAL INJECTION:
 *    Add API keys or tokens to tool inputs
 *    (Don't put secrets in prompts!)
 *
 *
 * KEY TAKEAWAYS:
 * 1. PreToolUse is the most powerful hook - can block or modify
 * 2. Use matcher to target specific tools
 * 3. Return hookSpecificOutput with permissionDecision
 * 4. Don't throw errors - return failure responses
 * 5. Hooks run synchronously - keep them fast
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - hooks option (Record<HookEvent, HookCallbackMatcher[]>)
 * - HookEvent types (PreToolUse, PostToolUse, PostToolUseFailure, etc.)
 * - HookCallbackMatcher (matcher, hooks)
 * - HookCallback function signature
 * - permissionDecision ("allow", "deny")
 * - updatedInput for modifying tool inputs
 * - Hook input structure
 *
 * NEXT: Lesson 10 explores sessions for conversation persistence
 */
