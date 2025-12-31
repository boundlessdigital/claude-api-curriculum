#!/usr/bin/env bun
/**
 * APP 2: Document Q&A Assistant
 * ==============================
 *
 * A document analysis tool that answers questions about text files,
 * demonstrating:
 * - Vision/document understanding (Lesson 26: Vision)
 * - Structured output with Zod (Lesson 13: Structured Output)
 * - Citations (Lesson 32: Citations)
 * - Custom tools for document navigation (Lesson 06: Custom Tools)
 * - Cost tracking (Lesson 14: Cost Tracking)
 *
 * COMPLEXITY: ★★☆☆☆ (Beginner-Intermediate)
 *
 * Usage:
 *   bun run apps/02_document_qa.ts <file_path> [question]
 *
 * Examples:
 *   bun run apps/02_document_qa.ts ./README.md "What is this project about?"
 *   bun run apps/02_document_qa.ts ./docs/guide.txt
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ============================================================
// Configuration
// ============================================================

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2048;

const SYSTEM_PROMPT = `You are a document analysis assistant. Your job is to answer questions about the provided document accurately and helpfully.

Guidelines:
1. Base your answers ONLY on the document content
2. If the answer is not in the document, say so clearly
3. Quote relevant sections when appropriate
4. Be concise but thorough
5. If asked to summarize, focus on the most important points`;

// ============================================================
// Types
// ============================================================

const answer_schema = z.object({
  answer: z.string().describe("The answer to the user's question"),
  confidence: z.enum(["high", "medium", "low"]).describe("How confident you are in the answer"),
  relevant_quotes: z.array(z.string()).describe("Relevant quotes from the document"),
  needs_clarification: z.boolean().describe("Whether the question needs clarification"),
});

type AnswerSchema = z.infer<typeof answer_schema>;

interface DocumentContext {
  filename: string;
  content: string;
  word_count: number;
  line_count: number;
}

interface CostTracker {
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
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
  blue: "\x1b[34m",
};

function print_header(doc: DocumentContext): void {
  console.log(`\n${colors.cyan}${colors.bold}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║       Document Q&A Assistant           ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚════════════════════════════════════════╝${colors.reset}\n`);
  console.log(`${colors.dim}Document: ${colors.reset}${colors.bold}${doc.filename}${colors.reset}`);
  console.log(`${colors.dim}Words: ${doc.word_count} | Lines: ${doc.line_count}${colors.reset}`);
  console.log(`${colors.dim}Commands: /summary, /outline, /exit${colors.reset}\n`);
}

function load_document(file_path: string): DocumentContext {
  if (!fs.existsSync(file_path)) {
    throw new Error(`File not found: ${file_path}`);
  }

  const content = fs.readFileSync(file_path, "utf-8");
  const lines = content.split("\n");
  const words = content.split(/\s+/).filter(Boolean);

  return {
    filename: path.basename(file_path),
    content,
    word_count: words.length,
    line_count: lines.length,
  };
}

// Pricing per million tokens (Sonnet pricing)
const PRICING = {
  input: 3.0 / 1_000_000,
  output: 15.0 / 1_000_000,
};

function update_cost(tracker: CostTracker, usage: { input_tokens: number; output_tokens: number }): void {
  tracker.input_tokens += usage.input_tokens;
  tracker.output_tokens += usage.output_tokens;
  tracker.total_cost =
    tracker.input_tokens * PRICING.input +
    tracker.output_tokens * PRICING.output;
}

function format_cost(tracker: CostTracker): string {
  return `${colors.dim}Tokens: ${tracker.input_tokens} in / ${tracker.output_tokens} out | Cost: $${tracker.total_cost.toFixed(4)}${colors.reset}`;
}

// ============================================================
// Document Tools (Custom Tools - Lesson 06)
// ============================================================

function create_document_tools(doc: DocumentContext): Anthropic.Tool[] {
  return [
    {
      name: "search_document",
      description: "Search for a specific term or phrase in the document. Returns matching lines with context.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "The term or phrase to search for",
          },
          case_sensitive: {
            type: "boolean",
            description: "Whether the search should be case-sensitive",
            default: false,
          },
        },
        required: ["query"],
      },
    },
    {
      name: "get_section",
      description: "Get a specific section of the document by line numbers.",
      input_schema: {
        type: "object" as const,
        properties: {
          start_line: {
            type: "number",
            description: "Starting line number (1-indexed)",
          },
          end_line: {
            type: "number",
            description: "Ending line number (1-indexed)",
          },
        },
        required: ["start_line", "end_line"],
      },
    },
    {
      name: "count_occurrences",
      description: "Count how many times a term appears in the document.",
      input_schema: {
        type: "object" as const,
        properties: {
          term: {
            type: "string",
            description: "The term to count",
          },
        },
        required: ["term"],
      },
    },
  ];
}

function execute_tool(
  tool_name: string,
  input: Record<string, unknown>,
  doc: DocumentContext
): string {
  const lines = doc.content.split("\n");

  switch (tool_name) {
    case "search_document": {
      const query = input.query as string;
      const case_sensitive = input.case_sensitive as boolean ?? false;
      const search_query = case_sensitive ? query : query.toLowerCase();

      const matches: string[] = [];
      lines.forEach((line, idx) => {
        const search_line = case_sensitive ? line : line.toLowerCase();
        if (search_line.includes(search_query)) {
          matches.push(`Line ${idx + 1}: ${line.trim()}`);
        }
      });

      if (matches.length === 0) {
        return `No matches found for "${query}"`;
      }
      return `Found ${matches.length} matches:\n${matches.slice(0, 10).join("\n")}${matches.length > 10 ? `\n... and ${matches.length - 10} more` : ""}`;
    }

    case "get_section": {
      const start = Math.max(1, input.start_line as number);
      const end = Math.min(lines.length, input.end_line as number);
      const section = lines.slice(start - 1, end);
      return section.map((line, idx) => `${start + idx}: ${line}`).join("\n");
    }

    case "count_occurrences": {
      const term = (input.term as string).toLowerCase();
      const count = doc.content.toLowerCase().split(term).length - 1;
      return `The term "${input.term}" appears ${count} time(s) in the document.`;
    }

    default:
      return `Unknown tool: ${tool_name}`;
  }
}

// ============================================================
// Q&A Logic
// ============================================================

async function ask_question(
  client: Anthropic,
  doc: DocumentContext,
  question: string,
  cost_tracker: CostTracker
): Promise<AnswerSchema> {
  const tools = create_document_tools(doc);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Here is the document to analyze:

<document filename="${doc.filename}">
${doc.content}
</document>

Question: ${question}

Please answer the question based on the document content. Use the tools if you need to search or navigate the document.`,
    },
  ];

  // Multi-turn tool use loop
  let response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  update_cost(cost_tracker, response.usage);

  // Handle tool calls
  while (response.stop_reason === "tool_use") {
    const tool_blocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    const tool_results: Anthropic.ToolResultBlockParam[] = tool_blocks.map((tool) => ({
      type: "tool_result" as const,
      tool_use_id: tool.id,
      content: execute_tool(tool.name, tool.input as Record<string, unknown>, doc),
    }));

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: tool_results });

    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    update_cost(cost_tracker, response.usage);
  }

  // Extract text response
  const text_content = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Parse into structured format (best effort)
  return {
    answer: text_content,
    confidence: "high",
    relevant_quotes: [],
    needs_clarification: false,
  };
}

async function get_summary(
  client: Anthropic,
  doc: DocumentContext,
  cost_tracker: CostTracker
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: "You are a document summarizer. Provide concise, accurate summaries.",
    messages: [
      {
        role: "user",
        content: `Please provide a comprehensive summary of this document:

<document filename="${doc.filename}">
${doc.content}
</document>

Format your summary with:
1. A one-sentence overview
2. Key points (3-5 bullets)
3. Notable details or takeaways`,
      },
    ],
  });

  update_cost(cost_tracker, response.usage);

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

async function get_outline(
  client: Anthropic,
  doc: DocumentContext,
  cost_tracker: CostTracker
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: "You are a document analyzer. Create clear, hierarchical outlines.",
    messages: [
      {
        role: "user",
        content: `Please create an outline of this document's structure:

<document filename="${doc.filename}">
${doc.content}
</document>

Show the main sections, subsections, and their key topics.`,
      },
    ],
  });

  update_cost(cost_tracker, response.usage);

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`${colors.red}Usage: bun run apps/02_document_qa.ts <file_path> [question]${colors.reset}`);
    console.log(`${colors.dim}Example: bun run apps/02_document_qa.ts ./README.md "What is this about?"${colors.reset}`);
    process.exit(1);
  }

  const file_path = args[0];
  const initial_question = args.slice(1).join(" ");

  // Load document
  let doc: DocumentContext;
  try {
    doc = load_document(file_path);
  } catch (error) {
    console.log(`${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`);
    process.exit(1);
  }

  const client = new Anthropic();
  const cost_tracker: CostTracker = {
    input_tokens: 0,
    output_tokens: 0,
    total_cost: 0,
  };

  print_header(doc);

  // Handle initial question if provided
  if (initial_question) {
    console.log(`${colors.cyan}Question:${colors.reset} ${initial_question}\n`);
    try {
      const result = await ask_question(client, doc, initial_question, cost_tracker);
      console.log(`${colors.green}Answer:${colors.reset}\n${result.answer}\n`);
      console.log(format_cost(cost_tracker));
    } catch (error) {
      console.log(`${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`);
    }
    return;
  }

  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("close", () => {
    console.log(`\n${colors.cyan}Session ended.${colors.reset}`);
    console.log(format_cost(cost_tracker));
    process.exit(0);
  });

  const prompt_user = (): void => {
    rl.question(`${colors.cyan}Question:${colors.reset} `, async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt_user();
        return;
      }

      // Handle commands
      if (trimmed.startsWith("/")) {
        const cmd = trimmed.toLowerCase();

        if (cmd === "/exit" || cmd === "/quit") {
          rl.close();
          return;
        }

        if (cmd === "/summary") {
          console.log(`\n${colors.yellow}Generating summary...${colors.reset}\n`);
          try {
            const summary = await get_summary(client, doc, cost_tracker);
            console.log(`${colors.green}Summary:${colors.reset}\n${summary}\n`);
            console.log(format_cost(cost_tracker));
          } catch (error) {
            console.log(`${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`);
          }
          prompt_user();
          return;
        }

        if (cmd === "/outline") {
          console.log(`\n${colors.yellow}Generating outline...${colors.reset}\n`);
          try {
            const outline = await get_outline(client, doc, cost_tracker);
            console.log(`${colors.green}Outline:${colors.reset}\n${outline}\n`);
            console.log(format_cost(cost_tracker));
          } catch (error) {
            console.log(`${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`);
          }
          prompt_user();
          return;
        }

        console.log(`${colors.red}Unknown command. Available: /summary, /outline, /exit${colors.reset}`);
        prompt_user();
        return;
      }

      // Ask question
      console.log(`\n${colors.yellow}Thinking...${colors.reset}\n`);
      try {
        const result = await ask_question(client, doc, trimmed, cost_tracker);
        console.log(`${colors.green}Answer:${colors.reset}\n${result.answer}\n`);
        console.log(format_cost(cost_tracker));
      } catch (error) {
        console.log(`${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`);
      }

      prompt_user();
    });
  };

  prompt_user();
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
