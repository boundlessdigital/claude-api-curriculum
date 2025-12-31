#!/usr/bin/env bun
/**
 * APP 12: Swarm Intelligence Simulator
 * =====================================
 *
 * A hive-mind system that spawns dozens of micro-agents with minimal individual
 * intelligence, but collectively solves complex problems through emergent behavior.
 *
 * COMPLEXITY: ★★★★★ (Futuristic)
 *
 * Features:
 *   - Spawn 20-100+ micro-agents with simple rules
 *   - Emergent problem-solving through agent interaction
 *   - Pheromone-like communication (shared signal board)
 *   - Ant colony optimization for pathfinding problems
 *   - Particle swarm optimization for search problems
 *   - Genetic algorithm-like mutation of successful strategies
 *   - Real-time visualization of swarm behavior
 *
 * Inspired by:
 *   - Ant colonies finding shortest paths
 *   - Bee swarms making democratic decisions
 *   - Bird flocking behavior (boids)
 *   - Neural network emergent computation
 *
 * Usage:
 *   bun run apps/12_swarm_intelligence.ts
 *   bun run apps/12_swarm_intelligence.ts "Find the optimal solution to..."
 */

import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// Configuration
// ============================================================

const MODEL = "claude-sonnet-4-20250514";
const client = new Anthropic();

const SWARM_CONFIG = {
  min_agents: 20,
  max_agents: 50,
  generations: 10,
  mutation_rate: 0.15,
  pheromone_decay: 0.1,
  communication_range: 3,
  consensus_threshold: 0.7,
};

// ============================================================
// Types
// ============================================================

interface MicroAgent {
  id: string;
  position: number[]; // Position in solution space
  velocity: number[]; // Direction of exploration
  personal_best: Solution | null;
  energy: number; // Activity level
  role: "scout" | "worker" | "messenger" | "queen";
  memory: string[]; // Recent observations
  signals_sent: number;
  signals_received: number;
}

interface Solution {
  id: string;
  content: string;
  fitness: number;
  discovered_by: string; // Agent ID
  generation: number;
  parent_solutions?: string[];
}

interface Pheromone {
  position: number[];
  strength: number;
  type: "success" | "failure" | "interesting" | "danger";
  message: string;
  deposited_by: string;
  timestamp: number;
}

interface SwarmState {
  agents: Map<string, MicroAgent>;
  solutions: Solution[];
  pheromones: Pheromone[];
  global_best: Solution | null;
  generation: number;
  problem: string;
  problem_dimensions: number;
  consensus_forming: boolean;
  collective_knowledge: string[];
}

interface SwarmMetrics {
  total_agents: number;
  active_agents: number;
  solutions_found: number;
  best_fitness: number;
  average_fitness: number;
  consensus_level: number;
  pheromone_density: number;
  exploration_diversity: number;
}

// ============================================================
// Signal Board - Pheromone Communication
// ============================================================

class SignalBoard {
  private pheromones: Pheromone[] = [];
  private decay_rate: number;

  constructor(decay_rate: number = 0.1) {
    this.decay_rate = decay_rate;
  }

  deposit(pheromone: Pheromone): void {
    this.pheromones.push(pheromone);
  }

  read_nearby(position: number[], range: number): Pheromone[] {
    return this.pheromones.filter(p => {
      const distance = this.calculate_distance(position, p.position);
      return distance <= range && p.strength > 0.1;
    });
  }

  decay(): void {
    for (const p of this.pheromones) {
      p.strength *= (1 - this.decay_rate);
    }
    // Remove weak pheromones
    this.pheromones = this.pheromones.filter(p => p.strength > 0.05);
  }

  get_strongest(type: Pheromone["type"]): Pheromone | null {
    const typed = this.pheromones.filter(p => p.type === type);
    if (typed.length === 0) return null;
    return typed.reduce((a, b) => a.strength > b.strength ? a : b);
  }

  private calculate_distance(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  get_all(): Pheromone[] {
    return [...this.pheromones];
  }

  get_density(): number {
    return this.pheromones.reduce((sum, p) => sum + p.strength, 0);
  }
}

// ============================================================
// Swarm Intelligence Engine
// ============================================================

class SwarmIntelligence {
  private state: SwarmState;
  private signal_board: SignalBoard;
  private log_callback: (msg: string) => void;

  constructor(problem: string, log_callback: (msg: string) => void = console.log) {
    this.signal_board = new SignalBoard(SWARM_CONFIG.pheromone_decay);
    this.log_callback = log_callback;

    this.state = {
      agents: new Map(),
      solutions: [],
      pheromones: [],
      global_best: null,
      generation: 0,
      problem,
      problem_dimensions: 5, // Abstract solution space dimensions
      consensus_forming: false,
      collective_knowledge: [],
    };
  }

