/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * APP 16: REALITY DIFF ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A multiverse simulator that explores parallel reality branches.
 * Given a scenario and a divergence point, it generates multiple alternate
 * timelines and computes diffs between them - showing exactly how small
 * changes cascade into dramatically different futures.
 *
 * FEATURES:
 * - Branch reality at any decision point
 * - Generate 3-5 parallel timelines with different choices
 * - Compute semantic "diffs" between realities
 * - Track divergence metrics over time
 * - Visualize reality trees with ASCII art
 * - Merge analysis: what do all timelines have in common?
 * - Identify critical junctures (high-impact decision points)
 *
 * CONCEPTS DEMONSTRATED:
 * - Parallel narrative generation with constraints
 * - Semantic diffing and comparison
 * - Tree data structures for branching histories
 * - Convergence/divergence analysis
 * - Multi-perspective storytelling
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string;
  timestamp: string;                     // Relative time (e.g., "Day 1", "Year 5")
  description: string;
  consequences: string[];
  emotional_tone: "positive" | "negative" | "neutral" | "mixed";
  importance: number;                    // 1-10 scale
}

interface RealityBranch {
  id: string;
  name: string;                          // e.g., "Timeline Alpha", "The Road Not Taken"
  choice_made: string;                   // The divergent choice
  events: TimelineEvent[];
  final_state: {
    summary: string;
    key_outcomes: string[];
    characters_affected: string[];
    themes: string[];
  };
  divergence_score: number;              // How different from baseline (0-100)
}

interface DivergencePoint {
  id: string;
  scenario_context: string;
  decision_moment: string;
  possible_choices: string[];
  timestamp: string;
}

interface RealityDiff {
  timeline_a: string;
  timeline_b: string;
  shared_elements: string[];
  unique_to_a: string[];
  unique_to_b: string[];
  tone_difference: string;
  outcome_divergence: number;            // 0-100
  critical_difference: string;           // The most impactful difference
}

interface MultiverseAnalysis {
  base_scenario: string;
  divergence_point: DivergencePoint;
  branches: RealityBranch[];
  diffs: RealityDiff[];
  convergence_points: string[];          // What's true across ALL timelines
  most_volatile_factor: string;          // What varies most between timelines
  butterfly_effects: string[];           // Small changes with huge impacts
  optimal_timeline?: string;             // Which timeline has best outcomes
  worst_timeline?: string;               // Which has worst outcomes
}

interface RealityTree {
  root: string;                          // The starting scenario
  branches: Map<string, RealityBranch>;
  depth: number;                         // How many generations of branches
}

// ─────────────────────────────────────────────────────────────────────────────
// REALITY ENGINE CLASS
// ─────────────────────────────────────────────────────────────────────────────

class RealityDiffEngine {
  private client: Anthropic;
  private current_tree: RealityTree | null = null;
  private analysis_history: MultiverseAnalysis[] = [];

  constructor() {
    this.client = new Anthropic();
  }

