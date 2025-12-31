/**
 * LESSON 02: Content Blocks & Message Structure
 * ==============================================
 *
 * WHAT YOU'LL LEARN:
 * - Content blocks: the typed array structure inside messages
 * - Different content block types (text, tool_use, tool_result, image)
 * - How a single message can contain multiple content blocks
 * - The full message structure for each message type
 *
 * PREREQUISITE: Lesson 01 (query(), SDKMessage types, async iteration)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Content Blocks                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Messages don't just contain plain text - they contain CONTENT BLOCKS.   │
 * │                                                                         │
 * │ A content block is a typed object with a `type` field that tells you    │
 * │ what kind of content it is. The SDK defines these block types:          │
 * │                                                                         │
 * │ FROM ASSISTANT MESSAGES (Claude's output):                              │
 * │   - TextBlock: { type: "text", text: "Hello!" }                         │
 * │   - ToolUseBlock: { type: "tool_use", id, name, input }                 │
 * │                                                                         │
 * │ FROM USER MESSAGES (tool results):                                      │
 * │   - ToolResultBlockParam: { type: "tool_result", tool_use_id, content } │
 * │   - TextBlockParam: { type: "text", text: "..." }                       │
 * │   - ImageBlockParam: { type: "image", source: {...} }                   │
 * │                                                                         │
 * │ IMPORTANT: A single message can contain MULTIPLE content blocks!        │
 * │                                                                         │
 * │   content: [                                                            │
 * │     { type: "text", text: "Let me read that file..." },                 │
 * │     { type: "tool_use", id: "toolu_123", name: "Read", input: {...} },  │
 * │     { type: "text", text: "And also check this..." },                   │
 * │     { type: "tool_use", id: "toolu_124", name: "Read", input: {...} }   │
 * │   ]                                                                     │
 * │                                                                         │
 * │ This is why you iterate over content, not just read a single value.     │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { query } from '@anthropic-ai/claude-agent-sdk'
import { c, print_header, print_divider, print_footer } from './util/colors'

print_header('LESSON 02: Content Blocks & Message Structure')

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Content Block Types                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │ | Block Type     | Found In          | Purpose                        | │
 * │ |----------------|-------------------|--------------------------------| │
 * │ | "text"         | assistant, user   | Plain text content             | │
 * │ | "tool_use"     | assistant         | Claude requesting a tool call  | │
 * │ | "tool_result"  | user              | Result returned from tool      | │
 * │ | "image"        | user              | Image for Claude to analyze    | │
 * │                                                                         │
 * │ When processing messages, always check the block type:                  │
 * │                                                                         │
 * │   for (const block of content) {                                        │
 * │     if (block.type === "text") { ... }                                  │
 * │     if (block.type === "tool_use") { ... }                              │
 * │   }                                                                     │
 * │                                                                         │
 * │ TypeScript types from SDK:                                              │
 * │   ContentBlock = TextBlock | ToolUseBlock                               │
 * │   ContentBlockParam = TextBlockParam | ImageBlockParam | ToolUseBlock...│
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// This lesson demonstrates tool use, so we need Read tool
const result = query({
  prompt: 'Read package.json and tell me the project name',
  options: {
    /**
     * We explicitly allow only the Read tool.
     * This ensures the tools list shows only relevant tools.
     * Without this, ALL built-in tools would be available.
     */
    allowedTools: ['Read'],
    permissionMode: 'acceptEdits',
  },
})

