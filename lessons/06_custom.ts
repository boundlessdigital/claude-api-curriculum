/**
 * LESSON 06: Creating Custom Tools
 * =================================
 *
 * WHAT YOU'LL LEARN:
 * - How to create your own tools that Claude can use
 * - The tool() function and its parameters
 * - How to package tools as an MCP server
 * - Tool response format
 *
 * PREREQUISITE: Lesson 03-05 (allowedTools, permissionMode, systemPrompt)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: tool() Function                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: import { tool } from "@anthropic-ai/claude-agent-sdk"         │
 * │           import { z } from "zod"  // Required for parameter schemas    │
 * │                                                                         │
 * │ Creates a custom tool that Claude can call. Takes 4 parameters:         │
 * │                                                                         │
 * │ SIGNATURE:                                                              │
 * │   tool(                                                                 │
 * │     name: string,                    // Tool name Claude sees           │
 * │     description: string,             // Helps Claude know when to use   │
 * │     schema: { [key]: ZodType },      // Zod schema for parameters       │
 * │     handler: (params) => Promise<ToolResult>  // Handler function       │
 * │   ) => Tool                                                             │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   const my_tool = tool(                                                 │
 * │     "tool_name",                                                        │
 * │     "What this tool does",                                              │
 * │     { param: z.string().describe("Parameter description") },            │
 * │     async ({ param }) => {                                              │
 * │       return { content: [{ type: "text", text: "result" }] };           │
 * │     }                                                                   │
 * │   );                                                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: createSdkMcpServer() Function                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk"│
 * │                                                                         │
 * │ Packages tools into an MCP server that can be passed to query().        │
 * │                                                                         │
 * │ SIGNATURE:                                                              │
 * │   createSdkMcpServer({ name: string, tools: Tool[] }) => McpServerConfig│
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   const server = createSdkMcpServer({                                   │
 * │     name: "myserver",             // Required by TypeScript types       │
 * │     tools: [tool1, tool2, tool3]                                        │
 * │   });                                                                   │
 * │                                                                         │
 * │ IMPORTANT: Despite the name property here, tool naming is determined    │
 * │ by the KEY in mcpServers, not by this name. See mcpServers below.       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: mcpServers Option                                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.mcpServers: Record<string, McpServerConfig>           │
 * │                                                                         │
 * │ Registers MCP servers containing custom tools with the agent.           │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   mcpServers: { mytools: server }                                       │
 * │                                                                         │
 * │ NAMING: Tools become: mcp__<serverKey>__<toolName>                      │
 * │   Example: mcp__mytools__add_numbers                                    │
 * │                                                                         │
 * │ IMPORTANT: MCP tools MUST be added to allowedTools to run without       │
 * │ permission prompts (even with permissionMode: "acceptEdits").           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY CUSTOM TOOLS?
 * Built-in tools (Read, Bash, etc.) are general purpose.
 * Custom tools let you:
 * - Connect to your APIs
 * - Access databases
 * - Perform domain-specific calculations
 * - Integrate with external services
 */

import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import {
  print_header,
  print_section,
  print_footer,
  print_kv,
  log_json,
  log_response,
  print_result
} from './util/colors'

print_header('LESSON 06: Creating Custom Tools')

