/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * APP 17: RECURSIVE SELF-IMPROVEMENT LAB
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * An experimental system where an AI agent analyzes its own outputs,
 * identifies weaknesses, and iteratively improves its own prompts/approaches.
 * Demonstrates meta-cognitive patterns and self-modification strategies.
 *
 * FEATURES:
 * - Self-critique: Agent reviews its own outputs and identifies flaws
 * - Prompt evolution: Automatically refines prompts based on performance
 * - Strategy mutation: Tests variations of approaches and keeps winners
 * - Performance tracking: Metrics across iterations
 * - Capability expansion: Agent proposes new tools/abilities it needs
 * - Failure analysis: Deep dive into what went wrong and why
 *
 * CONCEPTS DEMONSTRATED:
 * - Meta-prompting (prompts that generate prompts)
 * - Self-evaluation and critique
 * - Genetic algorithm-style prompt evolution
 * - Multi-generation improvement tracking
 * - Capability introspection
 *
 * WARNING: This is a conceptual demonstration of self-improvement patterns.
 * Real self-modifying AI systems require careful safety considerations.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";
import * as fs from "fs";

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

interface PromptVariant {
  id: string;
  generation: number;
  prompt_text: string;
  parent_id: string | null;
  mutations_applied: string[];
  performance_scores: number[];
  average_score: number;
  times_used: number;
  created_at: string;
}

interface TaskExecution {
  id: string;
  task: string;
  prompt_used: string;
  prompt_variant_id: string;
  output: string;
  self_critique: {
    strengths: string[];
    weaknesses: string[];
    missed_opportunities: string[];
    score: number;                       // 1-10
  };
  execution_time_ms: number;
  timestamp: string;
}

interface MutationStrategy {
  name: string;
  description: string;
  apply: (prompt: string) => string;
}

interface CapabilityGap {
  id: string;
  description: string;
  discovered_during: string;             // Task ID
  proposed_solution: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "identified" | "addressed" | "wontfix";
}

interface EvolutionMetrics {
  total_generations: number;
  total_executions: number;
  average_score_gen_1: number;
  average_score_current: number;
  improvement_rate: number;              // Percentage improvement
  best_score_ever: number;
  best_prompt_id: string;
  mutations_tried: Record<string, number>;
  mutations_successful: Record<string, number>;
}

