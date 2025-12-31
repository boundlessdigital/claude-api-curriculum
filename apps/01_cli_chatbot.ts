#!/usr/bin/env bun
/**
 * APP 1: CLI Chat Bot
 * ===================
 *
 * A simple interactive command-line chatbot demonstrating:
 * - Multi-turn conversations (Lesson 02: Messages)
 * - System prompts for personality (Lesson 05: System Prompts)
 * - Streaming responses (Lesson 07: Observation)
 * - Session management (Lesson 10: Sessions)
 * - Graceful error handling (Lesson 12: Error Handling)
 *
 * COMPLEXITY: ★☆☆☆☆ (Beginner)
 *
 * Usage:
 *   bun run apps/01_cli_chatbot.ts
 *
 * Commands:
 *   /clear  - Clear conversation history
 *   /system <prompt> - Change system prompt
 *   /exit   - Exit the chatbot
 */

import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

// ============================================================
// Configuration
// ============================================================

const DEFAULT_SYSTEM_PROMPT = `You are a helpful, friendly assistant. Keep responses concise but informative.
When asked about your capabilities, be honest that you're Claude, an AI assistant by Anthropic.
Use markdown formatting when it helps readability.`;

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;

// ============================================================
// Types
// ============================================================

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatState {
  messages: Message[];
  system_prompt: string;
  total_input_tokens: number;
  total_output_tokens: number;
}

// ============================================================
// Utilities
// ============================================================

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
};

function print_header(): void {
  console.log(`\n${colors.cyan}${colors.bold}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║        CLI Chat Bot with Claude        ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚════════════════════════════════════════╝${colors.reset}\n`);
  console.log(`${colors.dim}Commands: /clear, /system <prompt>, /exit${colors.reset}`);
  console.log(`${colors.dim}Type your message and press Enter to chat.${colors.reset}\n`);
}

function print_stats(state: ChatState): void {
  console.log(`\n${colors.dim}────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.dim}Messages: ${state.messages.length} | Tokens: ${state.total_input_tokens} in / ${state.total_output_tokens} out${colors.reset}`);
}

// ============================================================
// Chat Logic
// ============================================================

async function send_message(
  client: Anthropic,
  state: ChatState,
  user_input: string
): Promise<string> {
  // Add user message to history
  state.messages.push({
    role: "user",
    content: user_input,
  });

  try {
    // Stream the response for better UX
    process.stdout.write(`\n${colors.green}Claude:${colors.reset} `);

    let full_response = "";

    // Using streaming for real-time output (Lesson 07)
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: state.system_prompt,
      messages: state.messages,
    });

    // Process stream events
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        process.stdout.write(event.delta.text);
        full_response += event.delta.text;
      }
    }

    // Get final message for token tracking
    const final_message = await stream.finalMessage();
    state.total_input_tokens += final_message.usage.input_tokens;
    state.total_output_tokens += final_message.usage.output_tokens;

    console.log(); // Newline after response

    // Add assistant response to history
    state.messages.push({
      role: "assistant",
      content: full_response,
    });

    return full_response;
  } catch (error) {
    // Error handling (Lesson 12)
    if (error instanceof Anthropic.APIError) {
      const error_message = handle_api_error(error);
      // Remove the failed user message
      state.messages.pop();
      throw new Error(error_message);
    }
    throw error;
  }
}

function handle_api_error(error: Anthropic.APIError): string {
  switch (error.status) {
    case 400:
      return `Invalid request: ${error.message}`;
    case 401:
      return "Authentication failed. Check your ANTHROPIC_API_KEY.";
    case 429:
      return "Rate limited. Please wait a moment and try again.";
    case 500:
    case 502:
    case 503:
      return "Anthropic API is temporarily unavailable. Please try again.";
    default:
      return `API error (${error.status}): ${error.message}`;
  }
}

function handle_command(state: ChatState, input: string): boolean {
  const parts = input.trim().split(/\s+/);
  const command = parts[0].toLowerCase();

  switch (command) {
    case "/exit":
    case "/quit":
    case "/q":
      console.log(`\n${colors.cyan}Goodbye!${colors.reset}`);
      print_stats(state);
      return false;

    case "/clear":
      state.messages = [];
      console.log(`${colors.yellow}Conversation cleared.${colors.reset}`);
      return true;

    case "/system":
      const new_prompt = parts.slice(1).join(" ");
      if (new_prompt) {
        state.system_prompt = new_prompt;
        state.messages = []; // Clear messages when changing system prompt
        console.log(`${colors.yellow}System prompt updated and conversation cleared.${colors.reset}`);
      } else {
        console.log(`${colors.dim}Current system prompt:${colors.reset}`);
        console.log(`${colors.magenta}${state.system_prompt}${colors.reset}`);
      }
      return true;

    case "/help":
      console.log(`\n${colors.cyan}Available commands:${colors.reset}`);
      console.log(`  ${colors.bold}/clear${colors.reset}  - Clear conversation history`);
      console.log(`  ${colors.bold}/system${colors.reset} - View or set system prompt`);
      console.log(`  ${colors.bold}/exit${colors.reset}   - Exit the chatbot`);
      console.log(`  ${colors.bold}/help${colors.reset}   - Show this help`);
      return true;

    default:
      console.log(`${colors.red}Unknown command: ${command}. Type /help for available commands.${colors.reset}`);
      return true;
  }
}

// ============================================================
// Main Loop
// ============================================================

async function main(): Promise<void> {
  // Initialize Anthropic client
  const client = new Anthropic();

  // Initialize chat state (Session management - Lesson 10)
  const state: ChatState = {
    messages: [],
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    total_input_tokens: 0,
    total_output_tokens: 0,
  };

  // Set up readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  print_header();

  // Handle readline close (Ctrl+D or pipe closed)
  rl.on("close", () => {
    console.log(`\n${colors.cyan}Goodbye!${colors.reset}`);
    print_stats(state);
    process.exit(0);
  });

  // Main chat loop
  const prompt_user = (): void => {
    rl.question(`${colors.cyan}You:${colors.reset} `, async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt_user();
        return;
      }

      // Handle commands
      if (trimmed.startsWith("/")) {
        const should_continue = handle_command(state, trimmed);
        if (should_continue) {
          prompt_user();
        } else {
          rl.close();
        }
        return;
      }

      // Send message to Claude
      try {
        await send_message(client, state, trimmed);
      } catch (error) {
        console.log(`\n${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`);
      }

      prompt_user();
    });
  };

  prompt_user();
}

// Run the chatbot
main().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
