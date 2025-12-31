/**
 * LESSON 16: External MCP Servers
 * ================================
 *
 * WHAT YOU'LL LEARN:
 * - What MCP (Model Context Protocol) is
 * - Three transport types: stdio, SSE, and SDK
 * - How to connect to external MCP servers
 * - MCP tool naming conventions
 * - Checking MCP server status in the init message
 *
 * PREREQUISITE: Lesson 06 (custom tools, createSdkMcpServer)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: mcpServers Option                                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.mcpServers: Record<string, McpServerConfig>           │
 * │                                                                         │
 * │ Connects to external MCP servers. Each key is the server name.          │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   mcpServers: {                                                         │
 * │     "my-server": { type: "stdio", command: "...", args: [...] },        │
 * │     "remote": { type: "sse", url: "...", headers: {...} },              │
 * │     "inline": mySdkServer  // From createSdkMcpServer()                 │
 * │   }                                                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: stdio Transport                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Spawns a local process and communicates via stdin/stdout:               │
 * │                                                                         │
 * │ {                                                                       │
 * │   type: "stdio",                                                        │
 * │   command: string,       // Command to run (e.g., "npx")                │
 * │   args?: string[],       // Arguments (e.g., ["-y", "@pkg/server"])     │
 * │   env?: Record<string, string>,  // Environment variables               │
 * │   cwd?: string           // Working directory                           │
 * │ }                                                                       │
 * │                                                                         │
 * │ Use for: Local CLI tools, NPM packages, Python scripts                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: sse Transport                                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Connects to a remote HTTP server using Server-Sent Events:              │
 * │                                                                         │
 * │ {                                                                       │
 * │   type: "sse",                                                          │
 * │   url: string,           // The SSE endpoint URL                        │
 * │   headers?: Record<string, string>  // HTTP headers (for auth)          │
 * │ }                                                                       │
 * │                                                                         │
 * │ Use for: Cloud-hosted servers, authenticated APIs, shared services      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: MCP Tool Naming Convention                                 │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Tools from MCP servers are named:                                       │
 * │   mcp__<server-name>__<tool-name>                                       │
 * │                                                                         │
 * │ EXAMPLES:                                                               │
 * │   mcp__filesystem__read_file                                            │
 * │   mcp__github__search_repositories                                      │
 * │   mcp__time__get_time                                                   │
 * │                                                                         │
 * │ Use these names in allowedTools to restrict which MCP tools are exposed.│
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: mcp_servers in Init Message                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The system init message includes MCP server status:                     │
 * │                                                                         │
 * │ {                                                                       │
 * │   type: "system", subtype: "init",                                      │
 * │   mcp_servers: [                                                        │
 * │     { name: "filesystem", status: "connected", tools: [...] },          │
 * │     { name: "broken", status: "error", error: "..." }                   │
 * │   ]                                                                     │
 * │ }                                                                       │
 * │                                                                         │
 * │ Status values: "connected", "error", "connecting"                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHAT IS MCP?
 * MCP (Model Context Protocol) is a standard protocol for connecting
 * AI models to external tools and data sources. Think of it like USB
 * for AI - a standard way to plug in capabilities.
 *
 * WHY USE MCP?
 * - Reusable tools: Write once, use with any MCP-compatible AI
 * - Ecosystem: Many pre-built MCP servers available
 * - Separation of concerns: Tools run in separate processes
 * - Security: Tools can be sandboxed
 *
 * TRANSPORT TYPES:
 *
 * | Transport | Description                    | Use Case                    |
 * |-----------|--------------------------------|-----------------------------|
 * | stdio     | Spawns local process           | Local tools, CLI wrappers   |
 * | sse       | HTTP with Server-Sent Events   | Remote servers, APIs        |
 * | sdk       | In-process (lesson 06)         | Custom tools in your code   |
 *
 * MCP TOOL NAMING:
 * Tools from MCP servers are named: mcp__<server-name>__<tool-name>
 * Example: mcp__filesystem__read_file
 */

import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { print_header, print_section, print_footer, print_kv, log_json, print_result, print_success, print_error, c } from "./util/colors";

print_header("LESSON 16: External MCP Servers");

// ==================================================
// PART 1: stdio Transport (Local Process)
// ==================================================

print_section("Part 1: stdio Transport");

/**
 * stdio transport spawns an external process and communicates
 * via stdin/stdout using JSON-RPC.
 *
 * This is the most common transport for:
 * - NPM packages (npx -y @anthropic-ai/mcp-server-*)
 * - Python scripts
 * - Any CLI tool wrapped as MCP server
 */

