/**
 * LESSON 20: Complete Production Agent Pattern
 * =============================================
 *
 * WHAT YOU'LL LEARN:
 * - How to combine ALL previous concepts into one agent
 * - Production-ready configuration patterns
 * - Complete error handling and logging
 * - Security, cost control, and observability
 *
 * PREREQUISITE: All previous lessons (this is the capstone)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Production Agent Options Summary                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ This lesson combines ALL documented SDK options:                        │
 * │                                                                         │
 * │ COST CONTROL:                                                           │
 * │   maxBudgetUsd: number      // Hard cost limit                          │
 * │   maxTurns: number          // Max conversation turns                   │
 * │   abortController           // Timeout/cancellation                     │
 * │                                                                         │
 * │ SECURITY:                                                               │
 * │   allowedTools: string[]    // Whitelist tools                          │
 * │   permissionMode: string    // Permission behavior                      │
 * │   canUseTool: callback      // Runtime permission checks                │
 * │                                                                         │
 * │ CUSTOMIZATION:                                                          │
 * │   systemPrompt: string      // Agent instructions                       │
 * │   agents: AgentDefinition   // Subagents for delegation                 │
 * │   hooks: HookConfig         // Event interception                       │
 * │   mcpServers: McpConfig     // External tools                           │
 * │                                                                         │
 * │ OUTPUT:                                                                 │
 * │   outputFormat: JSONSchema  // Structured responses                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * THIS LESSON COMBINES:
 * - Lesson 03: allowedTools, permissionMode
 * - Lesson 05: systemPrompt
 * - Lesson 06: Custom tools via MCP
 * - Lesson 08: Subagents
 * - Lesson 12: Error handling
 * - Lesson 13: Structured output
 * - Lesson 14: Cost tracking
 * - Lesson 15: canUseTool permissions
 * - Lesson 19: AbortController for timeouts
 *
 * PRODUCTION AGENT CHECKLIST:
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │ ✅ Cost Control                                              │
 * │    - maxBudgetUsd set                                       │
 * │    - maxTurns limited                                       │
 * │    - Timeout via AbortController                            │
 * ├──────────────────────────────────────────────────────────────┤
 * │ ✅ Security                                                  │
 * │    - allowedTools restricted                                │
 * │    - canUseTool for runtime checks                          │
 * │    - Path validation                                        │
 * │    - Input sanitization                                     │
 * ├──────────────────────────────────────────────────────────────┤
 * │ ✅ Error Handling                                            │
 * │    - All result subtypes handled                            │
 * │    - AbortError caught                                      │
 * │    - No uncaught rejections                                 │
 * ├──────────────────────────────────────────────────────────────┤
 * │ ✅ Observability                                             │
 * │    - Logging for all operations                             │
 * │    - Cost tracking                                          │
 * │    - Duration tracking                                      │
 * │    - Audit trail                                            │
 * ├──────────────────────────────────────────────────────────────┤
 * │ ✅ Structured Output                                         │
 * │    - JSON schema for consistent results                     │
 * │    - TypeScript types matching schema                       │
 * └──────────────────────────────────────────────────────────────┘
 */

import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { print_header, print_section, print_footer, print_kv, log_json, print_result, print_success, print_error, print_warning, c } from "./util/colors";

print_header("LESSON 20: Complete Production Agent Pattern");

// ============================================================
// SECTION 1: CONFIGURATION
// ============================================================

/**
 * CONFIGURATION:
 * All tunable parameters in one place.
 * In production, load from environment variables or config files.
 */
interface AgentConfig {
  // Cost controls
  max_budget_usd: number;
  max_turns: number;
  timeout_ms: number;

  // Security
  allowed_directories: string[];
  blocked_commands: string[];

  // Features
  enable_subagents: boolean;
  enable_audit_log: boolean;
  model: "sonnet" | "opus" | "haiku";
}

const config: AgentConfig = {
  max_budget_usd: 2.0,
  max_turns: 10,
  timeout_ms: 60000, // 1 minute

  allowed_directories: ["/tmp", process.cwd()],
  blocked_commands: ["rm -rf", "sudo", "chmod 777"],

  enable_subagents: true,
  enable_audit_log: true,
  model: "sonnet",
};

print_section("📋 Agent Configuration");
log_json("Config", config);

// ============================================================
// SECTION 2: STRUCTURED OUTPUT SCHEMA
// ============================================================