  async initialize_swarm(count: number): Promise<void> {
    this.log(`🐝 Spawning ${count} micro-agents...`);

    // Determine role distribution
    const queen_count = 1;
    const scout_count = Math.floor(count * 0.2);
    const messenger_count = Math.floor(count * 0.1);
    const worker_count = count - queen_count - scout_count - messenger_count;

    let role_index = 0;
    for (let i = 0; i < count; i++) {
      let role: MicroAgent["role"];
      if (role_index < queen_count) role = "queen";
      else if (role_index < queen_count + scout_count) role = "scout";
      else if (role_index < queen_count + scout_count + messenger_count) role = "messenger";
      else role = "worker";
      role_index++;

      const agent: MicroAgent = {
        id: `agent_${i.toString().padStart(3, "0")}`,
        position: this.random_position(),
        velocity: this.random_velocity(),
        personal_best: null,
        energy: 1.0,
        role,
        memory: [],
        signals_sent: 0,
        signals_received: 0,
      };

      this.state.agents.set(agent.id, agent);
    }

    this.log(`   Roles: ${queen_count} queen, ${scout_count} scouts, ${messenger_count} messengers, ${worker_count} workers`);
  }

  private random_position(): number[] {
    return Array.from({ length: this.state.problem_dimensions }, () => Math.random());
  }

  private random_velocity(): number[] {
    return Array.from({ length: this.state.problem_dimensions }, () => (Math.random() - 0.5) * 0.2);
  }

  async run_generation(): Promise<void> {
    this.state.generation++;
    this.log(`\n🔄 Generation ${this.state.generation}`);

    // Phase 1: Scouts explore
    await this.phase_scouting();

    // Phase 2: Workers refine
    await this.phase_working();

    // Phase 3: Messengers communicate
    await this.phase_messaging();

    // Phase 4: Queen evaluates
    await this.phase_queen_evaluation();

    // Phase 5: Pheromone decay
    this.signal_board.decay();

    // Phase 6: Check for consensus
    await this.check_consensus();

    // Log metrics
    const metrics = this.get_metrics();
    this.log(`   📊 Solutions: ${metrics.solutions_found} | Best: ${metrics.best_fitness.toFixed(3)} | Consensus: ${(metrics.consensus_level * 100).toFixed(1)}%`);
  }

  private async phase_scouting(): Promise<void> {
    const scouts = Array.from(this.state.agents.values()).filter(a => a.role === "scout");
    this.log(`   🔍 ${scouts.length} scouts exploring...`);

    // Scouts explore new areas
    for (const scout of scouts) {
      // Move to new position
      scout.position = scout.position.map((p, i) =>
        Math.max(0, Math.min(1, p + scout.velocity[i] + (Math.random() - 0.5) * 0.3))
      );

      // Generate a solution idea at this position
      const solution = await this.generate_micro_solution(scout, "explore");

      if (solution) {
        this.state.solutions.push(solution);

        // Deposit pheromone if good
        if (solution.fitness > 0.5) {
          this.signal_board.deposit({
            position: [...scout.position],
            strength: solution.fitness,
            type: "interesting",
            message: solution.content.slice(0, 100),
            deposited_by: scout.id,
            timestamp: Date.now(),
          });
          scout.signals_sent++;
        }

        if (!scout.personal_best || solution.fitness > scout.personal_best.fitness) {
          scout.personal_best = solution;
        }
      }
    }
  }

  private async phase_working(): Promise<void> {
    const workers = Array.from(this.state.agents.values()).filter(a => a.role === "worker");
    this.log(`   🔨 ${workers.length} workers refining...`);

    for (const worker of workers) {
      // Read nearby pheromones
      const nearby = this.signal_board.read_nearby(worker.position, SWARM_CONFIG.communication_range);
      worker.signals_received += nearby.length;

      // Move toward strongest pheromone
      const strongest = nearby.filter(p => p.type === "interesting" || p.type === "success")
        .sort((a, b) => b.strength - a.strength)[0];

      if (strongest) {
        // Move toward it
        worker.position = worker.position.map((p, i) =>
          p + (strongest.position[i] - p) * 0.3 + (Math.random() - 0.5) * 0.1
        );
        worker.memory.push(`Followed signal: ${strongest.message.slice(0, 50)}`);
      }

      // Try to improve on existing solutions
      if (this.state.global_best && Math.random() > 0.5) {
        const refined = await this.refine_solution(worker, this.state.global_best);
        if (refined && refined.fitness > this.state.global_best.fitness) {
          this.state.solutions.push(refined);
          this.state.global_best = refined;
          this.log(`   ✨ Worker ${worker.id} improved global best to ${refined.fitness.toFixed(3)}`);
        }
      }
    }
  }