  /**
   * Generate a divergence point from a scenario
   */
  async create_divergence_point(scenario: string): Promise<DivergencePoint> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are a reality architect analyzing critical decision points in narratives.

Given this scenario:
"${scenario}"

Identify a PIVOTAL DECISION POINT where the story could branch into multiple different timelines.
This should be a moment where a choice, action, or random event could lead to dramatically different futures.

Return your analysis as JSON:
{
  "id": "unique_id",
  "scenario_context": "brief summary of the scenario",
  "decision_moment": "the specific moment/choice that creates the branch",
  "possible_choices": ["choice 1", "choice 2", "choice 3", "choice 4"],
  "timestamp": "when in the narrative this occurs"
}

Make the choices meaningfully different - not just variations but fundamentally different paths.
Return ONLY valid JSON, no other text.`
      }]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\{[\s\S]*\}/);
    if (!json_match) throw new Error("Failed to parse divergence point");

    return JSON.parse(json_match[0]);
  }

  /**
   * Generate a complete reality branch from a choice
   */
  async generate_branch(
    divergence: DivergencePoint,
    choice: string,
    branch_name: string
  ): Promise<RealityBranch> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `You are a multiverse chronicler documenting alternate timelines.

SCENARIO CONTEXT:
${divergence.scenario_context}

DIVERGENCE POINT:
${divergence.decision_moment}

THE CHOICE MADE IN THIS TIMELINE:
"${choice}"

Generate a complete timeline showing how this choice plays out over time.
Create 5-7 significant events that cascade from this choice.
Show both immediate and long-term consequences.

Return as JSON:
{
  "id": "unique_branch_id",
  "name": "${branch_name}",
  "choice_made": "${choice}",
  "events": [
    {
      "id": "event_1",
      "timestamp": "relative time (Day 1, Week 2, Year 5, etc.)",
      "description": "what happens",
      "consequences": ["consequence 1", "consequence 2"],
      "emotional_tone": "positive|negative|neutral|mixed",
      "importance": 1-10
    }
  ],
  "final_state": {
    "summary": "where this timeline ends up",
    "key_outcomes": ["outcome 1", "outcome 2", "outcome 3"],
    "characters_affected": ["person/entity 1", "person/entity 2"],
    "themes": ["theme 1", "theme 2"]
  },
  "divergence_score": 0-100
}

Make the events feel like natural consequences - each flowing from the previous.
The divergence_score should reflect how different this timeline is from a "neutral" baseline.
Return ONLY valid JSON.`
      }]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\{[\s\S]*\}/);
    if (!json_match) throw new Error("Failed to parse branch");

    return JSON.parse(json_match[0]);
  }

  /**
   * Compute diff between two reality branches
   */
  async compute_diff(branch_a: RealityBranch, branch_b: RealityBranch): Promise<RealityDiff> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are a reality comparator analyzing differences between parallel timelines.

TIMELINE A: "${branch_a.name}"
Choice: ${branch_a.choice_made}
Events: ${branch_a.events.map(e => e.description).join(" → ")}
Final State: ${branch_a.final_state.summary}
Outcomes: ${branch_a.final_state.key_outcomes.join(", ")}

TIMELINE B: "${branch_b.name}"
Choice: ${branch_b.choice_made}
Events: ${branch_b.events.map(e => e.description).join(" → ")}
Final State: ${branch_b.final_state.summary}
Outcomes: ${branch_b.final_state.key_outcomes.join(", ")}

Compute a semantic diff between these timelines.

Return as JSON:
{
  "timeline_a": "${branch_a.name}",
  "timeline_b": "${branch_b.name}",
  "shared_elements": ["things that happen in BOTH timelines"],
  "unique_to_a": ["things only in timeline A"],
  "unique_to_b": ["things only in timeline B"],
  "tone_difference": "how the emotional/thematic tone differs",
  "outcome_divergence": 0-100,
  "critical_difference": "the single most important difference between them"
}

Return ONLY valid JSON.`
      }]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\{[\s\S]*\}/);
    if (!json_match) throw new Error("Failed to parse diff");

    return JSON.parse(json_match[0]);
  }

  /**
   * Generate full multiverse analysis
   */
  async analyze_multiverse(scenario: string): Promise<MultiverseAnalysis> {
    console.log("\n⊗ Creating divergence point...");
    const divergence = await this.create_divergence_point(scenario);

    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  DIVERGENCE POINT IDENTIFIED                                   ║`);
    console.log(`╠════════════════════════════════════════════════════════════════╣`);
    console.log(`║  ${divergence.decision_moment.substring(0, 60).padEnd(60)}  ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝`);

    console.log("\nPossible branches:");
    divergence.possible_choices.forEach((choice, i) => {
      console.log(`  [${i + 1}] ${choice}`);
    });

    // Generate branches for each choice
    const branch_names = ["Timeline Alpha", "Timeline Beta", "Timeline Gamma", "Timeline Delta"];
    const branches: RealityBranch[] = [];

    for (let i = 0; i < divergence.possible_choices.length; i++) {
      console.log(`\n⊕ Generating ${branch_names[i]}...`);
      const branch = await this.generate_branch(
        divergence,
        divergence.possible_choices[i],
        branch_names[i]
      );
      branches.push(branch);
      console.log(`  ✓ ${branch.events.length} events generated, divergence: ${branch.divergence_score}%`);
    }

    // Compute all pairwise diffs
    console.log("\n⊗ Computing reality diffs...");
    const diffs: RealityDiff[] = [];
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const diff = await this.compute_diff(branches[i], branches[j]);
        diffs.push(diff);
      }
    }

    // Analyze convergence and butterfly effects
    const analysis = await this.synthesize_analysis(divergence, branches, diffs);

    this.analysis_history.push(analysis);
    return analysis;
  }

  /**
   * Synthesize final analysis across all branches
   */
  private async synthesize_analysis(
    divergence: DivergencePoint,
    branches: RealityBranch[],
    diffs: RealityDiff[]
  ): Promise<MultiverseAnalysis> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are a multiverse analyst synthesizing patterns across parallel timelines.

DIVERGENCE POINT:
${divergence.decision_moment}

TIMELINE SUMMARIES:
${branches.map(b => `- ${b.name} (${b.choice_made}): ${b.final_state.summary}`).join("\n")}

DIFF ANALYSIS:
${diffs.map(d => `${d.timeline_a} vs ${d.timeline_b}: ${d.critical_difference} (${d.outcome_divergence}% divergence)`).join("\n")}

Synthesize:
1. What elements are TRUE across ALL timelines? (convergence points)
2. What single factor varies MOST between timelines? (most volatile)
3. What small differences led to the BIGGEST cascading changes? (butterfly effects)
4. Which timeline has the BEST outcomes overall?
5. Which timeline has the WORST outcomes overall?

Return as JSON:
{
  "convergence_points": ["constant 1", "constant 2"],
  "most_volatile_factor": "what varies most",
  "butterfly_effects": ["small cause → big effect 1", "small cause → big effect 2"],
  "optimal_timeline": "name of best timeline",
  "worst_timeline": "name of worst timeline"
}

Return ONLY valid JSON.`
      }]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\{[\s\S]*\}/);
    if (!json_match) throw new Error("Failed to parse synthesis");

    const synthesis = JSON.parse(json_match[0]);

    return {
      base_scenario: divergence.scenario_context,
      divergence_point: divergence,
      branches,
      diffs,
      ...synthesis
    };
  }

  /**
   * Render ASCII visualization of reality tree
   */
  render_tree(analysis: MultiverseAnalysis): string {
    const lines: string[] = [];

    lines.push("╔══════════════════════════════════════════════════════════════════════════════╗");
    lines.push("║                          M U L T I V E R S E   M A P                         ║");
    lines.push("╚══════════════════════════════════════════════════════════════════════════════╝");
    lines.push("");
    lines.push("                               [ORIGIN POINT]");
    lines.push(`                    "${analysis.divergence_point.decision_moment.substring(0, 40)}..."`);
    lines.push("                                    │");
    lines.push("                    ┌───────────────┼───────────────┐");
    lines.push("                    │               │               │");

    // Show branches with their divergence scores
    const branch_lines: string[] = [];
    analysis.branches.forEach((branch, i) => {
      const indicator = branch.name === analysis.optimal_timeline ? "★" :
                       branch.name === analysis.worst_timeline ? "✗" : "○";
      const bar_length = Math.floor(branch.divergence_score / 5);
      const bar = "█".repeat(bar_length) + "░".repeat(20 - bar_length);
      branch_lines.push(`    ${indicator} ${branch.name.padEnd(16)} [${bar}] ${branch.divergence_score}%`);
      branch_lines.push(`      └─ ${branch.choice_made.substring(0, 50)}...`);
      branch_lines.push(`         Final: ${branch.final_state.summary.substring(0, 45)}...`);
      branch_lines.push("");
    });

    lines.push(...branch_lines);

    lines.push("────────────────────────────────────────────────────────────────────────────────");
    lines.push("LEGEND: ★ = Optimal Timeline  ✗ = Worst Timeline  ○ = Intermediate");

    return lines.join("\n");
  }

  /**
   * Render diff visualization
   */
  render_diff(diff: RealityDiff): string {
    const lines: string[] = [];

    lines.push(`\n┌──────────────────────────────────────────────────────────────────┐`);
    lines.push(`│  REALITY DIFF: ${diff.timeline_a} ←→ ${diff.timeline_b}`.padEnd(67) + "│");
    lines.push(`├──────────────────────────────────────────────────────────────────┤`);
    lines.push(`│  Divergence: ${diff.outcome_divergence}%`.padEnd(67) + "│");
    lines.push(`├──────────────────────────────────────────────────────────────────┤`);

    lines.push(`│  SHARED (common across both):`.padEnd(67) + "│");
    diff.shared_elements.slice(0, 3).forEach(el => {
      lines.push(`│    • ${el.substring(0, 58)}`.padEnd(67) + "│");
    });

    lines.push(`│`.padEnd(67) + "│");
    lines.push(`│  - UNIQUE TO ${diff.timeline_a}:`.padEnd(67) + "│");
    diff.unique_to_a.slice(0, 2).forEach(el => {
      lines.push(`│    − ${el.substring(0, 58)}`.padEnd(67) + "│");
    });

    lines.push(`│`.padEnd(67) + "│");
    lines.push(`│  + UNIQUE TO ${diff.timeline_b}:`.padEnd(67) + "│");
    diff.unique_to_b.slice(0, 2).forEach(el => {
      lines.push(`│    + ${el.substring(0, 58)}`.padEnd(67) + "│");
    });

    lines.push(`├──────────────────────────────────────────────────────────────────┤`);
    lines.push(`│  CRITICAL DIFFERENCE:`.padEnd(67) + "│");
    lines.push(`│  ${diff.critical_difference.substring(0, 63)}`.padEnd(67) + "│");
    lines.push(`└──────────────────────────────────────────────────────────────────┘`);

    return lines.join("\n");
  }

  /**
   * Deep dive into a specific branch
   */
  async explore_branch(branch: RealityBranch, question: string): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are exploring a specific timeline in detail.