const prompt1 = "List the files in the current directory using the filesystem tools";
console.log(`📤 Prompt: ${prompt1}\n`);

const result1 = query({
  prompt: prompt1,
  options: {
    mcpServers: {
      /**
       * stdio SERVER CONFIGURATION:
       *
       * {
       *   type: "stdio",
       *   command: string,      // The command to run
       *   args?: string[],      // Command arguments
       *   env?: Record<string, string>,  // Environment variables
       *   cwd?: string          // Working directory
       * }
       */
      filesystem: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@anthropic-ai/mcp-server-filesystem", "."],
        env: {
          NODE_ENV: "production",
        },
      },
    },

    /**
     * MCP TOOL RESTRICTIONS:
     * You can limit which MCP tools Claude can use.
     * This is important for security - don't expose write tools
     * if you only need read access.
     */
    allowedTools: [
      "mcp__filesystem__read_file",
      "mcp__filesystem__list_directory",
      // NOT including write_file, delete_file, etc.
    ],

    permissionMode: "acceptEdits",
  },
});

for await (const message of result1) {
  // Log raw JSON
  print_section(`--- ${message.type} ---`);
  log_json("RAW JSON", message, 600);

  if (message.type === "system" && message.subtype === "init") {
    /**
     * MCP SERVER STATUS:
     * The init message includes status for each MCP server.
     * Check this to ensure servers connected successfully.
     *
     * Possible statuses:
     * - "connected": Server is ready
     * - "error": Server failed to start
     * - "connecting": Still starting up
     */
    const init = message as any;
    print_section("📡 MCP SERVER STATUS");
    if (init.mcp_servers) {
      for (const server of init.mcp_servers) {
        const icon = server.status === "connected" ? c.success("✅") : c.error("❌");
        console.log(`   ${icon} ${c.highlight(server.name)}: ${c.value(server.status)}`);
        if (server.error) {
          print_error(`      Error: ${server.error}`);
        }
      }
    }
  }

  // Show tool calls - check content blocks for tool_use type
  if (message.type === "assistant") {
    const content = (message as any).message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use") {
          print_kv("Tool call", block.name);
          print_kv("Input", JSON.stringify(block.input));
        }
      }
    }
  }

  if (message.type === "result") {
    print_success("Query complete");
  }
}

// ==================================================
// PART 2: SSE Transport (Remote Server)
// ==================================================

console.log("");
print_section("Part 2: SSE Transport (Conceptual)");

/**
 * SSE (Server-Sent Events) transport connects to remote HTTP servers.
 * Use this for:
 * - Cloud-hosted MCP servers
 * - Third-party API integrations
 * - Shared tools across multiple agents
 *
 * NOTE: This example is conceptual - you'd need an actual SSE server.
 */

const sse_example_config = {
  /**
   * SSE SERVER CONFIGURATION:
   *
   * {
   *   type: "sse",
   *   url: string,           // The SSE endpoint URL
   *   headers?: Record<string, string>  // HTTP headers (for auth)
   * }
   */
  "remote-api": {
    type: "sse" as const,
    url: "https://my-mcp-server.example.com/sse",
    headers: {
      Authorization: "Bearer your-api-key-here",
      "X-Custom-Header": "value",
    },
  },
};

print_kv("SSE Configuration Example", "");
log_json("Config", sse_example_config);
console.log(`\n${c.label("SSE servers are useful for:")}`);
console.log(`  ${c.dim("-")} Cloud-hosted tools`);
console.log(`  ${c.dim("-")} Authenticated APIs`);
console.log(`  ${c.dim("-")} Shared services across clients`);

// ==================================================
// PART 3: Multiple MCP Servers
// ==================================================

console.log("");
print_section("Part 3: Multiple MCP Servers");

/**
 * You can connect to MULTIPLE MCP servers simultaneously.
 * Each server's tools are namespaced by server name.
 */

// Create a simple in-process MCP server (from lesson 06)
// Using the correct tool() API with Zod schemas and handler as 4th param
const get_time = tool(
  "get_time",
  "Get the current time in a timezone",
  {
    timezone: z.string().describe("Timezone like 'America/New_York'"),
  },
  async ({ timezone }) => {
    const now = new Date();
    const time = now.toLocaleString("en-US", {
      timeZone: timezone || "UTC",
      dateStyle: "full",
      timeStyle: "long",
    });
    return { content: [{ type: "text", text: time }] };
  }
);

