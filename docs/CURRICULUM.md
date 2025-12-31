# Claude API Curriculum - Detailed Guide

This document provides an in-depth overview of each lesson, including learning objectives, key concepts, and practical applications.

## Learning Path

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLAUDE API CURRICULUM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FOUNDATION (1-4)          TOOLS & PROMPTS (5-7)     AGENTS (8-11)          │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐          │
│  │ 01 Hello    │    →     │ 05 System   │    →     │ 08 Subagents│          │
│  │ 02 Messages │          │ 06 Custom   │          │ 09 Hooks    │          │
│  │ 03 Tools    │          │ 07 Observe  │          │ 10 Sessions │          │
│  │ 04 Read     │          └─────────────┘          │ 11 MsgTypes │          │
│  └─────────────┘                                   └─────────────┘          │
│        │                                                  │                  │
│        └──────────────────────┬───────────────────────────┘                  │
│                               ▼                                              │
│  PRODUCTION (12-16)        ADVANCED (17-20)        MULTIMODAL (21-29)       │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐          │
│  │ 12 Errors   │    →     │ 17 Checkpts │    →     │ 21 Tokens   │          │
│  │ 13 Struct   │          │ 18 StreamIn │          │ 22 Caching  │          │
│  │ 14 Cost     │          │ 19 Abort    │          │ 23 Thinking │          │
│  │ 15 Perms    │          │ 20 FullAgent│          │ 24 PDFs     │          │
│  │ 16 MCP      │          └─────────────┘          │ 25 Batch    │          │
│  └─────────────┘                                   │ 26 Vision   │          │
│                                                    │ 27 Computer │          │
│                                                    │ 28 Embed    │          │
│                                                    │ 29 Files    │          │
│                                                    └─────────────┘          │
│                                                           │                  │
│                                                           ▼                  │
│                                              CONFIG & ADVANCED (30-33)       │
│                                              ┌─────────────┐                │
│                                              │ 30 Config   │                │
│                                              │ 31 Prefill  │                │
│                                              │ 32 Citations│                │
│                                              │ 33 WebSearch│                │
│                                              └─────────────┘                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Foundation (Lessons 1-4)

### Lesson 01: Hello World
**File:** `01_hello.ts`

**Learning Objectives:**
- Make your first Claude API call
- Understand the basic request/response structure
- Learn about content blocks

**Key Concepts:**
- `anthropic.messages.create()` - The core API method
- `TextBlock` - The primary response type for text content
- Model selection (claude-sonnet-4, etc.)

**Practical Application:**
Simple chatbot, Q&A system, text generation

---

### Lesson 02: Messages & Conversations
**File:** `02_messages.ts`

**Learning Objectives:**
- Build multi-turn conversations
- Understand the messages array structure
- Learn about user/assistant role alternation

**Key Concepts:**
- Messages array with `role` and `content`
- Conversation history management
- Context window limits

**Practical Application:**
Conversational AI, customer support bots, interactive assistants

---

### Lesson 03: Built-in Tools
**File:** `03_builtin_tools.ts`

**Learning Objectives:**
- Discover Claude's built-in capabilities
- Understand tool execution flow
- Learn about tool_use and tool_result blocks

**Key Concepts:**
- Built-in tools: Read, Write, Edit, Bash, Glob, Grep
- `tool_use` content blocks in responses
- `tool_result` for providing execution results

**Practical Application:**
Code assistants, file manipulation, system automation

---

### Lesson 04: Read Tool Deep Dive
**File:** `04_read_tool.ts`

**Learning Objectives:**
- Master file reading capabilities
- Handle different file types
- Manage large file content

**Key Concepts:**
- Reading files, directories, and images
- Offset and limit for large files
- Binary file handling

**Practical Application:**
Document analysis, code review, file processing pipelines

---

## Part 2: System Prompts & Custom Tools (Lessons 5-7)

### Lesson 05: System Prompts
**File:** `05_system_prompts.ts`

