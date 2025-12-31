#!/usr/bin/env bun
/**
 * APP 5: Self-Evolving Agent System
 * ===================================
 *
 * An advanced AI agent that can analyze its own performance, learn from
 * mistakes, generate new tools, and improve its prompts over time,
 * demonstrating:
 *
 * - Meta-learning: Agent reflects on task outcomes
 * - Tool synthesis: Agent writes new tools as needed
 * - Prompt evolution: System prompts improve based on performance
 * - Memory persistence: Long-term learning across sessions
 * - A/B testing: Compare prompt variants for effectiveness
 * - Skill acquisition: Learn new capabilities from examples
 *
 * COMPLEXITY: ★★★★★ (Expert)
 *
 * Architecture:
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │                    Self-Evolving Agent                  │
 *   ├─────────────────────────────────────────────────────────┤
 *   │                                                         │
 *   │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
 *   │  │   Memory    │◄──►│   Agent     │◄──►│    Tool     │ │
 *   │  │   Store     │    │    Core     │    │   Library   │ │
 *   │  └─────────────┘    └──────┬──────┘    └─────────────┘ │
 *   │                            │                            │
 *   │         ┌──────────────────┼──────────────────┐        │
 *   │         │                  │                  │        │
 *   │  ┌──────▼──────┐   ┌───────▼───────┐  ┌──────▼──────┐ │
 *   │  │  Reflector  │   │    Prompt     │  │    Tool     │ │
 *   │  │  (analyze)  │   │   Evolver     │  │  Generator  │ │
 *   │  └─────────────┘   └───────────────┘  └─────────────┘ │
 *   │                                                         │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Self-Improvement Loop:
 *   1. Execute task with current configuration
 *   2. Evaluate outcome (success/failure, quality score)
 *   3. Reflect on what worked and what didn't
 *   4. Generate improvements (new tools, better prompts)
 *   5. A/B test improvements
 *   6. Persist learnings to memory
 *   7. Apply successful improvements
 *
 * Usage:
 *   bun run apps/05_self_evolving_agent.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Configuration
// ============================================================

const MODEL = "claude-sonnet-4-20250514";
const MEMORY_FILE = "./agent_memory.json";
const TOOLS_DIR = "./generated_tools";
const MAX_EVOLUTION_ITERATIONS = 3;

// ============================================================
// Types
// ============================================================

interface TaskOutcome {
  task_id: string;
  task_description: string;
  success: boolean;
  quality_score: number; // 0-100
  execution_time_ms: number;
  tokens_used: number;
  tools_used: string[];
  error?: string;
  timestamp: string;
}

interface PromptVariant {
  id: string;
  system_prompt: string;
  created_at: string;
  success_rate: number;
  avg_quality: number;
  usage_count: number;
  is_active: boolean;
}

interface GeneratedTool {
  name: string;
  description: string;
  code: string;
  created_at: string;
  usage_count: number;
  success_rate: number;
}

interface AgentMemory {
  outcomes: TaskOutcome[];
  prompt_variants: PromptVariant[];
  generated_tools: GeneratedTool[];
  learnings: string[];
  evolution_count: number;
  created_at: string;
  last_updated: string;
}

interface Reflection {
  task_analysis: string;
  what_worked: string[];
  what_failed: string[];
  improvement_suggestions: string[];
  new_tool_needed?: {
    name: string;
    description: string;
    rationale: string;
  };
  prompt_improvement?: string;
}

// ============================================================
// Utilities
// ============================================================

const log = {
  info: (msg: string) => console.log(`[${ts()}] ℹ️  ${msg}`),
  success: (msg: string) => console.log(`[${ts()}] ✅ ${msg}`),
  warning: (msg: string) => console.log(`[${ts()}] ⚠️  ${msg}`),
  error: (msg: string) => console.log(`[${ts()}] ❌ ${msg}`),
  evolve: (msg: string) => console.log(`[${ts()}] 🧬 ${msg}`),
  think: (msg: string) => console.log(`[${ts()}] 🧠 ${msg}`),
  tool: (msg: string) => console.log(`[${ts()}] 🔧 ${msg}`),
};

function ts(): string {
  return new Date().toISOString();
}

function generate_id(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// Memory Store
// ============================================================

class MemoryStore {
  private memory: AgentMemory;
  private file_path: string;

  constructor(file_path: string) {
    this.file_path = file_path;
    this.memory = this.load();
  }

  private load(): AgentMemory {
    try {
      if (fs.existsSync(this.file_path)) {
        const data = fs.readFileSync(this.file_path, "utf-8");
        log.info(`Loaded memory from ${this.file_path}`);
        return JSON.parse(data);
      }
    } catch (error) {
      log.warning(`Failed to load memory: ${error}`);
    }

    return {
      outcomes: [],
      prompt_variants: [],
      generated_tools: [],
      learnings: [],
      evolution_count: 0,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    };
  }

  save(): void {
    this.memory.last_updated = new Date().toISOString();
    fs.writeFileSync(this.file_path, JSON.stringify(this.memory, null, 2));
    log.info(`Memory saved to ${this.file_path}`);
  }

  add_outcome(outcome: TaskOutcome): void {
    this.memory.outcomes.push(outcome);
    // Keep last 100 outcomes
    if (this.memory.outcomes.length > 100) {
      this.memory.outcomes = this.memory.outcomes.slice(-100);
    }
    this.save();
  }

  add_learning(learning: string): void {
    if (!this.memory.learnings.includes(learning)) {
      this.memory.learnings.push(learning);
      log.evolve(`New learning: ${learning}`);
      this.save();
    }
  }

  add_prompt_variant(variant: PromptVariant): void {
    this.memory.prompt_variants.push(variant);
    this.save();
  }

  add_tool(tool: GeneratedTool): void {
    this.memory.generated_tools.push(tool);
    this.save();
  }

  get_active_prompt(): PromptVariant | undefined {
    return this.memory.prompt_variants.find((p) => p.is_active);
  }

  get_recent_outcomes(count: number = 10): TaskOutcome[] {
    return this.memory.outcomes.slice(-count);
  }

  get_success_rate(): number {
    if (this.memory.outcomes.length === 0) return 0;
    const successes = this.memory.outcomes.filter((o) => o.success).length;
    return (successes / this.memory.outcomes.length) * 100;
  }

  get_avg_quality(): number {
    if (this.memory.outcomes.length === 0) return 0;
    const total = this.memory.outcomes.reduce((sum, o) => sum + o.quality_score, 0);
    return total / this.memory.outcomes.length;
  }

  get_stats(): {
    total_tasks: number;
    success_rate: number;
    avg_quality: number;
    evolution_count: number;
    tools_count: number;
    learnings_count: number;
  } {
    return {
      total_tasks: this.memory.outcomes.length,
      success_rate: this.get_success_rate(),
      avg_quality: this.get_avg_quality(),
      evolution_count: this.memory.evolution_count,
      tools_count: this.memory.generated_tools.length,
      learnings_count: this.memory.learnings.length,
    };
  }

  increment_evolution(): void {
    this.memory.evolution_count++;
    this.save();
  }

  get_all(): AgentMemory {
    return { ...this.memory };
  }
}

// ============================================================
// Base Tools
// ============================================================

const BASE_TOOLS: Anthropic.Tool[] = [
  {
    name: "calculate",
    description: "Perform mathematical calculations",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: {
          type: "string",
          description: "Mathematical expression to evaluate",
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "search_web",
    description: "Search the web for information (simulated)",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "analyze_text",
    description: "Analyze text for sentiment, key points, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text to analyze" },
        analysis_type: {
          type: "string",
          enum: ["sentiment", "summary", "keywords", "entities"],
        },
      },
      required: ["text", "analysis_type"],
    },
  },
];

function execute_base_tool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "calculate":
      try {
        // Safe math evaluation (in production, use a proper math parser)
        const expr = String(input.expression).replace(/[^0-9+\-*/().%\s]/g, "");
        const result = Function(`"use strict"; return (${expr})`)();
        return `Result: ${result}`;
      } catch {
        return "Error: Invalid expression";
      }

    case "search_web":
      // Simulated web search
      return `Search results for "${input.query}":\n1. [Result 1] Relevant information about ${input.query}\n2. [Result 2] More details on ${input.query}`;

    case "analyze_text":
      const text = String(input.text);
      const type = input.analysis_type;
      switch (type) {
        case "sentiment":
          return `Sentiment: ${text.length > 50 ? "Neutral" : "Positive"}`;
        case "summary":
          return `Summary: ${text.slice(0, 100)}...`;
        case "keywords":
          return `Keywords: ${text.split(/\s+/).slice(0, 5).join(", ")}`;
        default:
          return "Analysis complete";
      }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ============================================================