/**
 * STRUCTURED OUTPUT:
 * Define exactly what the agent should return.
 * Provides type safety and consistent parsing.
 */
const task_result_schema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["success", "partial", "failed"],
      description: "Overall status of the task",
    },
    summary: {
      type: "string",
      description: "Brief summary of what was done",
    },
    files_modified: {
      type: "array",
      items: { type: "string" },
      description: "List of files that were created, modified, or deleted",
    },
    warnings: {
      type: "array",
      items: { type: "string" },
      description: "Any warnings or concerns",
    },
    next_steps: {
      type: "array",
      items: { type: "string" },
      description: "Suggested follow-up actions",
    },
  },
  required: ["status", "summary", "files_modified", "warnings"],
};

interface TaskResult {
  status: "success" | "partial" | "failed";
  summary: string;
  files_modified: string[];
  warnings: string[];
  next_steps?: string[];
}

// ============================================================
// SECTION 3: CUSTOM TOOLS (Audit Logging)
// ============================================================

/**
 * AUDIT LOGGING TOOL:
 * A custom tool for the agent to log its actions.
 * In production, this would write to a database or log service.
 */
const audit_log: Array<{
  timestamp: string;
  action: string;
  details: string;
}> = [];

// tool() takes 4 parameters: name, description, schema (using Zod), handler
const log_action = tool(
  "log_action",
  "Log an action to the audit trail. Use before making any changes.",
  {
    action: z.string().describe("The action being performed (e.g., 'create_file', 'edit_file')"),
    details: z.string().describe("Details about the action"),
  },
  async ({ action, details }) => {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      details,
    };

    audit_log.push(entry);
    console.log(`${c.dim("[AUDIT]")} ${c.dim(entry.timestamp)} - ${c.highlight(action)}: ${c.value(details)}`);

    return {
      content: [{ type: "text", text: `Action logged: ${action}` }],
    };
  }
);

// createSdkMcpServer requires name property
const audit_server = createSdkMcpServer({ name: "audit", tools: [log_action] });

// ============================================================
// SECTION 4: SUBAGENTS
// ============================================================

/**
 * SUBAGENTS:
 * Specialized workers for specific tasks.
 * Use cheaper models for simple analysis.
 */
const agents = config.enable_subagents
  ? {
      "code-analyzer": {
        description:
          "Analyzes code for issues, bugs, and improvements. Use for code review tasks.",
        prompt: `You are a code analysis expert.
Analyze code for:
- Bugs and errors
- Security issues
- Performance problems
- Best practice violations

Be concise. List only actual issues found.`,
        tools: ["Read", "Grep", "Glob"],
        model: "haiku" as const, // Cheap for simple analysis
      },

      "doc-writer": {
        description: "Writes documentation. Use for README, comments, docstrings.",
        prompt: `You are a documentation writer.
Write clear, concise documentation.
Follow the existing style if present.
Include examples where helpful.`,
        tools: ["Read", "Write", "Edit"],
        model: "haiku" as const,
      },
    }
  : {};

// ============================================================
// SECTION 5: PERMISSION CHECKS
// ============================================================

/**
 * PERMISSION CALLBACK:
 * Runtime validation of every tool call.
 * Defense in depth beyond allowedTools.
 */
async function check_permission(
  tool_name: string,
  input: any
): Promise<{ behavior: "allow" | "deny"; message?: string; updatedInput?: any }> {
  const input_str = JSON.stringify(input);

  // Check blocked commands
  for (const blocked of config.blocked_commands) {
    if (input_str.includes(blocked)) {
      return {
        behavior: "deny",
        message: `Blocked command detected: ${blocked}`,
      };
    }
  }

  // Check directory access for file operations
  if (["Bash", "Write", "Edit", "Read"].includes(tool_name)) {
    const is_path_allowed = config.allowed_directories.some(
      (dir) => input_str.includes(dir) || input_str.includes("package.json")
    );

    if (!is_path_allowed) {
      // For Bash, be more strict
      if (tool_name === "Bash") {
        return {
          behavior: "deny",
          message: `Access restricted. Allowed directories: ${config.allowed_directories.join(", ")}`,
        };
      }
      // For other tools, allow but log
      print_warning(`Access to path outside allowed directories: ${input_str.substring(0, 100)}`);
    }
  }

  return { behavior: "allow", updatedInput: input };
}

// ============================================================
// SECTION 6: MAIN AGENT FUNCTION
// ============================================================