  private async phase_messaging(): Promise<void> {
    const messengers = Array.from(this.state.agents.values()).filter(a => a.role === "messenger");
    this.log(`   📬 ${messengers.length} messengers broadcasting...`);

    for (const messenger of messengers) {
      // Messengers travel across the space spreading information
      messenger.position = this.random_position();

      // Collect knowledge from nearby agents
      const all_agents = Array.from(this.state.agents.values());
      const nearby_agents = all_agents.filter(a =>
        a.id !== messenger.id &&
        this.distance(a.position, messenger.position) < SWARM_CONFIG.communication_range * 2
      );

      // Share the global best with nearby agents
      if (this.state.global_best) {
        for (const agent of nearby_agents) {
          agent.memory.push(`Messenger shared: ${this.state.global_best.content.slice(0, 50)}`);
          agent.signals_received++;
        }
        messenger.signals_sent += nearby_agents.length;

        // Deposit strong pheromone at good solution locations
        this.signal_board.deposit({
          position: [...messenger.position],
          strength: 0.8,
          type: "success",
          message: `Global best: ${this.state.global_best.fitness.toFixed(3)}`,
          deposited_by: messenger.id,
          timestamp: Date.now(),
        });
      }
    }
  }

  private async phase_queen_evaluation(): Promise<void> {
    const queens = Array.from(this.state.agents.values()).filter(a => a.role === "queen");
    this.log(`   👑 Queen evaluating swarm progress...`);

    if (queens.length === 0) return;
    const queen = queens[0];

    // Queen synthesizes collective knowledge
    const recent_solutions = this.state.solutions.slice(-10);
    if (recent_solutions.length === 0) return;

    // Ask AI to synthesize
    const synthesis = await this.queen_synthesis(queen, recent_solutions);

    if (synthesis) {
      this.state.collective_knowledge.push(synthesis.insight);

      // Create a new solution from synthesis
      if (synthesis.new_solution) {
        const solution: Solution = {
          id: `sol_queen_${this.state.generation}`,
          content: synthesis.new_solution,
          fitness: synthesis.estimated_fitness,
          discovered_by: queen.id,
          generation: this.state.generation,
          parent_solutions: recent_solutions.map(s => s.id),
        };
        this.state.solutions.push(solution);

        if (!this.state.global_best || solution.fitness > this.state.global_best.fitness) {
          this.state.global_best = solution;
          this.log(`   👑 Queen discovered new global best: ${solution.fitness.toFixed(3)}`);
        }
      }
    }
  }

  private async check_consensus(): Promise<void> {
    if (!this.state.global_best) return;

    // Count agents converging on similar solutions
    const threshold = 0.2;
    let converged = 0;
    const total = this.state.agents.size;

    for (const [, agent] of this.state.agents) {
      if (agent.personal_best) {
        const similarity = this.solution_similarity(agent.personal_best, this.state.global_best);
        if (similarity > 0.7) converged++;
      }
    }

    const consensus = converged / total;
    if (consensus >= SWARM_CONFIG.consensus_threshold) {
      this.state.consensus_forming = true;
      this.log(`   🎯 CONSENSUS FORMING: ${(consensus * 100).toFixed(1)}% of swarm converging!`);
    }
  }

  private async generate_micro_solution(agent: MicroAgent, mode: "explore" | "refine"): Promise<Solution | null> {
    // Micro-agents have very simple, fast prompts
    const position_desc = `position [${agent.position.map(p => p.toFixed(2)).join(", ")}]`;

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: `You are a micro-agent in a swarm solving: "${this.state.problem}"
Your role is ${agent.role}. Be extremely concise.
Recent memory: ${agent.memory.slice(-3).join("; ") || "none"}`,
        messages: [{
          role: "user",
          content: mode === "explore"
            ? `At ${position_desc}, propose ONE brief idea (1-2 sentences) for solving this problem.`
            : `Slightly modify this solution: "${this.state.global_best?.content.slice(0, 100)}"`,
        }],
      });

      const content = response.content[0].type === "text" ? response.content[0].text : "";

      // Simple fitness heuristic based on response
      const fitness = this.evaluate_fitness(content);