for await (const message of result) {
  print_divider()
  console.log(`${c.label('MESSAGE TYPE:')} ${c.highlight(message.type)}`)
  if ((message as any).subtype) {
    console.log(`${c.label('SUBTYPE:')} ${c.info((message as any).subtype)}`)
  }
  print_divider()
  console.log('')

  switch (message.type) {
    case 'system':
      /**
       * SYSTEM MESSAGE:
       * First message - provides session context.
       * Structure: { type, subtype, session_id, model, tools, cwd, mcp_servers }
       */
      if ((message as any).subtype === 'init') {
        console.log(c.section('📋 SESSION INFO:'))
        console.log(
          `  ${c.label('→ Session ID:')} ${c.value(message.session_id)}`
        )
        console.log(
          `  ${c.label('→ Model:')} ${c.value((message as any).model)}`
        )
        console.log(
          `  ${c.label('→ Tools available:')} ${c.value(
            String((message as any).tools?.length || 0)
          )}`
        )
      }
      break

    case 'assistant':
      /**
       * ┌─────────────────────────────────────────────────────────────────┐
       * │ KEY CONCEPT: SDKAssistantMessage Content                        │
       * ├─────────────────────────────────────────────────────────────────┤
       * │ The `message.content` field can be:                             │
       * │                                                                 │
       * │ 1. A string (simple text - less common)                         │
       * │    content: "Hello!"                                            │
       * │                                                                 │
       * │ 2. An array of content blocks (more common, especially with     │
       * │    tool use):                                                   │
       * │    content: [                                                   │
       * │      { type: "text", text: "Let me help..." },                  │
       * │      { type: "tool_use", id: "...", name: "Read", input: {} }   │
       * │    ]                                                            │
       * │                                                                 │
       * │ STRUCTURE (from SDK docs):                                      │
       * │ {                                                               │
       * │   type: "assistant",                                            │
       * │   uuid: UUID,                   // Unique message ID            │
       * │   session_id: string,           // Session reference            │
       * │   message: {                                                    │
       * │     role: "assistant",                                          │
       * │     content: string | ContentBlock[]                            │
       * │   },                                                            │
       * │   parent_tool_use_id: string | null  // For subagent context    │
       * │ }                                                               │
       * │                                                                 │
       * │ Always handle BOTH string and array content cases!              │
       * └─────────────────────────────────────────────────────────────────┘
       */
      console.log(c.section('💬 ASSISTANT RESPONSE:'))
      console.log('')

      const content = message.message?.content

      // Case 1: Simple string content
      if (typeof content === 'string') {
        console.log(`  ${c.label('Content type:')} ${c.info('string')}`)
        console.log(`  ${c.label('Text:')} ${c.value(content)}`)
      }

      // Case 2: Array of content blocks
      if (Array.isArray(content)) {
        console.log(
          `  ${c.label('Content type:')} ${c.info(
            `array of ${content.length} block(s)`
          )}`
        )
        console.log('')

        for (let i = 0; i < content.length; i++) {
          const block = content[i]
          console.log(`  ${c.highlight(`BLOCK ${i + 1}:`)}`)
          console.log(`    ${c.label('Type:')} ${c.info(`"${block.type}"`)}`)

          switch (block.type) {
            case 'text':
              /**
               * ┌───────────────────────────────────────────────────────┐
               * │ KEY CONCEPT: TextBlock                                │
               * ├───────────────────────────────────────────────────────┤
               * │ {                                                     │
               * │   type: "text",                                       │
               * │   text: "The actual text content"                     │
               * │ }                                                     │
               * │                                                       │
               * │ This is Claude's natural language output.             │
               * │ Multiple text blocks may appear in one message.       │
               * └───────────────────────────────────────────────────────┘
               */
              console.log(
                `    ${c.label('Text:')} ${c.value(`"${block.text}"`)}`
              )
              break

            case 'tool_use':
              /**
               * ┌───────────────────────────────────────────────────────┐
               * │ KEY CONCEPT: ToolUseBlock                             │
               * ├───────────────────────────────────────────────────────┤
               * │ {                                                     │
               * │   type: "tool_use",                                   │
               * │   id: "toolu_abc123",   // Unique ID for linking      │
               * │   name: "Read",         // Which tool to call         │
               * │   input: { ... }        // Parameters for the tool    │
               * │ }                                                     │
               * │                                                       │
               * │ CRITICAL: The `id` field links this tool_use block   │
               * │ to its corresponding tool_result block.               │
               * │                                                       │
               * │ tool_use.id === tool_result.tool_use_id               │
               * │                                                       │
               * │ With the Agent SDK, you observe tool calls - you      │
               * │ don't implement the loop yourself (unlike Client SDK).│
               * └───────────────────────────────────────────────────────┘
               */
              console.log(`    ${c.label('Tool:')} ${c.highlight(block.name)}`)
              console.log(`    ${c.label('ID:')} ${c.dim(block.id)}`)
              console.log(
                `    ${c.label('Input:')} ${c.value(
                  JSON.stringify(block.input)
                )}`
              )
              break

            default:
              console.log(
                `    ${c.label('Raw:')} ${c.dim(JSON.stringify(block))}`
              )
          }
          console.log('')
        }
      }
      break

    case 'user':
      /**
       * ┌─────────────────────────────────────────────────────────────────┐
       * │ KEY CONCEPT: SDKUserMessage & ToolResultBlockParam              │
       * ├─────────────────────────────────────────────────────────────────┤
       * │ When Claude uses a tool, the result comes back as a user        │
       * │ message containing tool_result content blocks:                  │
       * │                                                                 │
       * │ SDKUserMessage STRUCTURE:                                       │
       * │ {                                                               │
       * │   type: "user",                                                 │
       * │   uuid: UUID,           // Checkpoint ID for resuming           │
       * │   session_id: string,   // Session reference                    │
       * │   message: {                                                    │
       * │     role: "user",                                               │
       * │     content: ContentBlockParam[]                                │
       * │   }                                                             │
       * │ }                                                               │
       * │                                                                 │
       * │ ToolResultBlockParam STRUCTURE:                                 │
       * │ {                                                               │
       * │   type: "tool_result",                                          │
       * │   tool_use_id: "toolu_abc123",  // Links to tool_use.id         │
       * │   content: string | ContentBlockParam[],                        │
       * │   is_error?: boolean            // True if tool failed          │
       * │ }                                                               │
       * │                                                                 │
       * │ The uuid field is useful for session checkpointing (Lesson 10). │
       * └─────────────────────────────────────────────────────────────────┘
       */
      console.log(c.section('🔧 TOOL RESULT:'))
      console.log(
        `  ${c.label('→ UUID (checkpoint):')} ${c.dim(message.uuid || 'N/A')}`
      )

      const userContent = message.message?.content
      if (Array.isArray(userContent)) {
        for (const block of userContent) {
          if (block.type === 'tool_result') {
            console.log(
              `  ${c.label('→ Tool Use ID:')} ${c.dim(block.tool_use_id)}`
            )
            console.log(
              `  ${c.label('→ Result preview:')} ${c.value(
                String(block.content).slice(0, 100) + '...'
              )}`
            )
          }
        }
      }
      break

    case 'result':
      /**
       * RESULT MESSAGE:
       * Final message with stats. Not a content block structure.
       */
      const res = message as any
      console.log(c.section('✅ FINAL RESULT:'))
      console.log(`  ${c.label('→ Status:')} ${c.success(res.subtype)}`)
      console.log(
        `  ${c.label('→ Cost:')} ${c.value(
          '$' + res.total_cost_usd?.toFixed(4)
        )}`
      )
      console.log(`  ${c.label('→ Turns:')} ${c.value(String(res.num_turns))}`)
      if (res.usage) {
        console.log(
          `  ${c.label('→ Tokens:')} ${c.info(
            `${res.usage.input_tokens} in`
          )} / ${c.highlight(`${res.usage.output_tokens} out`)}`
        )
      }
      break
  }

  console.log('')
}