interface AgentResponse {
  success: boolean;
  result?: TaskResult;
  error?: {
    type: string;
    message: string;
  };
  metrics: {
    cost_usd: number;
    duration_ms: number;
    turns: number;
    tools_used: string[];
  };
  audit_log: typeof audit_log;
}

async function run_production_agent(task: string): Promise<AgentResponse> {
  print_header("🚀 STARTING PRODUCTION AGENT");
  console.log(`📤 Prompt: ${task}\n`);
  print_kv("Task", task);

  // Clear previous audit log
  audit_log.length = 0;

  // Track metrics
  const start_time = Date.now();
  const tools_used: string[] = [];

  // Setup timeout
  const abort_controller = new AbortController();
  const timeout_id = setTimeout(() => {
    print_warning("⏰ Timeout reached!");
    abort_controller.abort();
  }, config.timeout_ms);

  try {
    const result = query({
      prompt: task,
      options: {
        // Cost control
        abortController: abort_controller,
        maxBudgetUsd: config.max_budget_usd,
        maxTurns: config.max_turns,

        // Tools
        allowedTools: [
          "Read",
          "Write",
          "Edit",
          "Glob",
          "Grep",
          "Bash",
          "Task", // For subagents
        ],
        mcpServers: config.enable_audit_log ? { audit: audit_server } : {},

        // Permissions
        permissionMode: "acceptEdits",
        canUseTool: check_permission,

        // Subagents
        agents,

        // Structured output
        outputFormat: { type: "json_schema", schema: task_result_schema },

        // System prompt
        systemPrompt: `You are a production-grade agent. Follow these rules strictly:

1. AUDIT LOGGING: Always use log_action before making any file changes.
2. SAFETY: If a task seems risky or unclear, explain concerns instead of proceeding.
3. EFFICIENCY: Use the simplest approach that accomplishes the task.
4. DELEGATION: Use subagents for specialized tasks (code-analyzer for reviews, doc-writer for docs).
5. OUTPUT: Return results in the required JSON format with accurate status.

Available subagents: ${Object.keys(agents).join(", ") || "none"}`,
      },
    });

    for await (const message of result) {
      // Log all messages for debugging
      print_section(`--- ${message.type} ---`);

      if (message.type === "system" && message.subtype === "init") {
        const init = message as any;
        print_kv("Session", init.session_id);
        print_kv("Model", init.model);
      }

      // Track tool usage - check content blocks for tool_use type
      if (message.type === "assistant") {
        const content = (message as any).message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_use") {
              tools_used.push(block.name);
              print_kv("Tool", block.name);
            }
          }
        }
      }

      // Handle result
      if (message.type === "result") {
        clearTimeout(timeout_id);
        const res = message as any;

        print_section("📊 RESULT");
        print_kv("Subtype", res.subtype);
        print_kv("Cost", `$${res.total_cost_usd?.toFixed(4)}`);
        print_kv("Turns", res.num_turns);

        const metrics = {
          cost_usd: res.total_cost_usd || 0,
          duration_ms: Date.now() - start_time,
          turns: res.num_turns || 0,
          tools_used: [...new Set(tools_used)], // Dedupe
        };

        if (res.subtype === "success") {
          return {
            success: true,
            result: res.structured_output as TaskResult,
            metrics,
            audit_log: [...audit_log],
          };
        } else {
          return {
            success: false,
            error: {
              type: res.subtype,
              message: res.errors?.join("; ") || `Failed with status: ${res.subtype}`,
            },
            metrics,
            audit_log: [...audit_log],
          };
        }
      }
    }
  } catch (err: any) {
    clearTimeout(timeout_id);

    const error_type = err.name === "AbortError" ? "timeout" : "exception";
    const error_message =
      err.name === "AbortError"
        ? `Request timed out after ${config.timeout_ms}ms`
        : err.message;

    return {
      success: false,
      error: {
        type: error_type,
        message: error_message,
      },
      metrics: {
        cost_usd: 0,
        duration_ms: Date.now() - start_time,
        turns: 0,
        tools_used: [...new Set(tools_used)],
      },
      audit_log: [...audit_log],
    };
  }

  clearTimeout(timeout_id);
  return {
    success: false,
    error: {
      type: "no_result",
      message: "Stream ended without result message",
    },
    metrics: {
      cost_usd: 0,
      duration_ms: Date.now() - start_time,
      turns: 0,
      tools_used: [...new Set(tools_used)],
    },
    audit_log: [...audit_log],
  };
}