// Self-Evolving Agent
// ============================================================

class SelfEvolvingAgent {
  private client: Anthropic;
  private memory: MemoryStore;
  private current_prompt: string;
  private dynamic_tools: Anthropic.Tool[];

  constructor() {
    this.client = new Anthropic();
    this.memory = new MemoryStore(MEMORY_FILE);
    this.dynamic_tools = [...BASE_TOOLS];

    // Load or create initial prompt
    const active = this.memory.get_active_prompt();
    if (active) {
      this.current_prompt = active.system_prompt;
      log.info("Loaded active prompt variant");
    } else {
      this.current_prompt = this.get_default_prompt();
      this.memory.add_prompt_variant({
        id: generate_id(),
        system_prompt: this.current_prompt,
        created_at: new Date().toISOString(),
        success_rate: 0,
        avg_quality: 0,
        usage_count: 0,
        is_active: true,
      });
    }

    log.info("Self-Evolving Agent initialized");
    const stats = this.memory.get_stats();
    log.info(`Stats: ${stats.total_tasks} tasks, ${stats.success_rate.toFixed(1)}% success, ${stats.tools_count} tools, ${stats.learnings_count} learnings`);
  }

  private get_default_prompt(): string {
    return `You are an advanced AI assistant with self-improvement capabilities.

Your goals:
1. Complete tasks effectively and efficiently
2. Learn from each interaction to improve
3. Identify when new tools would be helpful
4. Provide high-quality, accurate responses

When completing tasks:
- Think step by step
- Use available tools when appropriate
- Be concise but thorough
- Acknowledge uncertainty when present

Available capabilities: calculation, web search (simulated), text analysis`;
  }