print_footer()

/**
 * ============================================================================
 * CONTENT BLOCK REFERENCE
 * ============================================================================
 *
 * TEXT BLOCK (in assistant or user messages):
 * {
 *   "type": "text",
 *   "text": "The actual text content"
 * }
 *
 * TOOL_USE BLOCK (in assistant messages):
 * {
 *   "type": "tool_use",
 *   "id": "toolu_01ABC123",           // Unique identifier
 *   "name": "Read",                   // Tool being called
 *   "input": {                        // Tool parameters
 *     "file_path": "/path/to/file"
 *   }
 * }
 *
 * TOOL_RESULT BLOCK (in user messages):
 * {
 *   "type": "tool_result",
 *   "tool_use_id": "toolu_01ABC123",  // Links to the tool_use
 *   "content": "File contents..."      // Result from tool execution
 * }
 *
 * IMAGE BLOCK (in user messages - for vision):
 * {
 *   "type": "image",
 *   "source": {
 *     "type": "base64",
 *     "media_type": "image/png",
 *     "data": "base64-encoded-data..."
 *   }
 * }
 *
 * ============================================================================
 * TRY THIS
 * ============================================================================
 *
 * 1. Change the prompt to trigger tool use:
 *    prompt: "What files are in the current directory?"
 *
 *    This will produce messages with tool_use and tool_result blocks!
 *
 * 2. Try a multi-step prompt:
 *    prompt: "Read package.json and tell me the project name"
 *
 *    Watch for multiple content blocks in a single message.
 *
 * 3. Add JSON.stringify(content, null, 2) to see the raw block structure
 *
 * ============================================================================
 * KEY TAKEAWAYS
 * ============================================================================
 *
 * 1. Content blocks are typed objects with a `type` field
 * 2. A message can contain MULTIPLE content blocks (text + tool_use + text...)
 * 3. Always iterate over content arrays - don't assume single values
 * 4. tool_use.id links to tool_result.tool_use_id (request → response)
 * 5. Handle both string and array content for robustness
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - Content blocks (overview)
 * - ContentBlock type (TextBlock | ToolUseBlock)
 * - ContentBlockParam type
 * - TextBlock structure
 * - ToolUseBlock structure (type, id, name, input)
 * - SDKUserMessage structure
 * - ToolResultBlockParam structure (type, tool_use_id, content, is_error)
 * - tool_use_id linking concept
 *
 * NEXT: Lesson 03 explores built-in tools and the tool use lifecycle
 */
