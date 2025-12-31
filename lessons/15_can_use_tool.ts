/**
 * LESSON 15: Dynamic Permissions with canUseTool
 * ===============================================
 *
 * WHAT YOU'LL LEARN:
 * - How canUseTool gives you runtime control over every tool call
 * - The three behaviors: allow, deny, and modify
 * - How to implement security policies
 * - Accessing permission denials in the result
 *
 * PREREQUISITE: Lesson 03 (allowedTools, permissionMode)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: canUseTool Option                                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.canUseTool: CanUseToolCallback                        │
 * │                                                                         │
 * │ A callback invoked BEFORE every tool execution.                         │
 * │                                                                         │
 * │ SIGNATURE:                                                              │
 * │   async (tool_name, input, { signal }) => PermissionResult              │
 * │                                                                         │
 * │ PARAMETERS:                                                             │
 * │   tool_name: string  - "Bash", "Read", "Write", etc.                    │
 * │   input: any         - Tool's input parameters                          │
 * │   signal: AbortSignal - For cancellation                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: PermissionResult Return Type                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ canUseTool must return one of these:                                    │
 * │                                                                         │
 * │ TO ALLOW (optionally modify input):                                     │
 * │   { behavior: "allow", updatedInput: input }                            │
 * │                                                                         │
 * │ TO DENY (with message to Claude):                                       │
 * │   { behavior: "deny", message: "Reason for denial" }                    │
 * │                                                                         │
 * │ NOTE: Use updatedInput to sanitize or modify tool parameters.           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: permission_denials Field                                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ In the result message, all denied tool calls are recorded:              │
 * │                                                                         │
 * │ result.permission_denials: Array<{                                      │
 * │   tool_name: string,                                                    │
 * │   tool_input: any,                                                      │
 * │   reason: string                                                        │
 * │ }>                                                                      │
 * │                                                                         │
 * │ Use this for auditing what the agent tried but was blocked from doing.  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS MATTERS:
 * allowedTools controls WHICH tools Claude can use.
 * canUseTool controls HOW Claude can use them.
 *
 * Example: allowedTools includes "Bash"
 * But canUseTool blocks commands containing "rm -rf"
 *
 * USE CASES:
 * - Block access to sensitive directories
 * - Prevent dangerous commands
 * - Add safety flags to commands
 * - Log all tool usage for auditing
 * - Rate limit tool calls
 * - Require confirmation for certain operations
 *
 * HOW IT WORKS:
 * canUseTool is called BEFORE every tool execution.
 * You return one of:
 * - { behavior: "allow", updatedInput } - Allow (optionally modify input)
 * - { behavior: "deny", message } - Block with explanation to Claude
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_result, print_success, print_error, print_warning, c } from "./util/colors";

print_header("LESSON 15: Dynamic Permissions with canUseTool");

// ==================================================
// PART 1: Basic Allow/Deny
// ==================================================

print_section("Part 1: Allow/Deny Demo");

// Track all tool calls for logging
const tool_calls: Array<{
  tool: string;
  input: any;
  allowed: boolean;
  reason?: string;
}> = [];

const prompt1 = "List files in /tmp, then list files in /etc/passwd";
console.log(`📤 Prompt: ${prompt1}\n`);

const result1 = query({
  prompt: prompt1,
  options: {
    allowedTools: ["Bash"],
    permissionMode: "acceptEdits", // Would normally auto-approve, but canUseTool overrides

    /**
     * canUseTool CALLBACK SIGNATURE:
     *
     * async (tool_name, input, context) => {
     *   // tool_name: string - "Bash", "Read", etc.
     *   // input: any - The tool's input parameters
     *   // context: { signal: AbortSignal } - For cancellation
     *
     *   return { behavior: "allow" | "deny", ... }
     * }
     */
    canUseTool: async (tool_name, input, { signal }) => {
      const bash_input = input as { command?: string };
      const command = bash_input.command || "";

      print_section("🔍 canUseTool called");
      print_kv("Tool", tool_name);
      print_kv("Input", JSON.stringify(input));

      // DENY: Block access to sensitive paths
      const sensitive_paths = ["/etc", "/var", "/root", "/home"];
      for (const path of sensitive_paths) {
        if (command.includes(path)) {
          const denial = {
            tool: tool_name,
            input,
            allowed: false,
            reason: `Access to ${path} is blocked`,
          };
          tool_calls.push(denial);

          print_error(`DENIED: ${denial.reason}`);

          /**
           * DENY RESPONSE:
           * - behavior: "deny"
           * - message: Explanation shown to Claude (helps it understand why)
           */
          return {
            behavior: "deny" as const,
            message: `Security policy: Access to ${path} is not allowed`,
          };
        }
      }

      // ALLOW: Everything else
      tool_calls.push({
        tool: tool_name,
        input,
        allowed: true,
      });

      print_success("ALLOWED");

      /**
       * ALLOW RESPONSE:
       * - behavior: "allow"
       * - updatedInput: The input to use (can be modified or original)
       */
      return {
        behavior: "allow" as const,
        updatedInput: input,
      };
    },
  },
});

