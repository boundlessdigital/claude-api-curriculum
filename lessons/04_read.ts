/**
 * LESSON 04: Reading and Analyzing Files
 * =======================================
 *
 * WHAT YOU'LL LEARN:
 * - How to let Claude read files with the Read tool
 * - The difference between Read, Glob, and Grep
 * - Principle of least privilege - give only needed tools
 *
 * PREREQUISITE: Lesson 03 (allowedTools, permissionMode)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Read Tool                                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Reads the contents of a specific file.                                  │
 * │                                                                         │
 * │ INPUT SCHEMA:                                                           │
 * │ {                                                                       │
 * │   file_path: string,   // Absolute path to the file                     │
 * │   offset?: number,     // Optional: start line (0-indexed)              │
 * │   limit?: number       // Optional: max lines to read                   │
 * │ }                                                                       │
 * │                                                                         │
 * │ BEST FOR: Reading a known file when you have the exact path.            │
 * │ SAFER THAN: Bash for file reading (can't run arbitrary commands).       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Glob Tool                                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Finds files matching a glob pattern.                                    │
 * │                                                                         │
 * │ INPUT SCHEMA:                                                           │
 * │ {                                                                       │
 * │   pattern: string,     // Glob pattern (e.g., "**\/*.ts")               │
 * │   path?: string        // Optional: root directory to search            │
 * │ }                                                                       │
 * │                                                                         │
 * │ BEST FOR: Finding files when you don't know exact names.                │
 * │ RETURNS: List of matching file paths.                                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Grep Tool                                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Searches for text/regex patterns in files.                              │
 * │                                                                         │
 * │ INPUT SCHEMA:                                                           │
 * │ {                                                                       │
 * │   pattern: string,     // Regex pattern to search for                   │
 * │   path: string,        // Directory or file to search                   │
 * │   include?: string     // Optional: file filter (e.g., "*.ts")          │
 * │ }                                                                       │
 * │                                                                         │
 * │ BEST FOR: Finding where code is defined, searching across files.        │
 * │ RETURNS: Matching lines with file paths and line numbers.               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHEN TO USE WHICH:
 * - "Read package.json" → Read only
 * - "Find all test files" → Glob only
 * - "Find where UserService is defined" → Grep
 * - "Analyze all TypeScript files" → Glob + Read
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, log_response, print_result } from "./util/colors";

print_header("LESSON 04: Reading and Analyzing Files");

// Example 1: Read a specific file
print_section("EXAMPLE 1: Reading a specific file");

const result1 = query({
  prompt: "Read package.json and tell me what dependencies this project has",
  options: {
    // Only give Read - Claude doesn't need to run commands or write files
    allowedTools: ["Read"],
    permissionMode: "acceptEdits",
  },
});

for await (const message of result1) {
  if (message.type === "assistant" && (message as any).subtype === "tool_use") {
    log_json("RAW JSON (tool request)", message);
    const tool = (message as any).tool_use;
    print_section("PARSED:");
    print_kv("Tool requested", tool?.name);
    print_kv("File", tool?.input?.file_path);
    console.log("");
  }

  if (message.type === "user") {
    // USER MESSAGE: SDK executed the tool, sending contents back to Claude
    log_json("RAW JSON (tool result)", message, 500);
  }

  if (message.type === "assistant" && message.message?.content) {
    log_response("CLAUDE'S ANALYSIS:", message.message.content as any);
  }

  if (message.type === "result") {
    print_result(message as any);
  }
}

// Example 2: Find and read multiple files
console.log("\n");
print_section("EXAMPLE 2: Find and read files with Glob");

const result2 = query({
  prompt: "Find all .ts files in this directory and count how many there are",
  options: {
    // Glob to find files, Read if Claude wants to examine contents
    allowedTools: ["Glob", "Read"],
    permissionMode: "acceptEdits",
  },
});

for await (const message of result2) {
  if (message.type === "assistant") {
    const msg = message as any;

    if (msg.subtype === "tool_use") {
      log_json("RAW JSON (tool request)", message, 400);
      const tool = msg.tool_use;
      print_section("PARSED:");
      if (tool?.name === "Glob") {
        print_kv("Searching for pattern", tool.input?.pattern);
      } else if (tool?.name === "Read") {
        print_kv("Reading file", tool.input?.file_path);
      }
      console.log("");
    } else if (message.message?.content) {
      log_response("CLAUDE'S RESPONSE:", message.message.content as any);
    }
  }

  if (message.type === "result") {
    print_result(message as any);
  }
}

print_footer("END OF LESSON");

/**
 * TOOL INPUT SCHEMAS:
 *
 * Read:
 * {
 *   "file_path": "/absolute/path/to/file",
 *   "offset": 0,      // Optional: start line
 *   "limit": 1000     // Optional: max lines
 * }
 *
 * Glob:
 * {
 *   "pattern": "**\/*.ts",   // Glob pattern
 *   "path": "/optional/root"  // Optional: search root
 * }
 *
 * Grep:
 * {
 *   "pattern": "TODO|FIXME",  // Regex pattern
 *   "path": "./src",          // Search path
 *   "include": "*.ts"         // Optional: file filter
 * }
 *
 *
 * WHY PRINCIPLE OF LEAST PRIVILEGE MATTERS:
 *
 * Bad:  allowedTools: ["Bash"]
 *       Claude could run ANY command, including `rm -rf`
 *
 * Good: allowedTools: ["Read"]
 *       Claude can only read files - can't modify or delete anything
 *
 * Better: allowedTools: ["Read", "Glob"]
 *         Claude can find and read files, but still can't modify
 *
 * The tools you provide define what the agent CAN do.
 * More tools = more capabilities = more risk.
 *
 *
 * TOOL COMBINATIONS FOR COMMON TASKS:
 *
 * Code analysis (read-only):
 *   ["Read", "Glob", "Grep"]
 *
 * Code modification:
 *   ["Read", "Glob", "Grep", "Edit", "Write"]
 *
 * Running tests:
 *   ["Bash", "Read"]
 *
 * Full development:
 *   ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]
 *
 *
 * KEY TAKEAWAYS:
 * 1. Start with minimal tools, add more only if needed
 * 2. Read is safer than Bash for reading files
 * 3. Glob finds files, Grep searches content, Read gets content
 * 4. Combine tools for more complex tasks
 * 5. Tool inputs are visible in the raw JSON - useful for debugging
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - Read tool (file_path, offset, limit)
 * - Glob tool (pattern, path)
 * - Grep tool (pattern, path, include)
 * - Principle of least privilege for tool selection
 * - Tool input schemas
 *
 * NEXT: Lesson 05 explores systemPrompt for customizing agent behavior
 */