**Learning Objectives:**
- Control Claude's behavior with system prompts
- Define personas and response styles
- Set boundaries and guidelines

**Key Concepts:**
- The `system` parameter
- Persona definition
- Response formatting instructions

**Practical Application:**
Brand-specific assistants, specialized experts, consistent tone

---

### Lesson 06: Custom Tools
**File:** `06_custom_tools.ts`

**Learning Objectives:**
- Define your own tools
- Use Zod schemas for parameter validation
- Handle tool calls and provide results

**Key Concepts:**
- Tool definitions with name, description, inputSchema
- Zod for type-safe schemas
- Tool call loop pattern

**Practical Application:**
API integrations, database queries, external service calls

---

### Lesson 07: Observation & Streaming
**File:** `07_observation.ts`

**Learning Objectives:**
- Stream responses in real-time
- Observe tool calls as they happen
- Handle partial content

**Key Concepts:**
- Streaming API with async iterators
- Event types: `content_block_start`, `content_block_delta`, `message_stop`
- Observation callbacks

**Practical Application:**
Real-time UI updates, progress indicators, live typing effects

---

## Part 3: Agents & Architecture (Lessons 8-11)

### Lesson 08: Subagents
**File:** `08_subagents.ts`

**Learning Objectives:**
- Delegate tasks to specialized agents
- Coordinate multi-agent workflows
- Share context between agents

**Key Concepts:**
- Agent spawning and lifecycle
- Task delegation patterns
- Result aggregation

**Practical Application:**
Complex workflows, specialized task handling, parallel processing

---

### Lesson 09: Hooks
**File:** `09_hooks.ts`

**Learning Objectives:**
- Intercept and modify agent behavior
- Implement custom logging
- Add pre/post processing

**Key Concepts:**
- Hook types: beforeQuery, afterQuery, onToolCall
- Event interception
- Behavior modification

**Practical Application:**
Auditing, rate limiting, content filtering, logging

---

### Lesson 10: Sessions
**File:** `10_sessions.ts`

**Learning Objectives:**
- Maintain conversation state
- Handle session persistence
- Manage long-running interactions

**Key Concepts:**
- Session creation and management
- State persistence patterns
- Session restoration

**Practical Application:**
Long-running assistants, stateful applications, conversation continuity

---

### Lesson 11: Message Types
**File:** `11_message_types.ts`

**Learning Objectives:**
- Understand all content block types
- Handle different message structures
- Parse complex responses

**Key Concepts:**
- TextBlock, ToolUseBlock, ToolResultBlock
- ImageBlock, ThinkingBlock
- Content array handling

**Practical Application:**
Response parsing, type-safe handling, multimodal processing

---

## Part 4: Production Patterns (Lessons 12-16)

### Lesson 12: Error Handling
**File:** `12_error_handling.ts`

**Learning Objectives:**
- Handle API errors gracefully
- Implement retry logic
- Log and monitor failures

**Key Concepts:**
- Error types: APIError, RateLimitError, AuthenticationError
- Exponential backoff
- Error classification

**Practical Application:**
Robust production systems, fault tolerance, reliability

---

### Lesson 13: Structured Output
**File:** `13_structured_output.ts`

**Learning Objectives:**
- Guarantee JSON schema compliance
- Parse responses type-safely
- Handle validation

**Key Concepts:**
- `tool_choice` with JSON schema
- Guaranteed structure
- Zod integration for TypeScript types

**Practical Application:**
API responses, data extraction, form generation

---

### Lesson 14: Cost Tracking
**File:** `14_cost_tracking.ts`

**Learning Objectives:**
- Monitor token usage
- Calculate costs
- Optimize for budget

**Key Concepts:**
- `usage.input_tokens` and `usage.output_tokens`
- Pricing tiers by model
- Cost calculation formulas

**Practical Application:**
Budget management, usage dashboards, cost optimization

---

### Lesson 15: Tool Permissions
**File:** `15_can_use_tool.ts`

**Learning Objectives:**
- Control which tools Claude can use
- Implement permission systems
- Create safe execution environments