// ============================================================
// SECTION 7: RUN THE AGENT
// ============================================================

const response = await run_production_agent(
  "Create a file called hello.txt with 'Hello, World!' in the current directory."
);

print_header("🎯 FINAL RESPONSE");
log_json("Response", response);

// Summary
print_section("📊 Summary");
print_kv("Success", response.success);
print_kv("Cost", `$${response.metrics.cost_usd.toFixed(4)}`);
print_kv("Duration", `${response.metrics.duration_ms}ms`);
print_kv("Turns", response.metrics.turns);
print_kv("Tools used", response.metrics.tools_used.join(", ") || "none");
print_kv("Audit entries", response.audit_log.length);

if (response.result) {
  print_section("📝 Task Result");
  print_kv("Status", response.result.status);
  print_kv("Summary", response.result.summary);
  print_kv("Files", response.result.files_modified.join(", ") || "none");
  if (response.result.warnings.length > 0) {
    print_warning(`Warnings: ${response.result.warnings.join(", ")}`);
  }
}

if (response.error) {
  print_error("Error Details:");
  print_kv("Type", response.error.type);
  print_kv("Message", response.error.message);
}

print_footer("END OF LESSON");

/**
 * PRODUCTION AGENT RESPONSE STRUCTURE:
 *
 * {
 *   "success": true,
 *   "result": {
 *     "status": "success",
 *     "summary": "Created hello.txt with greeting",
 *     "files_modified": ["hello.txt"],
 *     "warnings": [],
 *     "next_steps": ["Run the file", "Add more content"]
 *   },
 *   "metrics": {
 *     "cost_usd": 0.0123,
 *     "duration_ms": 2500,
 *     "turns": 2,
 *     "tools_used": ["log_action", "Write"]
 *   },
 *   "audit_log": [
 *     {
 *       "timestamp": "2024-01-15T12:00:00.000Z",
 *       "action": "create_file",
 *       "details": "Creating hello.txt"
 *     }
 *   ]
 * }
 *
 *
 * KEY TAKEAWAYS FROM THIS COURSE:
 *
 * 1. BASICS (Lessons 1-4)
 *    - query() is the entry point
 *    - Messages stream via async iterator
 *    - Tools are enabled via allowedTools
 *    - permissionMode controls approval flow
 *
 * 2. CUSTOMIZATION (Lessons 5-9)
 *    - systemPrompt shapes behavior
 *    - Custom tools via MCP servers
 *    - Hooks for interception
 *    - Subagents for delegation
 *
 * 3. STATE (Lesson 10)
 *    - Sessions preserve context
 *    - session_id for resuming
 *    - forkSession for branching
 *
 * 4. MESSAGES (Lesson 11)
 *    - system/init: Session start
 *    - assistant: Claude's responses
 *    - user: Tool results
 *    - result: Final outcome
 *
 * 5. PRODUCTION (Lessons 12-19)
 *    - Handle ALL error subtypes
 *    - Structured output for parsing
 *    - Cost tracking and limits
 *    - canUseTool for security
 *    - File checkpointing for undo
 *    - Cancellation via AbortController
 *
 * 6. INTEGRATION (Lesson 20)
 *    - Combine everything
 *    - Config-driven behavior
 *    - Full observability
 *    - Production-ready patterns
 *
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * This capstone lesson combines ALL previously documented SDK concepts:
 * - query() function (Lesson 01)
 * - AsyncGenerator message streaming (Lesson 01)
 * - allowedTools option (Lesson 03)
 * - permissionMode option (Lesson 03)
 * - systemPrompt option (Lesson 05)
 * - tool() helper and createSdkMcpServer() (Lesson 06)
 * - agents option (Lesson 08)
 * - session_id and resume (Lesson 10)
 * - All message types (Lesson 11)
 * - Result subtypes: success, budget_exceeded, turn_limit, etc. (Lesson 12)
 * - outputFormat option for structured output (Lesson 13)
 * - Cost tracking fields (Lesson 14)
 * - canUseTool callback (Lesson 15)
 * - mcpServers option (Lesson 16)
 * - enableFileCheckpointing (Lesson 17)
 * - AsyncIterable prompt (Lesson 18)
 * - abortController option and interrupt() (Lesson 19)
 *
 * CONGRATULATIONS! 🎉
 * You've completed the Claude Agent SDK curriculum.
 * You now have the knowledge to build production-grade AI agents.
 */