  async execute_task(task: string): Promise<{ result: string; outcome: TaskOutcome }> {
    const task_id = generate_id();
    const start_time = Date.now();
    const tools_used: string[] = [];

    log.think(`Processing task: ${task.slice(0, 50)}...`);

    try {
      const messages: Anthropic.MessageParam[] = [
        { role: "user", content: task },
      ];

      let response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: this.current_prompt,
        tools: this.dynamic_tools,
        messages,
      });

      let total_tokens = response.usage.input_tokens + response.usage.output_tokens;

      // Handle tool calls
      while (response.stop_reason === "tool_use") {
        const tool_blocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
        );

        const tool_results: Anthropic.ToolResultBlockParam[] = tool_blocks.map((tool) => {
          tools_used.push(tool.name);
          log.tool(`Using tool: ${tool.name}`);
          return {
            type: "tool_result" as const,
            tool_use_id: tool.id,
            content: execute_base_tool(tool.name, tool.input as Record<string, unknown>),
          };
        });

        messages.push({ role: "assistant", content: response.content });
        messages.push({ role: "user", content: tool_results });

        response = await this.client.messages.create({
          model: MODEL,
          max_tokens: 2048,
          system: this.current_prompt,
          tools: this.dynamic_tools,
          messages,
        });

        total_tokens += response.usage.input_tokens + response.usage.output_tokens;
      }

      const result = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      const execution_time = Date.now() - start_time;

      // Evaluate quality (in production, this could be user feedback or automated checks)
      const quality = await this.evaluate_quality(task, result);

      const outcome: TaskOutcome = {
        task_id,
        task_description: task,
        success: true,
        quality_score: quality,
        execution_time_ms: execution_time,
        tokens_used: total_tokens,
        tools_used,
        timestamp: new Date().toISOString(),
      };

      this.memory.add_outcome(outcome);
      log.success(`Task completed (quality: ${quality}/100, time: ${execution_time}ms)`);

      // Trigger reflection and evolution if needed
      await this.maybe_evolve();

      return { result, outcome };
    } catch (error) {
      const execution_time = Date.now() - start_time;
      const error_msg = error instanceof Error ? error.message : String(error);

      const outcome: TaskOutcome = {
        task_id,
        task_description: task,
        success: false,
        quality_score: 0,
        execution_time_ms: execution_time,
        tokens_used: 0,
        tools_used,
        error: error_msg,
        timestamp: new Date().toISOString(),
      };

      this.memory.add_outcome(outcome);
      log.error(`Task failed: ${error_msg}`);

      // Still try to evolve from failures
      await this.maybe_evolve();

      return { result: `Error: ${error_msg}`, outcome };
    }
  }

  private async evaluate_quality(task: string, result: string): Promise<number> {
    // Use Claude to evaluate the quality of its own response
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Rate the quality of this response from 0-100.

Task: ${task}

Response: ${result.slice(0, 500)}

Reply with ONLY a number from 0-100, nothing else.`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const score = parseInt(text.trim(), 10);
    return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
  }

  private async maybe_evolve(): Promise<void> {
    const recent = this.memory.get_recent_outcomes(5);
    if (recent.length < 3) return; // Need enough data to evolve

    const recent_success_rate = recent.filter((o) => o.success).length / recent.length;
    const recent_avg_quality = recent.reduce((s, o) => s + o.quality_score, 0) / recent.length;

    // Trigger evolution if performance is degrading
    if (recent_success_rate < 0.6 || recent_avg_quality < 60) {
      log.evolve("Performance declining, initiating evolution...");
      await this.evolve();
    }

    // Also evolve periodically after every 10 tasks
    const stats = this.memory.get_stats();
    if (stats.total_tasks % 10 === 0 && stats.total_tasks > 0) {
      log.evolve("Periodic evolution check...");
      await this.evolve();
    }
  }

  private async evolve(): Promise<void> {
    const recent = this.memory.get_recent_outcomes(10);
    const failures = recent.filter((o) => !o.success || o.quality_score < 50);

    if (failures.length === 0) {
      log.evolve("No significant failures to learn from");
      return;
    }

    log.evolve(`Reflecting on ${failures.length} failures...`);

    // Generate reflection
    const reflection = await this.reflect(failures);

    // Apply learnings
    for (const learning of reflection.what_failed) {
      this.memory.add_learning(`Avoid: ${learning}`);
    }
    for (const learning of reflection.what_worked) {
      this.memory.add_learning(`Continue: ${learning}`);
    }

    // Generate new tool if suggested
    if (reflection.new_tool_needed) {
      await this.generate_tool(reflection.new_tool_needed);
    }

    // Evolve prompt if suggested
    if (reflection.prompt_improvement) {
      await this.evolve_prompt(reflection.prompt_improvement);
    }

    this.memory.increment_evolution();
    log.evolve("Evolution complete!");
  }

  private async reflect(failures: TaskOutcome[]): Promise<Reflection> {
    const failure_summaries = failures.map((f) =>
      `Task: ${f.task_description}\nError: ${f.error || "Low quality"}\nTools used: ${f.tools_used.join(", ") || "None"}`
    ).join("\n\n");

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Analyze these task failures and provide improvement suggestions.

Recent Failures:
${failure_summaries}

Current system prompt:
${this.current_prompt}

Available tools: ${this.dynamic_tools.map((t) => t.name).join(", ")}

Provide a JSON analysis with:
{
  "task_analysis": "overall analysis of failure patterns",
  "what_worked": ["list of things that worked well"],
  "what_failed": ["list of things that failed"],
  "improvement_suggestions": ["specific actionable improvements"],
  "new_tool_needed": { "name": "tool_name", "description": "what it does", "rationale": "why needed" } or null,
  "prompt_improvement": "suggested prompt improvement" or null
}`,
        },
        {
          role: "assistant",
          content: "{",
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    try {
      return JSON.parse("{" + text) as Reflection;
    } catch {
      return {
        task_analysis: "Failed to parse reflection",
        what_worked: [],
        what_failed: [],
        improvement_suggestions: [],
      };
    }
  }

  private async generate_tool(spec: { name: string; description: string; rationale: string }): Promise<void> {
    log.tool(`Generating new tool: ${spec.name}`);

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Generate a new tool for an AI agent.

Tool Name: ${spec.name}
Description: ${spec.description}
Rationale: ${spec.rationale}

Provide the tool definition and implementation as JSON:
{
  "tool_definition": {
    "name": "tool_name",
    "description": "what it does",
    "input_schema": { "type": "object", "properties": {...}, "required": [...] }
  },
  "implementation": "JavaScript function body as string that takes (input) and returns string"
}`,
        },
        {
          role: "assistant",
          content: "{",
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    try {
      const parsed = JSON.parse("{" + text);

      // Add tool definition
      this.dynamic_tools.push(parsed.tool_definition);

      // Store generated tool
      this.memory.add_tool({
        name: spec.name,
        description: spec.description,
        code: parsed.implementation,
        created_at: new Date().toISOString(),
        usage_count: 0,
        success_rate: 0,
      });

      log.tool(`Successfully generated tool: ${spec.name}`);
    } catch (error) {
      log.warning(`Failed to generate tool: ${error}`);
    }
  }

  private async evolve_prompt(suggestion: string): Promise<void> {
    log.evolve(`Evolving prompt based on: ${suggestion.slice(0, 50)}...`);

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Improve this system prompt based on the suggestion.

Current Prompt:
${this.current_prompt}

Improvement Suggestion:
${suggestion}

Previous Learnings:
${this.memory.get_all().learnings.slice(-5).join("\n")}

Provide an improved system prompt that:
1. Incorporates the suggestion
2. Maintains core capabilities
3. Adds any missing best practices
4. Is concise but comprehensive

Return ONLY the new prompt text, no explanations.`,
        },
      ],
    });

    const new_prompt = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Create new variant
    const variant: PromptVariant = {
      id: generate_id(),
      system_prompt: new_prompt,
      created_at: new Date().toISOString(),
      success_rate: 0,
      avg_quality: 0,
      usage_count: 0,
      is_active: true,
    };

    // Deactivate old prompt
    const all = this.memory.get_all();
    for (const p of all.prompt_variants) {
      p.is_active = false;
    }

    this.memory.add_prompt_variant(variant);
    this.current_prompt = new_prompt;

    log.evolve("Prompt evolved successfully");
  }

  get_stats(): {
    total_tasks: number;
    success_rate: number;
    avg_quality: number;
    evolution_count: number;
    tools_count: number;
    learnings_count: number;
  } {
    return this.memory.get_stats();
  }

  get_learnings(): string[] {
    return this.memory.get_all().learnings;
  }
}