**Key Concepts:**
- `canUseTool` callback
- Permission policies
- Tool filtering

**Practical Application:**
Security boundaries, user-specific permissions, sandboxing

---

### Lesson 16: MCP Servers
**File:** `16_mcp_servers.ts`

**Learning Objectives:**
- Connect to Model Context Protocol servers
- Use external tool providers
- Configure MCP integrations

**Key Concepts:**
- MCP server configuration
- Remote tool discovery
- Cross-system integration

**Practical Application:**
Enterprise integrations, third-party tools, extensible systems

---

## Part 5: Advanced Features (Lessons 17-20)

### Lesson 17: Checkpoints
**File:** `17_checkpoints.ts`

**Learning Objectives:**
- Save agent state
- Restore from checkpoints
- Handle interruptions

**Key Concepts:**
- Checkpoint creation
- State serialization
- Recovery patterns

**Practical Application:**
Long-running tasks, resumable operations, crash recovery

---

### Lesson 18: Streaming Input
**File:** `18_streaming_input.ts`

**Learning Objectives:**
- Handle progressive input
- Stream large documents
- Optimize memory usage

**Key Concepts:**
- Chunked input processing
- Progressive updates
- Memory management

**Practical Application:**
Large file processing, real-time input, streaming pipelines

---

### Lesson 19: Abort Signals
**File:** `19_abort_signals.ts`

**Learning Objectives:**
- Cancel in-flight requests
- Implement timeouts
- Handle user interruptions

**Key Concepts:**
- AbortController and AbortSignal
- Timeout patterns
- Cleanup on cancellation

**Practical Application:**
User cancellation, timeout handling, resource cleanup

---

### Lesson 20: Full Production Agent
**File:** `20_full_agent.ts`

**Learning Objectives:**
- Combine all concepts into a production agent
- Implement best practices
- Build a complete solution

**Key Concepts:**
- Agent architecture patterns
- Error handling and recovery
- Monitoring and logging

**Practical Application:**
Production deployment template, reference architecture

---

## Part 6: Multimodal & Files (Lessons 21-29)

### Lesson 21: Token Counting
**File:** `21_token_counting.ts`

**Learning Objectives:**
- Estimate tokens before API calls
- Optimize prompt length
- Stay within limits

**Key Concepts:**
- Token counting API
- Context window management
- Pre-flight validation

---

### Lesson 22: Prompt Caching
**File:** `22_prompt_caching.ts`

**Learning Objectives:**
- Cache repeated content
- Reduce latency by 85%
- Lower costs for repeated context

**Key Concepts:**
- `cache_control` with ephemeral type
- Cache hit/miss metrics
- Optimal caching strategies

---

### Lesson 23: Extended Thinking
**File:** `23_extended_thinking.ts`

**Learning Objectives:**
- Enable chain-of-thought reasoning
- Access thinking blocks
- Improve complex reasoning

**Key Concepts:**
- `thinking` configuration
- ThinkingBlock content type
- Budget tokens for reasoning

---

### Lesson 24: PDF Documents
**File:** `24_pdf_documents.ts`

**Learning Objectives:**
- Process PDF files
- Extract text and structure
- Handle multi-page documents

**Key Concepts:**
- Base64 encoding for PDFs
- Document content blocks
- Page-level processing

---

### Lesson 25: Batch Processing
**File:** `25_batch_processing.ts`

**Learning Objectives:**
- Process multiple requests efficiently
- Get 50% cost reduction
- Handle async batch workflows

**Key Concepts:**
- Batch API endpoints
- Status polling
- Result retrieval

---

### Lesson 26: Vision & Images
**File:** `26_vision_images.ts`

**Learning Objectives:**
- Send images to Claude
- Analyze visual content
- Handle multiple images

**Key Concepts:**
- ImageBlock with URL or base64
- Multi-image conversations
- Image size limits

---

### Lesson 27: Computer Use
**File:** `27_computer_use.ts`