// ============================================================
// EXAMPLE 1: Simple Calculator Tool
// ============================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Tool Result Format                                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Tool handlers must return: { content: ContentBlock[] }                  │
 * │                                                                         │
 * │ ContentBlock types:                                                     │
 * │   - { type: "text", text: "..." }    - Text/JSON string                 │
 * │   - { type: "image", data: "...", mimeType: "..." } - Base64 image      │
 * │                                                                         │
 * │ For errors, return text describing the error (don't throw):             │
 * │   return { content: [{ type: "text", text: "Error: ..." }] }            │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// tool() takes 4 parameters: name, description, schema, handler
// Schema uses Zod types for validation
const add_numbers = tool(
  'add_numbers', // Tool name - Claude sees this
  'Add two numbers together and return the sum', // Description - helps Claude know when to use it
  {
    // Parameter schema using Zod types
    // z.number().describe() provides both type validation and description
    a: z.number().describe('First number'),
    b: z.number().describe('Second number')
  },
  // Handler function is the 4th parameter (not chained)
  async ({ a, b }) => {
    // Handler receives validated parameters
    // Must return { content: [...] } format
    const result = a + b
    return {
      content: [{ type: 'text', text: String(result) }]
    }
  }
)

// ============================================================
// EXAMPLE 2: Tool with Complex Logic
// ============================================================

interface WeatherData {
  temperature: number
  condition: string
  humidity: number
}

// Simulated weather API (in real code, you'd call an actual API)
async function fetch_weather(city: string): Promise<WeatherData> {
  // Fake data for demo
  const data: Record<string, WeatherData> = {
    'new york': { temperature: 72, condition: 'sunny', humidity: 45 },
    london: { temperature: 58, condition: 'cloudy', humidity: 78 },
    tokyo: { temperature: 68, condition: 'rainy', humidity: 82 }
  }
  return (
    data[city.toLowerCase()] || {
      temperature: 70,
      condition: 'unknown',
      humidity: 50
    }
  )
}

const get_weather = tool(
  'get_weather',
  'Get current weather for a city. Returns temperature (F), condition, and humidity.',
  {
    city: z.string().describe("City name (e.g., 'New York', 'London')")
  },
  async ({ city }) => {
    try {
      const weather = await fetch_weather(city)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(weather, null, 2)
          }
        ]
      }
    } catch (error) {
      // Return errors as text - Claude will see them and can respond appropriately
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching weather for ${city}: ${error}`
          }
        ]
      }
    }
  }
)

// ============================================================
// EXAMPLE 3: Tool that Returns Structured Data
// ============================================================

const analyze_text = tool(
  'analyze_text',
  'Analyze text and return word count, character count, and estimated reading time',
  {
    text: z.string().describe('Text to analyze')
  },
  async ({ text }) => {
    const words = text.split(/\s+/).filter((w) => w.length > 0)
    const word_count = words.length
    const char_count = text.length
    const reading_time_minutes = Math.ceil(word_count / 200) // ~200 wpm average

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              word_count,
              char_count,
              reading_time_minutes
            },
            null,
            2
          )
        }
      ]
    }
  }
)

// ============================================================
// PACKAGE TOOLS INTO AN MCP SERVER
// ============================================================

// createSdkMcpServer bundles your tools into a server that the SDK can use
// NOTE: The 'name' is required by TypeScript, but tool naming actually comes
// from the KEY in mcpServers below, not from this name property!
const my_tools_server = createSdkMcpServer({
  name: "mytools", // Required, but NOT used for tool naming (see mcpServers key)
  tools: [add_numbers, get_weather, analyze_text]
})

// ============================================================
// USE THE CUSTOM TOOLS
// ============================================================

print_section('Using Custom Tools')

const prompt = `I need help with a few things:
1. What is 42 + 17?
2. What's the weather in Tokyo?
3. Analyze this text: "The quick brown fox jumps over the lazy dog."`

// Show the prompt being sent
console.log(`📤 Prompt: ${prompt}\n`)

const result = query({
  prompt,
  options: {
    // Register the MCP server - the key becomes a prefix for tool names
    // Tools will be named: mcp__mytools__add_numbers, etc.
    mcpServers: {
      mytools: my_tools_server
    },
    // MCP tools must be in allowedTools to be used without prompts
    // Tool names follow the pattern: mcp__<serverKey>__<toolName>
    allowedTools: [
      "mcp__mytools__add_numbers",
      "mcp__mytools__get_weather",
      "mcp__mytools__analyze_text"
    ],
    // permissionMode allows tools to run without interactive approval
    permissionMode: "acceptEdits"
  }
})

for await (const message of result) {
  if (message.type === 'system' && (message as any).subtype === 'init') {
    log_json('RAW JSON (init - shows MCP tools)', message)
    const init = message as any
    print_section('PARSED:')
    // mcp_servers is an array of { name, status } objects
    const mcp_names = (init.mcp_servers || []).map((s: any) => s.name).join(', ')
    print_kv('MCP Servers', mcp_names || 'none')
    print_kv('Tools', (init.tools?.slice(0, 5).join(', ') || '') + '...')
    console.log('')
  }

  if (message.type === 'assistant' && message.message?.content) {
    const content = message.message.content as any[]

    // Check what type of content blocks we have
    const tool_use_blocks = Array.isArray(content)
      ? content.filter((b: any) => b.type === 'tool_use')
      : []
    const text_blocks = Array.isArray(content)
      ? content.filter((b: any) => b.type === 'text' && b.text)
      : []

    // Show tool requests (tool_use blocks in content)
    if (tool_use_blocks.length > 0) {
      log_json('RAW JSON (tool request)', message, 500)
      print_section('PARSED:')
      for (const tool_call of tool_use_blocks) {
        print_kv('Tool', tool_call.name)
        print_kv('Input', JSON.stringify(tool_call.input))
      }
      console.log('')
    }

    // Show text responses
    if (text_blocks.length > 0) {
      log_json('RAW JSON (response)', message, 600)
      log_response(
        "PARSED (Claude's response):",
        text_blocks
      )
    }
  }

  if (message.type === 'user') {
    // USER MESSAGE (TOOL RESULT): Shows what your custom tool returned
    log_json('RAW JSON (tool result)', message, 400)
  }

  if (message.type === 'result') {
    print_section('FINAL RESULT:')
    log_json('RAW JSON', message, 500)
    print_result(message as any)
  }
}

print_footer('END OF LESSON')

/**
 * TOOL RESPONSE FORMAT:
 *
 * Tools must return: { content: ContentBlock[] }
 *
 * ContentBlock types:
 * - { type: "text", text: "..." }           - Text response
 * - { type: "image", data: "...", mimeType: "..." }  - Base64 image
 *
 * Most tools return text. Return JSON strings for structured data.
 *
 *
 * TOOL NAMING:
 *
 * When you register an MCP server as:
 *   mcpServers: { mytools: server }
 *
 * The tools become:
 *   mcp__mytools__add_numbers
 *   mcp__mytools__get_weather
 *   mcp__mytools__analyze_text
 *
 * Claude sees these names and can call them.
 *
 *
 * RAW JSON FOR MCP TOOL CALL:
 *
 * {
 *   "type": "assistant",
 *   "message": {
 *     "role": "assistant",
 *     "content": [
 *       {
 *         "type": "tool_use",
 *         "id": "toolu_abc123",
 *         "name": "mcp__mytools__add_numbers",
 *         "input": { "a": 42, "b": 17 }
 *       }
 *     ]
 *   }
 * }
 *
 * NOTE: Tool calls appear as content blocks with type "tool_use",
 * NOT as a separate "subtype" or "tool_use" property on the message.
 *
 *
 * ERROR HANDLING:
 *
 * Don't throw errors in tool handlers!
 * Instead, return error information as text:
 *
 *   return {
 *     content: [{ type: "text", text: "Error: Invalid input" }]
 *   }
 *
 * Claude will see the error and can respond appropriately.
 *
 *
 * PARAMETER SCHEMAS (using Zod):
 *
 * Basic types:
 *   z.string().describe("...")   - String parameter
 *   z.number().describe("...")   - Number parameter
 *   z.boolean().describe("...")  - Boolean parameter
 *
 * Complex types:
 *   z.array(z.string())          - Array of strings
 *   z.object({ key: z.string() }) - Object with schema
 *   z.enum(["a", "b", "c"])      - Enum/union type
 *   z.string().optional()        - Optional parameter
 *
 *
 * KEY TAKEAWAYS:
 * 1. tool() creates tools: tool(name, desc, zodSchema, handler)
 * 2. createSdkMcpServer() packages tools for use (requires name property)
 * 3. Register via mcpServers option in query()
 * 4. Tool names become mcp__<server>__<toolname>
 * 5. MCP tools MUST be added to allowedTools to run without prompts!
 * 6. Return { content: [{ type: "text", text: "..." }] }
 * 7. Handle errors gracefully - return error text, don't throw
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - tool() function (4-param function for creating tools with Zod schemas)
 * - createSdkMcpServer() function (packaging tools, requires name)
 * - mcpServers option (registering MCP servers)
 * - Tool result format ({ content: ContentBlock[] })
 * - Tool naming convention (mcp__<server>__<toolname>)
 * - Zod parameter schemas (z.string(), z.number(), etc.)
 *
 * NEXT: Lesson 07 explores streaming and observation patterns
 */