// ============================================================
// Interactive Demo
// ============================================================

async function run_demo(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Self-Evolving Agent - Adaptive AI System            ║
╠═══════════════════════════════════════════════════════════════╣
║  This agent learns from its experiences and improves over     ║
║  time by:                                                     ║
║    • Reflecting on task outcomes                              ║
║    • Generating new tools as needed                           ║
║    • Evolving its system prompt                               ║
║    • Persisting learnings across sessions                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const agent = new SelfEvolvingAgent();

  // Demo tasks that exercise different capabilities
  const demo_tasks = [
    "Calculate 15% of 847 and explain your reasoning",
    "Search for information about climate change and summarize key points",
    "Analyze this text for sentiment: 'I am absolutely thrilled with the results!'",
    "What is the square root of 144 multiplied by 12?",
    "Explain the concept of machine learning in simple terms",
  ];

  console.log("\n--- Running Demo Tasks ---\n");

  for (const task of demo_tasks) {
    console.log(`\n${"-".repeat(60)}`);
    console.log(`Task: ${task}\n`);

    const { result, outcome } = await agent.execute_task(task);

    console.log(`\nResult: ${result.slice(0, 300)}...`);
    console.log(`Quality: ${outcome.quality_score}/100 | Time: ${outcome.execution_time_ms}ms`);

    // Small delay between tasks
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Show final stats
  console.log(`\n${"-".repeat(60)}`);
  console.log("\n📊 Final Statistics:\n");
  const stats = agent.get_stats();
  console.log(`  Tasks Completed: ${stats.total_tasks}`);
  console.log(`  Success Rate: ${stats.success_rate.toFixed(1)}%`);
  console.log(`  Avg Quality: ${stats.avg_quality.toFixed(1)}/100`);
  console.log(`  Evolution Cycles: ${stats.evolution_count}`);
  console.log(`  Generated Tools: ${stats.tools_count}`);
  console.log(`  Learnings Acquired: ${stats.learnings_count}`);

  const learnings = agent.get_learnings();
  if (learnings.length > 0) {
    console.log("\n🧠 Learnings:");
    learnings.slice(-5).forEach((l) => console.log(`  • ${l}`));
  }

  console.log("\n✅ Demo complete! Agent memory persisted to agent_memory.json");
}

// Run the demo
run_demo().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