**Learning Objectives:**
- Control desktop environments
- Automate UI interactions
- Handle screenshots

**Key Concepts:**
- Computer use tool
- Action types (click, type, scroll)
- Screenshot processing

---

### Lesson 28: Embeddings
**File:** `28_embeddings.ts`

**Learning Objectives:**
- Generate text embeddings
- Calculate semantic similarity
- Build search systems

**Key Concepts:**
- Voyager embedding model
- Cosine similarity
- Vector search patterns

---

### Lesson 29: Files API
**File:** `29_files_api.ts`

**Learning Objectives:**
- Upload files once, use many times
- Manage file lifecycle
- Reference files efficiently

**Key Concepts:**
- File upload and file_id
- Document/image references
- File management operations

---

## Part 7: Model Configuration & Advanced (Lessons 30-33)

### Lesson 30: Model Configuration
**File:** `30_model_config.ts`

**Learning Objectives:**
- Control randomness with temperature
- Use top_p and top_k sampling
- Define stop sequences

**Key Concepts:**
- Temperature (0.0-1.0)
- Nucleus sampling (top_p)
- Token limiting (top_k)
- Stop sequences

---

### Lesson 31: Message Prefilling
**File:** `31_message_prefilling.ts`

**Learning Objectives:**
- Control output format with prefills
- Skip preambles
- Guide response structure

**Key Concepts:**
- Assistant message prefilling
- Format control patterns
- Trailing whitespace gotcha

---

### Lesson 32: Citations
**File:** `32_citations.ts`

**Learning Objectives:**
- Enable source attribution
- Parse citation responses
- Handle different citation types

**Key Concepts:**
- `citations: { enabled: true }`
- char_location, page_location, content_block_location
- Free cited_text tokens

---

### Lesson 33: Web Search
**File:** `33_web_search.ts`

**Learning Objectives:**
- Access real-time web information
- Configure domain filtering
- Handle search citations

**Key Concepts:**
- web_search_20250305 tool
- server_tool_use blocks
- web_search_tool_result

---

## Quick Reference: Key Patterns

### Basic API Call
```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }]
});
```

### With System Prompt
```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: "You are a helpful assistant.",
  messages: [{ role: "user", content: "Hello!" }]
});
```

### With Custom Tools
```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: "What's the weather?" }],
  tools: [{
    name: "get_weather",
    description: "Get current weather",
    input_schema: { type: "object", properties: { city: { type: "string" } } }
  }]
});
```

### Structured Output
```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Extract: John is 30" }],
  tool_choice: { type: "tool", name: "extract_info" },
  tools: [{
    name: "extract_info",
    description: "Extract structured info",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" }, age: { type: "number" } }
    }
  }]
});
```

---

## Recommended Learning Order

### Beginner Path (1-2 hours)
1. Lesson 01: Hello World
2. Lesson 02: Messages
3. Lesson 05: System Prompts
4. Lesson 13: Structured Output

### Intermediate Path (3-4 hours)
5. Lesson 03: Built-in Tools
6. Lesson 06: Custom Tools
7. Lesson 07: Observation
8. Lesson 12: Error Handling
9. Lesson 14: Cost Tracking

### Advanced Path (4-6 hours)
10. Lesson 08: Subagents
11. Lesson 09: Hooks
12. Lesson 10: Sessions
13. Lesson 22: Prompt Caching
14. Lesson 23: Extended Thinking
15. Lesson 20: Full Agent

### Specialist Paths

**Multimodal Specialist:**
- Lesson 26: Vision
- Lesson 24: PDFs
- Lesson 29: Files API
- Lesson 32: Citations

**Production Engineer:**
- Lesson 12: Error Handling
- Lesson 14: Cost Tracking
- Lesson 15: Permissions
- Lesson 17: Checkpoints
- Lesson 25: Batch Processing

**Agent Developer:**
- Lesson 08: Subagents
- Lesson 09: Hooks
- Lesson 10: Sessions
- Lesson 16: MCP Servers
- Lesson 20: Full Agent