const time_server = createSdkMcpServer({ name: "time", tools: [get_time] });

const prompt3 = "What time is it in New York? Also list files in the current directory.";
console.log(`📤 Prompt: ${prompt3}\n`);

const result3 = query({
  prompt: prompt3,
  options: {
    mcpServers: {
      // In-process SDK server
      time: time_server,

      // External stdio server
      filesystem: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@anthropic-ai/mcp-server-filesystem", "."],
      },
    },

    // Allow tools from both servers
    allowedTools: [
      "mcp__time__get_time",
      "mcp__filesystem__list_directory",
    ],

    permissionMode: "acceptEdits",
  },
});

for await (const message of result3) {
  if (message.type === "system" && message.subtype === "init") {
    const init = message as any;
    print_section("📡 CONNECTED SERVERS");
    for (const server of init.mcp_servers || []) {
      console.log(`   ${c.highlight(server.name)}: ${c.value(server.status)}`);
    }
  }

  // Check content blocks for tool_use
  if (message.type === "assistant") {
    const content = (message as any).message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use") {
          // Parse the server name from the tool name
          const parts = block.name?.split("__") || [];
          const server_name = parts[1] || "unknown";
          const tool_name = parts[2] || block.name;

          print_kv("Server", server_name);
          print_kv("Tool", tool_name);
          print_kv("Input", JSON.stringify(block.input));
        }
      }
    }
  }

  if (message.type === "assistant" && message.message?.content) {
    const content = message.message.content;
    const text = Array.isArray(content)
      ? content.map((b: any) => b.text || "").join("")
      : String(content);
    console.log(`\n${c.label("💬 Claude:")} ${c.value(text)}`);
  }
}

print_footer("END OF LESSON");

/**
 * INIT MESSAGE WITH MCP SERVERS (raw JSON):
 *
 * {
 *   "type": "system",
 *   "subtype": "init",
 *   "session_id": "sess_abc123...",
 *   "model": "claude-sonnet-4-20250514",
 *   "tools": [
 *     "mcp__filesystem__read_file",
 *     "mcp__filesystem__list_directory",
 *     "mcp__time__get_time"
 *   ],
 *   "mcp_servers": [
 *     {
 *       "name": "filesystem",
 *       "status": "connected",
 *       "tools": ["read_file", "list_directory", "write_file"]
 *     },
 *     {
 *       "name": "time",
 *       "status": "connected",
 *       "tools": ["get_time"]
 *     }
 *   ],
 *   ...
 * }
 *
 *
 * COMMON MCP SERVERS:
 *
 * 1. Filesystem
 *    npx -y @anthropic-ai/mcp-server-filesystem <path>
 *    Tools: read_file, write_file, list_directory, etc.
 *
 * 2. GitHub
 *    npx -y @anthropic-ai/mcp-server-github
 *    Tools: search_repositories, get_file_contents, create_issue, etc.
 *
 * 3. Postgres
 *    npx -y @anthropic-ai/mcp-server-postgres <connection-string>
 *    Tools: query, list_tables, describe_table, etc.
 *
 * 4. Slack
 *    npx -y @anthropic-ai/mcp-server-slack
 *    Tools: send_message, list_channels, search_messages, etc.
 *
 *
 * SECURITY CONSIDERATIONS:
 *
 * 1. Limit exposed tools
 *    Use allowedTools to only expose what's needed
 *
 * 2. Use read-only servers when possible
 *    Don't expose write tools if you only need reads
 *
 * 3. Validate server sources
 *    Only run MCP servers from trusted sources
 *
 * 4. Use canUseTool for additional checks
 *    Add runtime validation on MCP tool inputs
 *
 * 5. Sandbox sensitive servers
 *    Run in Docker or separate processes
 *
 *
 * KEY TAKEAWAYS:
 * 1. MCP is a protocol for connecting AI to external tools
 * 2. Three transports: stdio (local), sse (remote), sdk (in-process)
 * 3. Tool names follow: mcp__<server>__<tool>
 * 4. Check init message for mcp_servers status
 * 5. Use allowedTools to restrict MCP tool access
 * 6. Multiple servers can be connected simultaneously
 * 7. Server status: "connected", "error", or "connecting"
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - mcpServers option (Record<string, McpServerConfig>)
 * - stdio transport (type, command, args, env, cwd)
 * - sse transport (type, url, headers)
 * - MCP tool naming: mcp__<server>__<tool>
 * - mcp_servers array in init message
 *
 * NEXT: Lesson 17 explores file checkpointing and rewind functionality
 */