      return {
        id: `sol_${agent.id}_${Date.now()}`,
        content,
        fitness,
        discovered_by: agent.id,
        generation: this.state.generation,
      };
    } catch {
      return null;
    }
  }

  private async refine_solution(agent: MicroAgent, base: Solution): Promise<Solution | null> {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: `You are a worker micro-agent refining solutions for: "${this.state.problem}"
Make small, targeted improvements.`,
        messages: [{
          role: "user",
          content: `Improve this solution slightly (keep it brief):
"${base.content}"

One specific improvement:`,
        }],
      });

      const content = response.content[0].type === "text" ? response.content[0].text : "";
      const fitness = this.evaluate_fitness(content);

      return {
        id: `sol_${agent.id}_refined_${Date.now()}`,
        content,
        fitness,
        discovered_by: agent.id,
        generation: this.state.generation,
        parent_solutions: [base.id],
      };
    } catch {
      return null;
    }
  }

  private async queen_synthesis(
    queen: MicroAgent,
    solutions: Solution[]
  ): Promise<{ insight: string; new_solution?: string; estimated_fitness: number } | null> {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: `You are the Queen of a swarm intelligence solving: "${this.state.problem}"
Synthesize the collective wisdom of your agents into insights and improved solutions.`,
        messages: [{
          role: "user",
          content: `Recent solutions from the swarm:
${solutions.map(s => `- [fitness ${s.fitness.toFixed(2)}] ${s.content}`).join("\n")}

Collective knowledge so far: ${this.state.collective_knowledge.slice(-3).join("; ") || "none"}

As the Queen, provide:
1. One key insight from these solutions
2. A synthesized improved solution (1-2 sentences)
3. Estimated fitness (0.0 to 1.0)

Format:
INSIGHT: ...
SOLUTION: ...
FITNESS: ...`,
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";

      const insight_match = text.match(/INSIGHT:\s*(.+)/i);
      const solution_match = text.match(/SOLUTION:\s*(.+)/i);
      const fitness_match = text.match(/FITNESS:\s*([\d.]+)/i);

      return {
        insight: insight_match?.[1] || "No insight extracted",
        new_solution: solution_match?.[1],
        estimated_fitness: fitness_match ? parseFloat(fitness_match[1]) : 0.5,
      };
    } catch {
      return null;
    }
  }

  private evaluate_fitness(solution: string): number {
    // Heuristic fitness based on solution characteristics
    let score = 0.3; // Base score

    // Length bonus (too short or too long is bad)
    const len = solution.length;
    if (len > 50 && len < 500) score += 0.2;

    // Specificity bonus (contains numbers, specific terms)
    if (/\d/.test(solution)) score += 0.1;
    if (/step|first|then|next|finally/i.test(solution)) score += 0.15;
    if (/because|therefore|since|thus/i.test(solution)) score += 0.1;

    // Problem relevance (check for keywords from problem)
    const problem_words = this.state.problem.toLowerCase().split(/\s+/);
    const solution_lower = solution.toLowerCase();
    const matches = problem_words.filter(w => w.length > 3 && solution_lower.includes(w));
    score += Math.min(0.2, matches.length * 0.05);

    // Add some randomness (simulate uncertainty)
    score += (Math.random() - 0.5) * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private solution_similarity(a: Solution, b: Solution): number {
    // Simple word overlap similarity
    const words_a = new Set(a.content.toLowerCase().split(/\s+/));
    const words_b = new Set(b.content.toLowerCase().split(/\s+/));
    const intersection = new Set([...words_a].filter(w => words_b.has(w)));
    const union = new Set([...words_a, ...words_b]);
    return intersection.size / union.size;
  }

  private distance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  private log(msg: string): void {
    this.log_callback(msg);
  }

  get_metrics(): SwarmMetrics {
    const agents = Array.from(this.state.agents.values());
    const solutions = this.state.solutions;

    const fitnesses = solutions.map(s => s.fitness);
    const avg_fitness = fitnesses.length > 0
      ? fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
      : 0;

    // Calculate exploration diversity (spread of agent positions)
    const positions = agents.map(a => a.position);
    let diversity = 0;
    if (positions.length > 1) {
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          diversity += this.distance(positions[i], positions[j]);
        }
      }
      diversity /= (positions.length * (positions.length - 1) / 2);
    }

    // Consensus level
    let converged = 0;
    if (this.state.global_best) {
      for (const agent of agents) {
        if (agent.personal_best) {
          const sim = this.solution_similarity(agent.personal_best, this.state.global_best);
          if (sim > 0.7) converged++;
        }
      }
    }

    return {
      total_agents: agents.length,
      active_agents: agents.filter(a => a.energy > 0.1).length,
      solutions_found: solutions.length,
      best_fitness: this.state.global_best?.fitness || 0,
      average_fitness: avg_fitness,
      consensus_level: this.state.global_best ? converged / agents.length : 0,
      pheromone_density: this.signal_board.get_density(),
      exploration_diversity: diversity,
    };
  }

  get_state(): SwarmState {
    return this.state;
  }

  get_global_best(): Solution | null {
    return this.state.global_best;
  }

  get_collective_knowledge(): string[] {
    return this.state.collective_knowledge;
  }
}