TIMELINE: ${branch.name}
INITIAL CHOICE: ${branch.choice_made}

TIMELINE EVENTS:
${branch.events.map(e => `[${e.timestamp}] ${e.description}`).join("\n")}

FINAL STATE:
${branch.final_state.summary}

KEY OUTCOMES:
${branch.final_state.key_outcomes.join("\n")}

USER QUESTION: "${question}"

Provide a detailed answer about this specific timeline. Be specific and grounded in the established events.
If the question asks about something not explicitly defined, extrapolate logically from what is established.`
      }]
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  /**
   * Create a sub-branch from an existing branch
   */
  async branch_from_branch(
    parent_branch: RealityBranch,
    event_index: number
  ): Promise<MultiverseAnalysis> {
    const event = parent_branch.events[event_index];
    const scenario = `In ${parent_branch.name}, at ${event.timestamp}: ${event.description}.
Context: This timeline started when "${parent_branch.choice_made}" and has led to:
${parent_branch.events.slice(0, event_index).map(e => e.description).join(", ")}`;

    return this.analyze_multiverse(scenario);
  }

  // Getters
  get_latest_analysis(): MultiverseAnalysis | null {
    return this.analysis_history[this.analysis_history.length - 1] || null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIVE CLI
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const engine = new RealityDiffEngine();

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██████╗ ███████╗ █████╗ ██╗     ██╗████████╗██╗   ██╗                      ║
║   ██╔══██╗██╔════╝██╔══██╗██║     ██║╚══██╔══╝╚██╗ ██╔╝                      ║
║   ██████╔╝█████╗  ███████║██║     ██║   ██║    ╚████╔╝                       ║
║   ██╔══██╗██╔══╝  ██╔══██║██║     ██║   ██║     ╚██╔╝                        ║
║   ██║  ██║███████╗██║  ██║███████╗██║   ██║      ██║                         ║
║   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝   ╚═╝      ╚═╝                         ║
║                                                                              ║
║        ██████╗ ██╗███████╗███████╗    ███████╗███╗   ██╗ ██████╗             ║
║        ██╔══██╗██║██╔════╝██╔════╝    ██╔════╝████╗  ██║██╔════╝             ║
║        ██║  ██║██║█████╗  █████╗      █████╗  ██╔██╗ ██║██║  ███╗            ║
║        ██║  ██║██║██╔══╝  ██╔══╝      ██╔══╝  ██║╚██╗██║██║   ██║            ║
║        ██████╔╝██║██║     ██║         ███████╗██║ ╚████║╚██████╔╝            ║
║        ╚═════╝ ╚═╝╚═╝     ╚═╝         ╚══════╝╚═╝  ╚═══╝ ╚═════╝             ║
║                                                                              ║
║                    [ Exploring Parallel Possibilities ]                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  COMMANDS:                                                                   ║
║    /branch <scenario>  - Create multiverse from scenario                     ║
║    /explore <n>        - Deep dive into timeline n (1-4)                     ║
║    /diff <a> <b>       - Show diff between timelines a and b                 ║
║    /subbranch <n> <e>  - Branch from timeline n at event e                   ║
║    /tree               - Show current multiverse map                         ║
║    /help               - Show this help                                      ║
║    /quit               - Exit                                                ║
║                                                                              ║
║  Or just type a scenario to begin exploring!                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () => {
    rl.question("\n⊗ ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === "/quit" || trimmed === "/exit") {
        console.log("\n✧ Reality streams converging... Goodbye.\n");
        rl.close();
        process.exit(0);
      }

      if (trimmed === "/help") {
        console.log(`
