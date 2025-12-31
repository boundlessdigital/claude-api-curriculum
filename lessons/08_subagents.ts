/**
 * LESSON 08: Subagents (Delegating to Specialized Agents)
 * =======================================================
 *
 * WHAT YOU'LL LEARN:
 * - How to define specialized subagents
 * - When and why to use subagents
 * - How to configure different tools/models for each
 * - How subagent communication works
 *
 * PREREQUISITE: Lesson 03, 05 (allowedTools, systemPrompt)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: agents Option                                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.agents: Record<string, AgentDefinition>               │
 * │                                                                         │
 * │ Defines specialized subagents that the main agent can delegate to.      │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   agents: {                                                             │
 * │     "agent-name": {                                                     │
 * │       description: string,  // Claude uses this to decide when to use  │
 * │       prompt: string,       // System prompt for the subagent           │
 * │       tools?: string[],     // Tools available (optional, inherits)     │
 * │       model?: ModelOption   // "haiku" | "sonnet" | "opus" | "inherit"  │
 * │     }                                                                   │
 * │   }                                                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: AgentDefinition Type                                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ {                                                                       │
 * │   description: string;  // CRITICAL - Claude uses this to decide       │
 * │   prompt: string;       // System prompt for this subagent              │
 * │   tools?: string[];     // Optional: tools this agent can use           │
 * │   model?: "haiku" | "sonnet" | "opus" | "inherit";  // Model choice     │
 * │ }                                                                       │
 * │                                                                         │
 * │ NOTES:                                                                  │
 * │ - description is CRITICAL: the main agent reads this to know WHEN      │
 * │   to delegate to this subagent                                          │
 * │ - prompt is the systemPrompt for the subagent                           │
 * │ - tools defaults to parent's tools (be explicit!)                       │
 * │ - model defaults to "inherit" (same as parent)                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Task Tool                                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The built-in "Task" tool is how the main agent spawns subagents.        │
 * │                                                                         │
 * │ REQUIREMENTS:                                                           │
 * │ - Must include "Task" in allowedTools for the main agent                │
 * │ - Must define agents in options.agents                                  │
 * │                                                                         │
 * │ WHEN CLAUDE CALLS Task:                                                 │
 * │ {                                                                       │
 * │   name: "Task",                                                         │
 * │   input: {                                                              │
 * │     subagent_type: "code-reviewer",  // Which agent to spawn            │
 * │     prompt: "Review the file",       // Task for the subagent           │
 * │     description: "Code review"       // Brief description               │
 * │   }                                                                     │
 * │ }                                                                       │
 * │                                                                         │
 * │ Subagent messages have parent_tool_use_id set (linking to Task call).   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY USE SUBAGENTS?
 * 1. SECURITY: Limit what each agent can do
 * 2. FOCUS: Specialized system prompts for each task
 * 3. COST: Use cheaper models for simple subtasks
 * 4. CONTEXT: Each subagent has isolated context (doesn't see everything)
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { c, print_header, print_section, print_kv, log_json, print_result } from "./util/colors";

print_header("LESSON 08: Subagents");

// Define our subagents
const agents = {
  // A read-only code reviewer
  "code-reviewer": {
    description:
      "Expert code reviewer. Use for analyzing code quality, finding bugs, and suggesting improvements. Read-only - cannot modify files.",
    prompt: `You are an expert code reviewer.

RESPONSIBILITIES:
- Analyze code for bugs, security issues, and bad practices
- Suggest improvements
- Rate code quality from 1-10

OUTPUT FORMAT:
- Start with a 1-2 sentence summary
- List issues found (if any)
- End with the quality score

Be concise. Focus on important issues.`,
    tools: ["Read", "Glob", "Grep"], // Read-only tools
    model: "haiku" as const, // Cheaper model for simple reviews
  },

  // A test runner that can execute
  "test-runner": {
    description:
      "Runs tests and reports results. Use when you need to execute test suites or verify code changes.",
    prompt: `You are a test execution specialist.

RESPONSIBILITIES:
- Run test commands (npm test, bun test, pytest, etc.)
- Analyze test output
- Report pass/fail status clearly

OUTPUT FORMAT:
- Command executed
- Pass/fail count
- List of failed tests (if any)
- Brief summary

Do NOT modify any files. Only run and report.`,
    tools: ["Bash", "Read"], // Can execute but with focused purpose
  },

  // A documentation analyzer
  "docs-analyzer": {
    description:
      "Analyzes documentation. Use for checking README files, API docs, or code comments.",
    prompt: `You are a documentation specialist.

RESPONSIBILITIES:
- Assess documentation completeness
- Find missing or outdated docs
- Suggest improvements

Be concise. Focus on actionable feedback.`,
    tools: ["Read", "Glob"],
    model: "haiku" as const,
  },
};

print_section("Subagent Demo");

const prompt = `Analyze this codebase:
1. Have the code-reviewer check the TypeScript files for any issues
2. Have the docs-analyzer check if there's a README

Report what each specialist found.`;

// Show the prompt being sent
console.log(`📤 Prompt: ${prompt}\n`);

const result = query({
  prompt,
  options: {
    // Task tool is REQUIRED to use subagents
    allowedTools: ["Task", "Read", "Glob"],
    permissionMode: "acceptEdits",

    // Register our subagents
    agents,
  },
});

// Track subagent activity
let current_subagent: string | null = null;

for await (const message of result) {
  log_json(`${message.type} message`, message, 500);

  // Analyze subagent usage
  if (message.type === "assistant") {
    const msg = message as any;
    const content = msg.message?.content;

    // Check for Task tool_use in content blocks
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use" && block.name === "Task") {
          // Main agent is delegating to a subagent
          const input = block.input;
          current_subagent = input.subagent_type;
          console.log(c.highlight(`🤖 DELEGATING TO: ${current_subagent}`));
          print_kv("Prompt", input.prompt?.substring(0, 100) + "...", 3);
        }
      }
    }

    // Check if this message is FROM a subagent
    if (msg.parent_tool_use_id) {
      console.log(c.dim(`   (Running inside subagent: ${current_subagent})`));
    }
  }

  if (message.type === "result") {
    const res = message as any;
    print_section("FINAL RESULT");
    print_result(res);

    // Model usage breakdown shows which models were used
    if (res.modelUsage) {
      console.log(c.section("\nModel usage:"));
      for (const [model, usage] of Object.entries(res.modelUsage as any)) {
        print_kv(model, "$" + (usage as any).costUSD?.toFixed(4));
      }
    }
  }
}

/**
 * AGENT DEFINITION STRUCTURE:
 *
 * {
 *   "agent-name": {
 *     description: string,  // CRITICAL: Claude uses this to decide when to delegate
 *     prompt: string,       // System prompt for the subagent
 *     tools: string[],      // Tools available to this agent (optional, inherits if omitted)
 *     model: "haiku" | "sonnet" | "opus" | "inherit"  // Optional model override
 *   }
 * }
 *
 *
 * TOOL INHERITANCE:
 *
 * If you don't specify tools, the subagent inherits from parent.
 * This is usually NOT what you want - be explicit about tools.
 *
 * Subagents CANNOT:
 * - Spawn their own subagents (no nested delegation)
 * - Access tools not in their list
 * - See the parent's full conversation
 *
 *
 * MODEL SELECTION:
 *
 * - "haiku": Cheapest, good for simple tasks
 * - "sonnet": Default, balanced
 * - "opus": Most capable, expensive
 * - "inherit": Use parent's model
 *
 * Use haiku for: code review, doc analysis, simple searches
 * Use sonnet for: complex analysis, writing, planning
 * Use opus for: critical decisions, complex reasoning
 *
 *
 * RAW JSON FOR TASK TOOL CALL:
 *
 * {
 *   "type": "assistant",
 *   "subtype": "tool_use",
 *   "tool_use": {
 *     "name": "Task",
 *     "input": {
 *       "subagent_type": "code-reviewer",
 *       "prompt": "Review the files in src/",
 *       "description": "Code review"
 *     }
 *   }
 * }
 *
 *
 * KEY TAKEAWAYS:
 * 1. Subagents need the "Task" tool enabled on the main agent
 * 2. Write clear descriptions - Claude uses them to decide when to delegate
 * 3. Be explicit about tools - don't rely on inheritance
 * 4. Use cheaper models for simple subtasks to save money
 * 5. parent_tool_use_id indicates a message is from a subagent
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - agents option (Record<string, AgentDefinition>)
 * - AgentDefinition type (description, prompt, tools, model)
 * - Task tool (for spawning subagents)
 * - parent_tool_use_id (indicates subagent context)
 * - Model selection ("haiku", "sonnet", "opus", "inherit")
 * - Tool inheritance behavior
 *
 * NEXT: Lesson 09 explores hooks for intercepting tool calls
 */