// ============================================================
// Visualization
// ============================================================

function visualize_swarm(state: SwarmState, metrics: SwarmMetrics): void {
  const width = 60;
  const height = 20;
  const grid: string[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => "·")
  );

  // Plot agents
  for (const [, agent] of state.agents) {
    const x = Math.floor(agent.position[0] * (width - 1));
    const y = Math.floor(agent.position[1] * (height - 1));

    let symbol: string;
    switch (agent.role) {
      case "queen": symbol = "♛"; break;
      case "scout": symbol = "◆"; break;
      case "messenger": symbol = "◇"; break;
      default: symbol = "•";
    }

    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[y][x] = symbol;
    }
  }

  // Print grid
  console.log("\n┌" + "─".repeat(width) + "┐");
  for (const row of grid) {
    console.log("│" + row.join("") + "│");
  }
  console.log("└" + "─".repeat(width) + "┘");

  // Legend
  console.log("  ♛ Queen  ◆ Scout  ◇ Messenger  • Worker");
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║           🐝 S W A R M   I N T E L L I G E N C E 🐝              ║
║                                                                   ║
║          Emergent Problem-Solving through Micro-Agents            ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  const problem = process.argv[2] ||
    "Design a sustainable city transportation system that minimizes emissions while maximizing accessibility";

  console.log(`📋 Problem: "${problem}"\n`);

  const swarm = new SwarmIntelligence(problem);

  // Initialize swarm
  const agent_count = SWARM_CONFIG.min_agents + Math.floor(Math.random() * (SWARM_CONFIG.max_agents - SWARM_CONFIG.min_agents));
  await swarm.initialize_swarm(agent_count);

  // Run generations
  console.log(`\n🚀 Starting swarm evolution for ${SWARM_CONFIG.generations} generations...\n`);

  for (let gen = 0; gen < SWARM_CONFIG.generations; gen++) {
    await swarm.run_generation();

    // Visualize every 3 generations
    if ((gen + 1) % 3 === 0) {
      visualize_swarm(swarm.get_state(), swarm.get_metrics());
    }

    // Check for early consensus
    const state = swarm.get_state();
    if (state.consensus_forming && gen > 3) {
      console.log("\n🎯 Early consensus reached! Stopping evolution.");
      break;
    }
  }

  // Final results
  console.log("\n" + "═".repeat(70));
  console.log("🏆 SWARM INTELLIGENCE RESULTS");
  console.log("═".repeat(70));

  const metrics = swarm.get_metrics();
  console.log(`\n📊 Final Metrics:`);
  console.log(`   • Total Agents: ${metrics.total_agents}`);
  console.log(`   • Solutions Generated: ${metrics.solutions_found}`);
  console.log(`   • Best Fitness: ${metrics.best_fitness.toFixed(3)}`);
  console.log(`   • Average Fitness: ${metrics.average_fitness.toFixed(3)}`);
  console.log(`   • Consensus Level: ${(metrics.consensus_level * 100).toFixed(1)}%`);
  console.log(`   • Exploration Diversity: ${metrics.exploration_diversity.toFixed(3)}`);

  const best = swarm.get_global_best();
  if (best) {
    console.log(`\n🏆 Best Solution (fitness: ${best.fitness.toFixed(3)}):`);
    console.log(`   "${best.content}"`);
    console.log(`   Discovered by: ${best.discovered_by} in generation ${best.generation}`);
  }

  const knowledge = swarm.get_collective_knowledge();
  if (knowledge.length > 0) {
    console.log(`\n💡 Collective Insights:`);
    for (const insight of knowledge.slice(-5)) {
      console.log(`   • ${insight}`);
    }
  }

  // Final visualization
  console.log("\n📍 Final Swarm Distribution:");
  visualize_swarm(swarm.get_state(), metrics);

  console.log("\n✅ Swarm intelligence simulation complete!\n");
}

main().catch(console.error);