COMMANDS:
  /branch <scenario>  - Create multiverse from scenario
  /explore <n>        - Deep dive into timeline n (1-4)
  /diff <a> <b>       - Show diff between timelines a and b
  /subbranch <n> <e>  - Branch from timeline n at event e
  /tree               - Show current multiverse map

EXAMPLES:
  "A startup founder is deciding whether to accept acquisition offer"
  "A scientist discovers a dangerous truth about their research"
  "A city faces a critical infrastructure decision"
        `);
        prompt();
        return;
      }

      if (trimmed === "/tree") {
        const analysis = engine.get_latest_analysis();
        if (!analysis) {
          console.log("No multiverse generated yet. Type a scenario to begin.");
        } else {
          console.log(engine.render_tree(analysis));
        }
        prompt();
        return;
      }

      if (trimmed.startsWith("/explore ")) {
        const analysis = engine.get_latest_analysis();
        if (!analysis) {
          console.log("No multiverse generated yet.");
          prompt();
          return;
        }

        const n = parseInt(trimmed.split(" ")[1]) - 1;
        if (n < 0 || n >= analysis.branches.length) {
          console.log("Invalid timeline number.");
          prompt();
          return;
        }

        const branch = analysis.branches[n];
        console.log(`\n═══════════════════════════════════════════════════════════════`);
        console.log(`  ${branch.name.toUpperCase()}`);
        console.log(`═══════════════════════════════════════════════════════════════`);
        console.log(`\nChoice: "${branch.choice_made}"`);
        console.log(`\nTIMELINE OF EVENTS:`);
        branch.events.forEach((event, i) => {
          const tone_icon = event.emotional_tone === "positive" ? "☀" :
                           event.emotional_tone === "negative" ? "☁" :
                           event.emotional_tone === "mixed" ? "⚡" : "○";
          console.log(`  [${event.timestamp}] ${tone_icon} ${event.description}`);
          event.consequences.forEach(c => console.log(`      → ${c}`));
        });
        console.log(`\nFINAL STATE:`);
        console.log(`  ${branch.final_state.summary}`);
        console.log(`\nKEY OUTCOMES:`);
        branch.final_state.key_outcomes.forEach(o => console.log(`  • ${o}`));
        console.log(`\nTHEMES: ${branch.final_state.themes.join(", ")}`);
        console.log(`DIVERGENCE SCORE: ${branch.divergence_score}%`);

        prompt();
        return;
      }

      if (trimmed.startsWith("/diff ")) {
        const analysis = engine.get_latest_analysis();
        if (!analysis) {
          console.log("No multiverse generated yet.");
          prompt();
          return;
        }

        const parts = trimmed.split(" ");
        const a = parseInt(parts[1]) - 1;
        const b = parseInt(parts[2]) - 1;

        // Find the diff between these branches
        const diff = analysis.diffs.find(d =>
          (d.timeline_a === analysis.branches[a]?.name && d.timeline_b === analysis.branches[b]?.name) ||
          (d.timeline_a === analysis.branches[b]?.name && d.timeline_b === analysis.branches[a]?.name)
        );

        if (!diff) {
          console.log("Diff not found for those timelines.");
        } else {
          console.log(engine.render_diff(diff));
        }
        prompt();
        return;
      }

      // Default: treat as scenario
      try {
        let scenario = trimmed;
        if (scenario.startsWith("/branch ")) {
          scenario = scenario.substring(8);
        }

        console.log("\n✧ Fracturing reality across probability space...\n");
        const analysis = await engine.analyze_multiverse(scenario);

        // Show the tree
        console.log(engine.render_tree(analysis));

        // Show key insights
        console.log("\n╔══════════════════════════════════════════════════════════════╗");
        console.log("║  MULTIVERSE ANALYSIS                                         ║");
        console.log("╠══════════════════════════════════════════════════════════════╣");

        console.log("║  CONVERGENCE POINTS (true in ALL timelines):                 ║");
        analysis.convergence_points.slice(0, 3).forEach(cp => {
          console.log(`║    • ${cp.substring(0, 56)}`.padEnd(63) + "║");
        });

        console.log("║                                                              ║");
        console.log("║  BUTTERFLY EFFECTS:                                          ║");
        analysis.butterfly_effects.slice(0, 3).forEach(be => {
          console.log(`║    🦋 ${be.substring(0, 54)}`.padEnd(63) + "║");
        });

        console.log("║                                                              ║");
        console.log(`║  MOST VOLATILE FACTOR:                                       ║`);
        console.log(`║    ${analysis.most_volatile_factor.substring(0, 58)}`.padEnd(63) + "║");

        console.log("╚══════════════════════════════════════════════════════════════╝");

        console.log("\nUse /explore <n> to dive into a specific timeline");
        console.log("Use /diff <a> <b> to compare timelines");

      } catch (error: any) {
        console.error("Error:", error.message);
      }

      prompt();
    });
  };

  prompt();
}

main();