for await (const message of result1) {
  // Show raw JSON for result
  if (message.type === "result") {
    print_section("\n--- result ---");
    log_json("RAW JSON", message, 800);

    const res = message as any;

    /**
     * PERMISSION DENIALS:
     * The result message includes a list of all tool calls that were denied.
     * This is useful for:
     * - Auditing what the agent tried to do
     * - Understanding why a task partially failed
     * - Debugging permission policies
     */
    print_section("📋 TOOL CALL LOG");
    for (const call of tool_calls) {
      const status = call.allowed ? c.success("✅") : c.error("❌");
      const reason = call.reason ? ` ${c.dim(`(${call.reason})`)}` : "";
      console.log(`  ${status} ${c.highlight(call.tool)}: ${c.dim(JSON.stringify(call.input))}${reason}`);
    }

    if (res.permission_denials?.length > 0) {
      print_warning("\nPERMISSION DENIALS (from result):");
      for (const denial of res.permission_denials) {
        print_kv("Tool", denial.tool_name);
        print_kv("Reason", denial.reason);
      }
    }
  }
}

// ==================================================
// PART 2: Modifying Tool Input
// ==================================================

console.log("");
print_section("Part 2: Modifying Tool Input");

/**
 * canUseTool can MODIFY the tool input before execution.
 * Use this to:
 * - Add safety flags to commands
 * - Sanitize paths
 * - Inject required parameters
 * - Rewrite queries
 */

const prompt2 = "Remove the file test.txt from /tmp";
console.log(`📤 Prompt: ${prompt2}\n`);

const result2 = query({
  prompt: prompt2,
  options: {
    allowedTools: ["Bash"],
    permissionMode: "acceptEdits",

    canUseTool: async (tool_name, input) => {
      const bash_input = input as { command?: string };
      let command = bash_input.command || "";

      print_kv("Original command", command);

      // MODIFY: Add safety flags to rm commands
      if (command.includes("rm ")) {
        // Add -i flag for interactive mode
        // Add --preserve-root for safety
        const safe_command = command
          .replace(/\brm\b/, "rm -i --preserve-root")
          .replace(/\brm -rf\b/, "rm -ri --preserve-root");

        console.log(`${c.warning("🔧 Modified:")} ${c.value(safe_command)}`);

        return {
          behavior: "allow" as const,
          updatedInput: {
            ...input,
            command: safe_command,
          },
        };
      }

      // MODIFY: Prevent command chaining (;, &&, ||)
      if (command.includes(";") || command.includes("&&") || command.includes("||")) {
        print_warning("Blocking command chaining");
        return {
          behavior: "deny" as const,
          message: "Command chaining is not allowed for security reasons",
        };
      }

      return {
        behavior: "allow" as const,
        updatedInput: input,
      };
    },
  },
});

for await (const message of result2) {
  if (message.type === "assistant" && message.message?.content) {
    const content = message.message.content;
    const text = Array.isArray(content)
      ? content.map((b: any) => b.text || "").join("")
      : String(content);
    console.log(`\n${c.label("💬 Claude:")} ${c.value(text)}`);
  }
}

// ==================================================
// PART 3: Context-Aware Permissions
// ==================================================

console.log("");
print_section("Part 3: Context-Aware Permissions");

/**
 * canUseTool can use external context for decisions:
 * - User role/permissions
 * - Time of day
 * - Rate limits
 * - Previous operations in this session
 */

// Simulated context
const user_context = {
  role: "developer",
  allowed_paths: ["/tmp", process.cwd()],
  max_file_size_kb: 100,
  operations_this_minute: 0,
  max_operations_per_minute: 10,
};

const prompt3 = "Read the package.json file";
console.log(`📤 Prompt: ${prompt3}\n`);