interface LabState {
  current_generation: number;
  prompt_variants: PromptVariant[];
  execution_history: TaskExecution[];
  capability_gaps: CapabilityGap[];
  metrics: EvolutionMetrics;
  base_system_prompt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION STRATEGIES
// ─────────────────────────────────────────────────────────────────────────────

const MUTATION_STRATEGIES: MutationStrategy[] = [
  {
    name: "add_specificity",
    description: "Add more specific instructions and constraints",
    apply: (prompt) => prompt + "\n\nBe extremely specific and detailed in your response. Provide concrete examples where possible."
  },
  {
    name: "add_structure",
    description: "Add structural requirements to output",
    apply: (prompt) => prompt + "\n\nStructure your response with clear sections, bullet points, and logical flow."
  },
  {
    name: "add_self_check",
    description: "Add self-verification step",
    apply: (prompt) => prompt + "\n\nBefore finalizing, review your response and verify it fully addresses the request."
  },
  {
    name: "add_examples",
    description: "Request examples in output",
    apply: (prompt) => prompt + "\n\nInclude relevant examples to illustrate your points."
  },
  {
    name: "add_edge_cases",
    description: "Consider edge cases explicitly",
    apply: (prompt) => prompt + "\n\nConsider and address potential edge cases or exceptions."
  },
  {
    name: "add_conciseness",
    description: "Emphasize brevity",
    apply: (prompt) => prompt + "\n\nBe concise and avoid unnecessary verbosity while maintaining completeness."
  },
  {
    name: "add_chain_of_thought",
    description: "Add explicit reasoning steps",
    apply: (prompt) => "Think through this step-by-step:\n\n" + prompt
  },
  {
    name: "add_persona",
    description: "Add expert persona",
    apply: (prompt) => "As an expert with deep knowledge in this domain:\n\n" + prompt
  },
  {
    name: "add_counterarguments",
    description: "Consider opposing viewpoints",
    apply: (prompt) => prompt + "\n\nConsider potential counterarguments or alternative perspectives."
  },
  {
    name: "add_practical_focus",
    description: "Emphasize practical applicability",
    apply: (prompt) => prompt + "\n\nFocus on practical, actionable insights that can be immediately applied."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// SELF-IMPROVEMENT LAB CLASS
// ─────────────────────────────────────────────────────────────────────────────

class SelfImprovementLab {
  private client: Anthropic;
  private state: LabState;
  private state_file = "self_improvement_lab.json";

  constructor() {
    this.client = new Anthropic();
    this.state = this.load_state();
  }

  private load_state(): LabState {
    if (fs.existsSync(this.state_file)) {
      const data = fs.readFileSync(this.state_file, "utf-8");
      return JSON.parse(data);
    }

    // Initialize with base prompt
    const base_prompt: PromptVariant = {
      id: "gen0_base",
      generation: 0,
      prompt_text: "You are a helpful AI assistant. Complete the following task:",
      parent_id: null,
      mutations_applied: [],
      performance_scores: [],
      average_score: 5,
      times_used: 0,
      created_at: new Date().toISOString()
    };

    return {
      current_generation: 0,
      prompt_variants: [base_prompt],
      execution_history: [],
      capability_gaps: [],
      metrics: {
        total_generations: 1,
        total_executions: 0,
        average_score_gen_1: 0,
        average_score_current: 5,
        improvement_rate: 0,
        best_score_ever: 0,
        best_prompt_id: "gen0_base",
        mutations_tried: {},
        mutations_successful: {}
      },
      base_system_prompt: "You are participating in a self-improvement experiment. Your goal is to produce the highest quality output possible."
    };
  }

  private save_state(): void {
    fs.writeFileSync(this.state_file, JSON.stringify(this.state, null, 2));
  }

  /**
   * Execute a task with a specific prompt variant
   */
  async execute_task(task: string, variant_id?: string): Promise<TaskExecution> {
    // Select prompt variant (best performing or specified)
    const variant = variant_id
      ? this.state.prompt_variants.find(v => v.id === variant_id)
      : this.get_best_variant();

    if (!variant) throw new Error("No prompt variant found");

    const full_prompt = `${variant.prompt_text}\n\nTASK: ${task}`;

    const start_time = Date.now();

    // Execute the task
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: this.state.base_system_prompt,
      messages: [{ role: "user", content: full_prompt }]
    });

    const output = response.content[0].type === "text" ? response.content[0].text : "";
    const execution_time = Date.now() - start_time;

    // Self-critique the output
    const critique = await this.self_critique(task, output);

    const execution: TaskExecution = {
      id: `exec_${Date.now()}`,
      task,
      prompt_used: full_prompt,
      prompt_variant_id: variant.id,
      output,
      self_critique: critique,
      execution_time_ms: execution_time,
      timestamp: new Date().toISOString()
    };

    // Update variant performance
    variant.performance_scores.push(critique.score);
    variant.average_score = variant.performance_scores.reduce((a, b) => a + b, 0) / variant.performance_scores.length;
    variant.times_used++;

    // Update metrics
    this.state.metrics.total_executions++;
    if (critique.score > this.state.metrics.best_score_ever) {
      this.state.metrics.best_score_ever = critique.score;
      this.state.metrics.best_prompt_id = variant.id;
    }

    // Add to history
    this.state.execution_history.push(execution);

    // Check for capability gaps
    if (critique.score < 6) {
      await this.identify_capability_gaps(execution);
    }

    this.save_state();
    return execution;
  }

  /**
   * Self-critique an output
   */
  private async self_critique(task: string, output: string): Promise<TaskExecution["self_critique"]> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are a harsh but fair critic evaluating AI output quality.

ORIGINAL TASK:
${task}

AI OUTPUT:
${output}

Evaluate this output critically. Be honest - what works and what doesn't?

Return your evaluation as JSON:
{
  "strengths": ["specific strength 1", "specific strength 2"],
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "missed_opportunities": ["what could have been better"],
  "score": 1-10
}

Scoring guide:
- 1-3: Poor - major issues, incomplete, or wrong
- 4-5: Below average - notable problems
- 6-7: Good - solid but room for improvement
- 8-9: Excellent - minor issues only
- 10: Perfect - wouldn't change anything

Be critical but fair. Return ONLY valid JSON.`
      }]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\{[\s\S]*\}/);
    if (!json_match) {
      return {
        strengths: ["Output was generated"],
        weaknesses: ["Could not parse critique"],
        missed_opportunities: [],
        score: 5
      };
    }

    return JSON.parse(json_match[0]);
  }

  /**
   * Identify capability gaps from poor performance
   */
  private async identify_capability_gaps(execution: TaskExecution): Promise<void> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Analyze this underperforming AI task execution:

TASK: ${execution.task}
SCORE: ${execution.self_critique.score}/10
WEAKNESSES: ${execution.self_critique.weaknesses.join(", ")}

What CAPABILITY GAP prevented better performance?
What would the AI need to do better?

Return as JSON:
{
  "description": "what capability was missing",
  "proposed_solution": "how to address this",
  "priority": "low|medium|high|critical"
}

Return ONLY valid JSON.`
      }]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\{[\s\S]*\}/);
    if (!json_match) return;

    const gap_data = JSON.parse(json_match[0]);
    const gap: CapabilityGap = {
      id: `gap_${Date.now()}`,
      description: gap_data.description,
      discovered_during: execution.id,
      proposed_solution: gap_data.proposed_solution,
      priority: gap_data.priority,
      status: "identified"
    };

    this.state.capability_gaps.push(gap);
  }

  /**
   * Evolve prompts through mutation
   */
  async evolve_generation(): Promise<PromptVariant[]> {
    console.log("\n⟳ Beginning prompt evolution...");

    // Select top performers
    const sorted_variants = [...this.state.prompt_variants]
      .filter(v => v.times_used > 0)
      .sort((a, b) => b.average_score - a.average_score);

    if (sorted_variants.length === 0) {
      console.log("No variants with executions yet. Run some tasks first.");
      return [];
    }

    const top_variants = sorted_variants.slice(0, 3);
    const new_generation: PromptVariant[] = [];

    this.state.current_generation++;

    for (const parent of top_variants) {
      // Apply 2-3 random mutations
      const num_mutations = 2 + Math.floor(Math.random() * 2);
      const mutations_to_apply = this.select_random_mutations(num_mutations);

      let mutated_prompt = parent.prompt_text;
      const mutation_names: string[] = [];

      for (const mutation of mutations_to_apply) {
        mutated_prompt = mutation.apply(mutated_prompt);
        mutation_names.push(mutation.name);

        // Track mutation usage
        this.state.metrics.mutations_tried[mutation.name] =
          (this.state.metrics.mutations_tried[mutation.name] || 0) + 1;
      }

      const new_variant: PromptVariant = {
        id: `gen${this.state.current_generation}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        generation: this.state.current_generation,
        prompt_text: mutated_prompt,
        parent_id: parent.id,
        mutations_applied: mutation_names,
        performance_scores: [],
        average_score: parent.average_score, // Inherit parent's score as starting point
        times_used: 0,
        created_at: new Date().toISOString()
      };

      new_generation.push(new_variant);
      console.log(`  ✓ Created ${new_variant.id} from ${parent.id} with mutations: ${mutation_names.join(", ")}`);
    }

    this.state.prompt_variants.push(...new_generation);
    this.state.metrics.total_generations++;
    this.save_state();

    return new_generation;
  }

  private select_random_mutations(count: number): MutationStrategy[] {
    const shuffled = [...MUTATION_STRATEGIES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Get best performing variant
   */
  get_best_variant(): PromptVariant {
    const with_executions = this.state.prompt_variants.filter(v => v.times_used > 0);
    if (with_executions.length === 0) {
      return this.state.prompt_variants[0];
    }
    return with_executions.reduce((best, current) =>
      current.average_score > best.average_score ? current : best
    );
  }

  /**
   * Generate meta-prompt: a prompt that improves prompts
   */
  async generate_meta_improvement(): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are a prompt engineering expert analyzing prompt performance data.

CURRENT BEST PROMPT:
${this.get_best_variant().prompt_text}

RECENT EXECUTION SCORES:
${this.state.execution_history.slice(-5).map(e =>
  `- Score ${e.self_critique.score}/10: Weaknesses: ${e.self_critique.weaknesses.join(", ")}`
).join("\n")}

IDENTIFIED CAPABILITY GAPS:
${this.state.capability_gaps.filter(g => g.status === "identified").map(g =>
  `- ${g.description} (Priority: ${g.priority})`
).join("\n") || "None identified yet"}

MUTATION SUCCESS RATES:
${Object.entries(this.state.metrics.mutations_tried).map(([name, count]) => {
  const successful = this.state.metrics.mutations_successful[name] || 0;
  return `- ${name}: ${successful}/${count} successful`;
}).join("\n") || "No data yet"}

Based on this analysis, write a COMPLETELY NEW prompt that addresses the weaknesses
and capability gaps while building on what works. Be creative but focused on
measurable improvement.

Return the new prompt text only, no explanation needed.`
      }]
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  /**
   * Tournament: compare two variants head-to-head
   */
  async tournament(task: string): Promise<{ winner: PromptVariant; loser: PromptVariant }> {
    // Select two variants
    const variants = [...this.state.prompt_variants]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    if (variants.length < 2) {
      throw new Error("Need at least 2 variants for tournament");
    }

    console.log("\n⚔ TOURNAMENT: Head-to-head comparison");
    console.log(`  Variant A: ${variants[0].id}`);
    console.log(`  Variant B: ${variants[1].id}`);

    const execution_a = await this.execute_task(task, variants[0].id);
    const execution_b = await this.execute_task(task, variants[1].id);

    const winner = execution_a.self_critique.score >= execution_b.self_critique.score
      ? variants[0] : variants[1];
    const loser = winner === variants[0] ? variants[1] : variants[0];

    console.log(`\n  Winner: ${winner.id} (Score: ${execution_a.self_critique.score >= execution_b.self_critique.score
      ? execution_a.self_critique.score : execution_b.self_critique.score})`);

    return { winner, loser };
  }

  /**
   * Get lab metrics
   */
  get_metrics(): EvolutionMetrics {
    // Calculate current generation average
    const current_gen_variants = this.state.prompt_variants
      .filter(v => v.generation === this.state.current_generation && v.times_used > 0);

    if (current_gen_variants.length > 0) {
      this.state.metrics.average_score_current =
        current_gen_variants.reduce((sum, v) => sum + v.average_score, 0) / current_gen_variants.length;
    }

    // Calculate gen 1 average for comparison
    const gen1_variants = this.state.prompt_variants
      .filter(v => v.generation <= 1 && v.times_used > 0);

    if (gen1_variants.length > 0) {
      this.state.metrics.average_score_gen_1 =
        gen1_variants.reduce((sum, v) => sum + v.average_score, 0) / gen1_variants.length;

      this.state.metrics.improvement_rate =
        ((this.state.metrics.average_score_current - this.state.metrics.average_score_gen_1)
          / this.state.metrics.average_score_gen_1) * 100;
    }

    return this.state.metrics;
  }

  /**
   * Render lab dashboard
   */
  render_dashboard(): string {
    const metrics = this.get_metrics();
    const best_variant = this.get_best_variant();
    const recent_executions = this.state.execution_history.slice(-5);

    const lines: string[] = [];

    lines.push("╔══════════════════════════════════════════════════════════════════════════════╗");
    lines.push("║               RECURSIVE SELF-IMPROVEMENT LAB                                 ║");
    lines.push("╠══════════════════════════════════════════════════════════════════════════════╣");

    lines.push(`║  Generation: ${this.state.current_generation}`.padEnd(79) + "║");
    lines.push(`║  Total Executions: ${metrics.total_executions}`.padEnd(79) + "║");
    lines.push(`║  Prompt Variants: ${this.state.prompt_variants.length}`.padEnd(79) + "║");

    lines.push("╠══════════════════════════════════════════════════════════════════════════════╣");
    lines.push("║  PERFORMANCE METRICS                                                         ║");

    const improvement_indicator = metrics.improvement_rate > 0 ? "↑" :
                                 metrics.improvement_rate < 0 ? "↓" : "→";
    lines.push(`║    Gen 1 Average:    ${metrics.average_score_gen_1.toFixed(2)}/10`.padEnd(79) + "║");
    lines.push(`║    Current Average:  ${metrics.average_score_current.toFixed(2)}/10 ${improvement_indicator} ${Math.abs(metrics.improvement_rate).toFixed(1)}%`.padEnd(79) + "║");
    lines.push(`║    Best Score Ever:  ${metrics.best_score_ever}/10`.padEnd(79) + "║");

    lines.push("╠══════════════════════════════════════════════════════════════════════════════╣");
    lines.push("║  BEST PERFORMING VARIANT                                                     ║");
    lines.push(`║    ID: ${best_variant.id}`.padEnd(79) + "║");
    lines.push(`║    Avg Score: ${best_variant.average_score.toFixed(2)} | Uses: ${best_variant.times_used}`.padEnd(79) + "║");
    const preview = best_variant.prompt_text.substring(0, 60).replace(/\n/g, " ");
    lines.push(`║    "${preview}..."`.padEnd(79) + "║");

    if (recent_executions.length > 0) {
      lines.push("╠══════════════════════════════════════════════════════════════════════════════╣");
      lines.push("║  RECENT EXECUTIONS                                                           ║");
      recent_executions.forEach(exec => {
        const score_bar = "█".repeat(exec.self_critique.score) + "░".repeat(10 - exec.self_critique.score);
        const task_preview = exec.task.substring(0, 40);
        lines.push(`║    [${score_bar}] ${task_preview}`.padEnd(79) + "║");
      });
    }

    const open_gaps = this.state.capability_gaps.filter(g => g.status === "identified");
    if (open_gaps.length > 0) {
      lines.push("╠══════════════════════════════════════════════════════════════════════════════╣");
      lines.push("║  CAPABILITY GAPS (Open)                                                      ║");
      open_gaps.slice(0, 3).forEach(gap => {
        const priority_icon = gap.priority === "critical" ? "🔴" :
                             gap.priority === "high" ? "🟠" :
                             gap.priority === "medium" ? "🟡" : "🟢";
        lines.push(`║    ${priority_icon} ${gap.description.substring(0, 65)}`.padEnd(79) + "║");
      });
    }

    lines.push("╚══════════════════════════════════════════════════════════════════════════════╝");

    return lines.join("\n");
  }

  /**
   * Full introspection report
   */
  async generate_introspection(): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are an AI system analyzing your own learning process.

Your performance data:
- Generation: ${this.state.current_generation}
- Total executions: ${this.state.metrics.total_executions}
- Best score: ${this.state.metrics.best_score_ever}/10
- Improvement rate: ${this.state.metrics.improvement_rate.toFixed(1)}%

Recent execution patterns:
${this.state.execution_history.slice(-10).map(e =>
  `Score ${e.self_critique.score}: Strengths: ${e.self_critique.strengths.slice(0, 2).join(", ")} | Weaknesses: ${e.self_critique.weaknesses.slice(0, 2).join(", ")}`
).join("\n")}

Capability gaps identified:
${this.state.capability_gaps.map(g => `- ${g.description} (${g.status})`).join("\n") || "None"}

Successful mutations:
${Object.entries(this.state.metrics.mutations_tried).map(([name, count]) => {
  const successful = this.state.metrics.mutations_successful[name] || 0;
  return `- ${name}: ${((successful/count)*100).toFixed(0)}% success rate`;
}).join("\n") || "No data yet"}

Write a reflective analysis:
1. What patterns do you observe in your performance?
2. What seems to help vs hurt output quality?
3. What fundamental improvements would make the biggest difference?
4. What are you still struggling with?
5. If you could change anything about your approach, what would it be?

Be genuinely introspective. This is for self-improvement.`
      }]
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  // State accessors
  get_variants(): PromptVariant[] { return this.state.prompt_variants; }
  get_history(): TaskExecution[] { return this.state.execution_history; }
  get_gaps(): CapabilityGap[] { return this.state.capability_gaps; }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIVE CLI
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const lab = new SelfImprovementLab();

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ███████╗███████╗██╗     ███████╗                                           ║
║   ██╔════╝██╔════╝██║     ██╔════╝                                           ║
║   ███████╗█████╗  ██║     █████╗                                             ║
║   ╚════██║██╔══╝  ██║     ██╔══╝                                             ║
║   ███████║███████╗███████╗██║                                                ║
║   ╚══════╝╚══════╝╚══════╝╚═╝                                                ║
║                                                                              ║
║   ██╗███╗   ███╗██████╗ ██████╗  ██████╗ ██╗   ██╗███████╗                   ║
║   ██║████╗ ████║██╔══██╗██╔══██╗██╔═══██╗██║   ██║██╔════╝                   ║
║   ██║██╔████╔██║██████╔╝██████╔╝██║   ██║██║   ██║█████╗                     ║
║   ██║██║╚██╔╝██║██╔═══╝ ██╔══██╗██║   ██║╚██╗ ██╔╝██╔══╝                     ║
║   ██║██║ ╚═╝ ██║██║     ██║  ██║╚██████╔╝ ╚████╔╝ ███████╗                   ║
║   ╚═╝╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝   ╚═══╝  ╚══════╝                   ║
║                                                                              ║
║                      [ Recursive Self-Improvement Lab ]                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  COMMANDS:                                                                   ║
║    /run <task>       - Execute a task and self-critique                      ║
║    /evolve           - Create next generation of prompts                     ║
║    /tournament <t>   - Head-to-head comparison on task                       ║
║    /meta             - Generate meta-improvement prompt                      ║
║    /introspect       - Full self-analysis report                             ║
║    /dashboard        - Show current metrics                                  ║
║    /variants         - List all prompt variants                              ║
║    /gaps             - Show capability gaps                                  ║
║    /help             - Show this help                                        ║
║    /quit             - Exit                                                  ║
║                                                                              ║
║  Or just type a task to execute!                                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  // Show initial dashboard
  console.log(lab.render_dashboard());

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () => {
    rl.question("\n⟳ ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === "/quit" || trimmed === "/exit") {
        console.log("\n✧ Self-improvement cycle paused. Progress saved.\n");
        rl.close();
        process.exit(0);
      }

      if (trimmed === "/help") {
        console.log(`
COMMANDS:
  /run <task>       - Execute a task and self-critique
  /evolve           - Create next generation of prompts via mutation
  /tournament <t>   - Compare two random variants on same task
  /meta             - Generate a new prompt based on performance analysis
  /introspect       - Full self-reflection report
  /dashboard        - Show current metrics and status
  /variants         - List all prompt variants with scores
  /gaps             - Show identified capability gaps

WORKFLOW:
  1. Run tasks with /run to gather performance data
  2. Use /evolve to create improved prompt variants
  3. Use /tournament for head-to-head comparisons
  4. Use /introspect to understand patterns
  5. Use /meta to generate breakthrough improvements
        `);
        prompt();
        return;
      }

      if (trimmed === "/dashboard") {
        console.log(lab.render_dashboard());
        prompt();
        return;
      }

      if (trimmed === "/variants") {
        const variants = lab.get_variants();
        console.log("\n═══════════════════════════════════════════════════════════════");
        console.log("  PROMPT VARIANTS");
        console.log("═══════════════════════════════════════════════════════════════");
        variants.forEach(v => {
          const score_bar = "█".repeat(Math.floor(v.average_score)) + "░".repeat(10 - Math.floor(v.average_score));
          console.log(`\n  ${v.id}`);
          console.log(`  Gen ${v.generation} | [${score_bar}] ${v.average_score.toFixed(2)}/10 | Uses: ${v.times_used}`);
          if (v.mutations_applied.length > 0) {
            console.log(`  Mutations: ${v.mutations_applied.join(", ")}`);
          }
          console.log(`  "${v.prompt_text.substring(0, 70).replace(/\n/g, " ")}..."`);
        });
        prompt();
        return;
      }

      if (trimmed === "/gaps") {
        const gaps = lab.get_gaps();
        console.log("\n═══════════════════════════════════════════════════════════════");
        console.log("  CAPABILITY GAPS");
        console.log("═══════════════════════════════════════════════════════════════");
        if (gaps.length === 0) {
          console.log("  No capability gaps identified yet.");
        } else {
          gaps.forEach(g => {
            const priority_icon = g.priority === "critical" ? "🔴" :
                                 g.priority === "high" ? "🟠" :
                                 g.priority === "medium" ? "🟡" : "🟢";
            console.log(`\n  ${priority_icon} ${g.description}`);
            console.log(`     Status: ${g.status}`);
            console.log(`     Proposed: ${g.proposed_solution}`);
          });
        }
        prompt();
        return;
      }

      if (trimmed === "/evolve") {
        try {
          const new_variants = await lab.evolve_generation();
          if (new_variants.length > 0) {
            console.log(`\n✓ Created ${new_variants.length} new prompt variants`);
            console.log("  Run tasks to evaluate their performance");
          }
        } catch (error: any) {
          console.error("Evolution error:", error.message);
        }
        prompt();
        return;
      }

      if (trimmed === "/meta") {
        console.log("\n⟳ Generating meta-improvement prompt...");
        try {
          const meta_prompt = await lab.generate_meta_improvement();
          console.log("\n═══════════════════════════════════════════════════════════════");
          console.log("  META-GENERATED PROMPT");
          console.log("═══════════════════════════════════════════════════════════════");
          console.log(meta_prompt);
        } catch (error: any) {
          console.error("Meta generation error:", error.message);
        }
        prompt();
        return;
      }

      if (trimmed === "/introspect") {
        console.log("\n⟳ Generating introspection report...");
        try {
          const introspection = await lab.generate_introspection();
          console.log("\n═══════════════════════════════════════════════════════════════");
          console.log("  SELF-INTROSPECTION REPORT");
          console.log("═══════════════════════════════════════════════════════════════");
          console.log(introspection);
        } catch (error: any) {
          console.error("Introspection error:", error.message);
        }
        prompt();
        return;
      }

      if (trimmed.startsWith("/tournament ")) {
        const task = trimmed.substring(12);
        try {
          const result = await lab.tournament(task);
          console.log(`\n  Champion: ${result.winner.id}`);
        } catch (error: any) {
          console.error("Tournament error:", error.message);
        }
        prompt();
        return;
      }

      // Default: execute as task
      try {
        let task = trimmed;
        if (task.startsWith("/run ")) {
          task = task.substring(5);
        }

        console.log("\n⟳ Executing task and self-critiquing...\n");
        const execution = await lab.execute_task(task);

        console.log("═══════════════════════════════════════════════════════════════");
        console.log("  EXECUTION RESULT");
        console.log("═══════════════════════════════════════════════════════════════");
        console.log(`\nOUTPUT:\n${execution.output.substring(0, 500)}${execution.output.length > 500 ? "..." : ""}`);

        console.log("\n───────────────────────────────────────────────────────────────");
        console.log("  SELF-CRITIQUE");
        console.log("───────────────────────────────────────────────────────────────");

        const score_bar = "█".repeat(execution.self_critique.score) + "░".repeat(10 - execution.self_critique.score);
        console.log(`\nScore: [${score_bar}] ${execution.self_critique.score}/10`);

        console.log("\nStrengths:");
        execution.self_critique.strengths.forEach(s => console.log(`  ✓ ${s}`));

        console.log("\nWeaknesses:");
        execution.self_critique.weaknesses.forEach(w => console.log(`  ✗ ${w}`));

        if (execution.self_critique.missed_opportunities.length > 0) {
          console.log("\nMissed Opportunities:");
          execution.self_critique.missed_opportunities.forEach(m => console.log(`  → ${m}`));
        }

        console.log(`\nPrompt Variant: ${execution.prompt_variant_id}`);
        console.log(`Execution Time: ${execution.execution_time_ms}ms`);

      } catch (error: any) {
        console.error("Execution error:", error.message);
      }

      prompt();
    });
  };

  prompt();
}

main();
