# Claude API Curriculum

A comprehensive, hands-on curriculum for learning the Claude API. This repository contains 33 progressive lessons covering everything from basic API calls to advanced features like extended thinking, citations, and web search.

## Overview

Each lesson is a standalone TypeScript file that you can run directly. Lessons are designed to be:

- **Self-contained**: Each file includes explanations, code examples, and live API calls
- **Progressive**: Concepts build on previous lessons
- **Practical**: Real API interactions with colorized terminal output
- **Well-documented**: Extensive comments explaining the "why" behind each concept

## Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0+)
- An [Anthropic API key](https://console.anthropic.com/)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/boundlessdigital/claude-api-curriculum.git
cd claude-api-curriculum/lessons

# Install dependencies
bun install

# Set your API key
export ANTHROPIC_API_KEY="your-api-key-here"

# Run your first lesson
bun run 01_hello.ts
```

## Curriculum Structure

### Foundation (Lessons 1-4)
Core concepts for working with the Claude API.

| Lesson | Topic | Description |
|--------|-------|-------------|
| [01_hello.ts](lessons/01_hello.ts) | Hello World | Your first API call |
| [02_messages.ts](lessons/02_messages.ts) | Messages & Conversations | Multi-turn conversations |
| [03_builtin_tools.ts](lessons/03_builtin_tools.ts) | Built-in Tools | File operations, bash, etc. |
| [04_read_tool.ts](lessons/04_read_tool.ts) | Read Tool Deep Dive | Reading files and directories |

### System Prompts & Custom Tools (Lessons 5-7)
Customizing Claude's behavior and capabilities.

| Lesson | Topic | Description |
|--------|-------|-------------|
| [05_system_prompts.ts](lessons/05_system_prompts.ts) | System Prompts | Controlling Claude's persona |
| [06_custom_tools.ts](lessons/06_custom_tools.ts) | Custom Tools | Defining your own tools |
| [07_observation.ts](lessons/07_observation.ts) | Observation & Streaming | Real-time response handling |

### Agents & Architecture (Lessons 8-11)
Building complex agent systems.

| Lesson | Topic | Description |
|--------|-------|-------------|
| [08_subagents.ts](lessons/08_subagents.ts) | Subagents | Delegating tasks to child agents |
| [09_hooks.ts](lessons/09_hooks.ts) | Hooks | Intercepting and modifying behavior |
| [10_sessions.ts](lessons/10_sessions.ts) | Sessions | Managing conversation state |
| [11_message_types.ts](lessons/11_message_types.ts) | Message Types | Understanding message structures |

### Production Patterns (Lessons 12-16)
Building robust, production-ready applications.

| Lesson | Topic | Description |
|--------|-------|-------------|
| [12_error_handling.ts](lessons/12_error_handling.ts) | Error Handling | Graceful error recovery |
| [13_structured_output.ts](lessons/13_structured_output.ts) | Structured Output | JSON schema validation |
| [14_cost_tracking.ts](lessons/14_cost_tracking.ts) | Cost Tracking | Monitoring token usage |
| [15_can_use_tool.ts](lessons/15_can_use_tool.ts) | Tool Permissions | Fine-grained tool control |
| [16_mcp_servers.ts](lessons/16_mcp_servers.ts) | MCP Servers | Model Context Protocol integration |

### Advanced Features (Lessons 17-20)
Power user capabilities.

| Lesson | Topic | Description |
|--------|-------|-------------|
| [17_checkpoints.ts](lessons/17_checkpoints.ts) | Checkpoints | Saving and restoring state |
| [18_streaming_input.ts](lessons/18_streaming_input.ts) | Streaming Input | Progressive input handling |
| [19_abort_signals.ts](lessons/19_abort_signals.ts) | Abort Signals | Cancellation patterns |
| [20_full_agent.ts](lessons/20_full_agent.ts) | Full Agent | Complete production agent |

### Multimodal & Files (Lessons 21-29)
Working with images, documents, and external data.

| Lesson | Topic | Description |
|--------|-------|-------------|
| [21_token_counting.ts](lessons/21_token_counting.ts) | Token Counting | Estimating costs before API calls |
| [22_prompt_caching.ts](lessons/22_prompt_caching.ts) | Prompt Caching | Reducing latency and costs |
| [23_extended_thinking.ts](lessons/23_extended_thinking.ts) | Extended Thinking | Chain-of-thought reasoning |
| [24_pdf_documents.ts](lessons/24_pdf_documents.ts) | PDF Documents | Processing PDF files |
| [25_batch_processing.ts](lessons/25_batch_processing.ts) | Batch Processing | Bulk API operations |
| [26_vision_images.ts](lessons/26_vision_images.ts) | Vision & Images | Image understanding |
| [27_computer_use.ts](lessons/27_computer_use.ts) | Computer Use | Desktop automation |
| [28_embeddings.ts](lessons/28_embeddings.ts) | Embeddings | Semantic similarity |
| [29_files_api.ts](lessons/29_files_api.ts) | Files API | Upload once, use many times |

### Model Configuration & Advanced Features (Lessons 30-33)
Fine-tuning model behavior and advanced capabilities.

| Lesson | Topic | Description |
|--------|-------|-------------|
| [30_model_config.ts](lessons/30_model_config.ts) | Model Configuration | Temperature, top_p, top_k, stop sequences |
| [31_message_prefilling.ts](lessons/31_message_prefilling.ts) | Message Prefilling | Controlling output format |
| [32_citations.ts](lessons/32_citations.ts) | Citations | Source attribution from documents |
| [33_web_search.ts](lessons/33_web_search.ts) | Web Search | Real-time web information |

## Lesson Format

Each lesson follows a consistent structure:

```typescript
/**
 * LESSON XX: Topic Name
 * =====================
 *
 * WHAT YOU'LL LEARN:
 * - Key concept 1
 * - Key concept 2
 *
 * PREREQUISITE: Lesson YY (topic)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Concept Name                                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Detailed explanation of the concept...                                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// Part 1: Introduction
// Part 2: Basic Usage
// Part 3: Advanced Patterns
// ...

/**
 * SUMMARY:
 * Key takeaways from this lesson...
 *
 * NEXT: Lesson XX+1 covers...
 */
```

## Running Lessons

```bash
# Run any lesson
bun run XX_lesson_name.ts

# Examples
bun run 01_hello.ts
bun run 13_structured_output.ts
bun run 33_web_search.ts
```

## Key Concepts Covered

### API Fundamentals
- Messages API structure and content blocks
- System prompts and conversation context
- Token counting and cost management

### Tools & Capabilities
- Built-in tools (read, write, bash, etc.)
- Custom tool definitions with Zod schemas
- MCP (Model Context Protocol) servers
- Tool permissions with `canUseTool`

### Agent Patterns
- Subagent delegation
- Hooks for behavior modification
- Sessions and state management
- Checkpoints for persistence

### Advanced Features
- **Extended Thinking**: Chain-of-thought reasoning with thinking blocks
- **Prompt Caching**: Reduce latency by 85% for repeated context
- **Batch Processing**: 50% cost reduction for async workloads
- **Citations**: Source attribution from documents
- **Web Search**: Real-time web information access

### Multimodal
- Vision/image understanding
- PDF document processing
- Files API for efficient file handling
- Embeddings for semantic similarity

### Model Configuration
- Temperature, top_p, top_k sampling parameters
- Stop sequences for output control
- Message prefilling for format control

## Project Structure

```
claude-api-curriculum/
├── README.md                    # This file
├── CLAUDE.md                    # Instructions for AI assistants
├── lessons/
│   ├── package.json             # Dependencies
│   ├── tsconfig.json            # TypeScript config
│   ├── util/
│   │   └── colors.ts            # Terminal formatting utilities
│   ├── 01_hello.ts              # Lesson 1
│   ├── 02_messages.ts           # Lesson 2
│   └── ...                      # Lessons 3-33
└── docs/
    └── CURRICULUM.md            # Detailed curriculum guide
```

## Tips for Learning

1. **Run each lesson**: Don't just read the code—execute it and observe the output
2. **Modify and experiment**: Change parameters and see what happens
3. **Follow the prerequisites**: Lessons build on each other
4. **Read the summaries**: Each lesson ends with key takeaways
5. **Check the KEY CONCEPT boxes**: These highlight the most important ideas

## API Reference

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Claude Models](https://docs.anthropic.com/en/docs/about-claude/models)
- [Messages API](https://docs.anthropic.com/en/api/messages)
- [Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with Claude by [Boundless Digital](https://github.com/boundlessdigital)