const result3 = query({
  prompt: prompt3,
  options: {
    allowedTools: ["Read", "Bash"],
    permissionMode: "acceptEdits",

    canUseTool: async (tool_name, input) => {
      // Rate limiting
      user_context.operations_this_minute++;
      if (user_context.operations_this_minute > user_context.max_operations_per_minute) {
        return {
          behavior: "deny" as const,
          message: "Rate limit exceeded. Please wait before making more requests.",
        };
      }

      // Path-based permissions for Read tool
      if (tool_name === "Read") {
        const read_input = input as { file_path?: string };
        const file_path = read_input.file_path || "";

        // Check if path is in allowed directories
        const is_allowed = user_context.allowed_paths.some(
          (allowed) => file_path.startsWith(allowed) || file_path === "package.json"
        );

        if (!is_allowed) {
          return {
            behavior: "deny" as const,
            message: `User role '${user_context.role}' cannot access ${file_path}`,
          };
        }
      }

      // Block Bash for non-admin users
      if (tool_name === "Bash" && user_context.role !== "admin") {
        return {
          behavior: "deny" as const,
          message: `User role '${user_context.role}' cannot execute shell commands`,
        };
      }

      print_success(`Allowed: ${tool_name} for role '${user_context.role}'`);
      return {
        behavior: "allow" as const,
        updatedInput: input,
      };
    },
  },
});

for await (const message of result3) {
  if (message.type === "result") {
    const res = message as any;
    print_section("\n📊 Result");
    print_kv("Status", res.subtype);
    print_kv("Operations used", user_context.operations_this_minute);

    if (res.permission_denials?.length > 0) {
      print_kv("Denials", res.permission_denials.length);
    }
  }
}

print_footer("END OF LESSON");

/**
 * canUseTool CALLBACK STRUCTURE:
 *
 * canUseTool: async (tool_name, input, context) => {
 *   // tool_name: "Bash", "Read", "Write", "Edit", "Glob", "Grep", etc.
 *   // input: Tool-specific parameters
 *   // context.signal: AbortSignal for cancellation
 *
 *   // Return one of:
 *
 *   // ALLOW (with optional modification):
 *   return {
 *     behavior: "allow",
 *     updatedInput: input  // or modified version
 *   };
 *
 *   // DENY (with message to Claude):
 *   return {
 *     behavior: "deny",
 *     message: "Reason for denial"
 *   };
 * }
 *
 *
 * TOOL INPUT SHAPES:
 *
 * Bash: { command: string }
 * Read: { file_path: string, offset?: number, limit?: number }
 * Write: { file_path: string, content: string }
 * Edit: { file_path: string, old_string: string, new_string: string }
 * Glob: { pattern: string, path?: string }
 * Grep: { pattern: string, path?: string, ... }
 *
 *
 * PERMISSION DENIALS IN RESULT:
 *
 * {
 *   "type": "result",
 *   "permission_denials": [
 *     {
 *       "tool_name": "Bash",
 *       "tool_input": { "command": "cat /etc/passwd" },
 *       "reason": "Access to /etc is not allowed"
 *     }
 *   ]
 * }
 *
 *
 * SECURITY BEST PRACTICES:
 *
 * 1. Default deny, explicit allow
 *    Start by denying, then whitelist safe operations
 *
 * 2. Sanitize paths
 *    Resolve paths and check for traversal (../)
 *
 * 3. Log everything
 *    Keep audit trail of what was requested and allowed/denied
 *
 * 4. Don't trust tool input
 *    Claude might be manipulated into dangerous requests
 *
 * 5. Use context
 *    Consider user role, rate limits, time of day
 *
 *
 * KEY TAKEAWAYS:
 * 1. canUseTool runs BEFORE every tool call
 * 2. Return { behavior: "allow", updatedInput } to approve (can modify)
 * 3. Return { behavior: "deny", message } to block
 * 4. Denials appear in result.permission_denials
 * 5. Use this for security policies, audit logging, rate limiting
 * 6. Can access external context (user role, session state, etc.)
 * 7. Works alongside allowedTools - both must approve
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - canUseTool option (CanUseToolCallback type)
 * - PermissionResult return type ({ behavior, updatedInput, message })
 * - permission_denials field in result message
 * - Tool input shapes for validation
 *
 * NEXT: Lesson 16 explores external MCP servers with stdio and SSE transports
 */
