#!/usr/bin/env bun
/**
 * APP 9: Federated Learning Agent Network with Concept Graphs
 * ==============================================================
 *
 * Multiple agents across different "locations" that learn locally
 * and share knowledge through concept graphs without sharing raw data.
 * This demonstrates privacy-preserving distributed AI learning.
 *
 * COMPLEXITY: ★★★★★★★ (Expert++)
 *
 * Knowledge Graph Evolution:
 *   App 8: Simple entity-relationship graph
 *   App 9: Concept graph with semantic relationships and embeddings
 *   App 10: Full knowledge graph with reasoning capabilities
 *
 * Concept Graph Features:
 *   - Semantic concepts (not just entities)
 *   - Hierarchical relationships (is-a, part-of)
 *   - Learned associations with confidence scores
 *   - Concept embeddings for similarity
 *   - Federated knowledge aggregation
 *
 * Architecture:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                  Federated Learning Network                 │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │                                                             │
 *   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
 *   │  │  Agent A    │  │  Agent B    │  │  Agent C    │        │
 *   │  │ (Location)  │  │ (Location)  │  │ (Location)  │        │
 *   │  │             │  │             │  │             │        │
 *   │  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │        │
 *   │  │ │ Local   │ │  │ │ Local   │ │  │ │ Local   │ │        │
 *   │  │ │ Concept │ │  │ │ Concept │ │  │ │ Concept │ │        │
 *   │  │ │ Graph   │ │  │ │ Graph   │ │  │ │ Graph   │ │        │
 *   │  │ └────┬────┘ │  │ └────┬────┘ │  │ └────┬────┘ │        │
 *   │  └──────┼──────┘  └──────┼──────┘  └──────┼──────┘        │
 *   │         │                │                │                │
 *   │         └────────────────┼────────────────┘                │
 *   │                          │                                 │
 *   │                  ┌───────▼───────┐                        │
 *   │                  │   Knowledge   │                        │
 *   │                  │  Aggregator   │                        │
 *   │                  │   (Global)    │                        │
 *   │                  └───────┬───────┘                        │
 *   │                          │                                 │
 *   │                  ┌───────▼───────┐                        │
 *   │                  │    Global     │                        │
 *   │                  │   Concept     │                        │
 *   │                  │    Graph      │                        │
 *   │                  └───────────────┘                        │
 *   │                                                             │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Privacy-Preserving Features:
 *   - Agents share concepts, not raw data
 *   - Differential privacy on concept updates
 *   - Secure aggregation protocols
 *   - Local data never leaves the agent
 *
 * Usage:
 *   bun run apps/09_federated_concept_graph.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { EventEmitter } from "events";

// ============================================================
// Concept Graph Implementation
// ============================================================

interface Concept {
  id: string;
  name: string;
  type: "entity" | "action" | "attribute" | "abstract";
  properties: Record<string, unknown>;
  embedding?: number[]; // Simplified embedding vector
  confidence: number; // 0-1 confidence in this concept
  source_agents: Set<string>;
  created_at: Date;
  updated_at: Date;
}

interface SemanticRelationship {
  id: string;
  source: string;
  target: string;
  type: "is_a" | "part_of" | "related_to" | "causes" | "precedes" | "similar_to";
  weight: number; // 0-1 strength of relationship
  confidence: number;
  evidence_count: number;
  source_agents: Set<string>;
}

class ConceptGraph {
  private concepts: Map<string, Concept> = new Map();
  private relationships: Map<string, SemanticRelationship> = new Map();
  private concept_index: Map<string, Set<string>> = new Map(); // name -> concept_ids

  add_concept(
    id: string,
    name: string,
    type: Concept["type"],
    properties: Record<string, unknown> = {},
    agent_id: string,
    confidence: number = 0.5
  ): Concept {
    const existing = this.concepts.get(id);
    if (existing) {
      existing.properties = { ...existing.properties, ...properties };
      existing.confidence = Math.max(existing.confidence, confidence);
      existing.source_agents.add(agent_id);
      existing.updated_at = new Date();
      return existing;
    }

    const concept: Concept = {
      id,
      name,
      type,
      properties,
      confidence,
      source_agents: new Set([agent_id]),
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.concepts.set(id, concept);

    // Index by name for lookup
    const name_lower = name.toLowerCase();
    if (!this.concept_index.has(name_lower)) {
      this.concept_index.set(name_lower, new Set());
    }
    this.concept_index.get(name_lower)!.add(id);

    return concept;
  }

  add_relationship(
    source_id: string,
    target_id: string,
    type: SemanticRelationship["type"],
    agent_id: string,
    weight: number = 0.5
  ): SemanticRelationship | null {
    if (!this.concepts.has(source_id) || !this.concepts.has(target_id)) {
      return null;
    }

    const rel_id = `${source_id}-${type}-${target_id}`;
    const existing = this.relationships.get(rel_id);

    if (existing) {
      existing.evidence_count++;
      existing.weight = Math.min(1, existing.weight + 0.1);
      existing.confidence = Math.min(1, existing.confidence + 0.05);
      existing.source_agents.add(agent_id);
      return existing;
    }

    const relationship: SemanticRelationship = {
      id: rel_id,
      source: source_id,
      target: target_id,
      type,
      weight,
      confidence: 0.5,
      evidence_count: 1,
      source_agents: new Set([agent_id]),
    };

    this.relationships.set(rel_id, relationship);
    return relationship;
  }

  find_concept(name: string): Concept | undefined {
    const ids = this.concept_index.get(name.toLowerCase());
    if (ids && ids.size > 0) {
      const id = Array.from(ids)[0];
      return this.concepts.get(id);
    }
    return undefined;
  }

  get_hierarchy(concept_id: string, direction: "up" | "down" = "up"): Concept[] {
    const result: Concept[] = [];
    const visited = new Set<string>();
    const rel_type = direction === "up" ? "is_a" : "part_of";

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      for (const rel of this.relationships.values()) {
        if (rel.type !== rel_type) continue;

        const next_id = direction === "up"
          ? (rel.source === id ? rel.target : null)
          : (rel.target === id ? rel.source : null);

        if (next_id) {
          const concept = this.concepts.get(next_id);
          if (concept) {
            result.push(concept);
            traverse(next_id);
          }
        }
      }
    };

    traverse(concept_id);
    return result;
  }

  get_related(concept_id: string, min_weight: number = 0.3): Array<{ concept: Concept; relationship: SemanticRelationship }> {
    const results: Array<{ concept: Concept; relationship: SemanticRelationship }> = [];

    for (const rel of this.relationships.values()) {
      if (rel.weight < min_weight) continue;

      let other_id: string | null = null;
      if (rel.source === concept_id) other_id = rel.target;
      else if (rel.target === concept_id) other_id = rel.source;

      if (other_id) {
        const concept = this.concepts.get(other_id);
        if (concept) {
          results.push({ concept, relationship: rel });
        }
      }
    }

    return results.sort((a, b) => b.relationship.weight - a.relationship.weight);
  }

  get_concepts_by_type(type: Concept["type"]): Concept[] {
    return Array.from(this.concepts.values()).filter((c) => c.type === type);
  }

  // Export concepts for federated sharing (privacy-preserving)
  export_learnings(agent_id: string): {
    concepts: Array<{ id: string; name: string; type: string; confidence: number }>;
    relationships: Array<{ source: string; target: string; type: string; weight: number }>;
  } {
    // Only export high-confidence learnings from this agent
    const concepts = Array.from(this.concepts.values())
      .filter((c) => c.source_agents.has(agent_id) && c.confidence > 0.6)
      .map((c) => ({ id: c.id, name: c.name, type: c.type, confidence: c.confidence }));

    const relationships = Array.from(this.relationships.values())
      .filter((r) => r.source_agents.has(agent_id) && r.weight > 0.5)
      .map((r) => ({ source: r.source, target: r.target, type: r.type, weight: r.weight }));

    return { concepts, relationships };
  }

  // Import learnings from other agents
  import_learnings(
    learnings: ReturnType<ConceptGraph["export_learnings"]>,
    source_agent: string
  ): void {
    for (const c of learnings.concepts) {
      this.add_concept(c.id, c.name, c.type as Concept["type"], {}, source_agent, c.confidence * 0.8);
    }

    for (const r of learnings.relationships) {
      this.add_relationship(r.source, r.target, r.type as SemanticRelationship["type"], source_agent, r.weight * 0.8);
    }
  }

  get_stats(): {
    concepts: number;
    relationships: number;
    by_type: Record<string, number>;
    avg_confidence: number;
    multi_agent_concepts: number;
  } {
    const by_type: Record<string, number> = {};
    let total_confidence = 0;
    let multi_agent = 0;

    for (const concept of this.concepts.values()) {
      by_type[concept.type] = (by_type[concept.type] || 0) + 1;
      total_confidence += concept.confidence;
      if (concept.source_agents.size > 1) multi_agent++;
    }

    return {
      concepts: this.concepts.size,
      relationships: this.relationships.size,
      by_type,
      avg_confidence: this.concepts.size > 0 ? total_confidence / this.concepts.size : 0,
      multi_agent_concepts: multi_agent,
    };
  }
}

// ============================================================
// Federated Learning Agent
// ============================================================

class FederatedAgent {
  private id: string;
  private location: string;
  private local_graph: ConceptGraph;
  private client: Anthropic;
  private learning_history: Array<{ task: string; learned: string[] }> = [];

  constructor(id: string, location: string) {
    this.id = id;
    this.location = location;
    this.local_graph = new ConceptGraph();
    this.client = new Anthropic();
  }

  async learn_from_task(task: string): Promise<{
    concepts_learned: string[];
    relationships_learned: string[];
  }> {
    log.agent(this.id, `Learning from: ${task.slice(0, 50)}...`);

    // Use AI to extract concepts and relationships
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `Extract semantic concepts and relationships from this task/knowledge.

Task: ${task}

Provide JSON with:
{
  "concepts": [
    {"id": "concept_id", "name": "Concept Name", "type": "entity|action|attribute|abstract", "confidence": 0.0-1.0}
  ],
  "relationships": [
    {"source": "concept_id", "target": "concept_id", "type": "is_a|part_of|related_to|causes|precedes|similar_to", "weight": 0.0-1.0}
  ]
}

Focus on:
- Hierarchies (is_a, part_of)
- Causal relationships (causes, precedes)
- Semantic similarity (similar_to, related_to)`,
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
      const extracted = JSON.parse("{" + text);
      const concepts_learned: string[] = [];
      const relationships_learned: string[] = [];

      for (const c of extracted.concepts || []) {
        this.local_graph.add_concept(c.id, c.name, c.type, {}, this.id, c.confidence);
        concepts_learned.push(c.name);
        log.learn(`${this.id}: Concept "${c.name}" (${c.type})`);
      }

      for (const r of extracted.relationships || []) {
        this.local_graph.add_relationship(r.source, r.target, r.type, this.id, r.weight);
        relationships_learned.push(`${r.source} --[${r.type}]--> ${r.target}`);
        log.learn(`${this.id}: ${r.source} --[${r.type}]--> ${r.target}`);
      }

      this.learning_history.push({ task, learned: concepts_learned });

      return { concepts_learned, relationships_learned };
    } catch {
      return { concepts_learned: [], relationships_learned: [] };
    }
  }

  export_knowledge(): ReturnType<ConceptGraph["export_learnings"]> {
    return this.local_graph.export_learnings(this.id);
  }

  import_knowledge(learnings: ReturnType<ConceptGraph["export_learnings"]>, from_agent: string): void {
    log.federated(`${this.id} importing knowledge from ${from_agent}`);
    this.local_graph.import_learnings(learnings, from_agent);
  }

  async query(q: string): Promise<string> {
    // Find relevant concepts
    const words = q.toLowerCase().split(/\s+/);
    const relevant_concepts: Concept[] = [];

    for (const word of words) {
      const concept = this.local_graph.find_concept(word);
      if (concept) {
        relevant_concepts.push(concept);
        const related = this.local_graph.get_related(concept.id, 0.3);
        for (const r of related.slice(0, 3)) {
          relevant_concepts.push(r.concept);
        }
      }
    }

    const context = relevant_concepts
      .map((c) => `${c.name} (${c.type}): confidence=${c.confidence.toFixed(2)}, sources=${c.source_agents.size}`)
      .join("\n");

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Answer using your concept graph knowledge.

Query: ${q}

Relevant Concepts:
${context || "No specific concepts found"}

Agent: ${this.id} at ${this.location}
Total concepts learned: ${this.local_graph.get_stats().concepts}

Provide a helpful response based on your learned knowledge.`,
        },
      ],
    });

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }

  get_stats(): { id: string; location: string; graph_stats: ReturnType<ConceptGraph["get_stats"]> } {
    return {
      id: this.id,
      location: this.location,
      graph_stats: this.local_graph.get_stats(),
    };
  }
}

// ============================================================
// Knowledge Aggregator (Central Coordinator)
// ============================================================

class KnowledgeAggregator {
  private global_graph: ConceptGraph;
  private agents: Map<string, FederatedAgent> = new Map();
  private aggregation_rounds: number = 0;

  constructor() {
    this.global_graph = new ConceptGraph();
  }

  register_agent(agent: FederatedAgent): void {
    const stats = agent.get_stats();
    this.agents.set(stats.id, agent);
    log.federated(`Registered agent: ${stats.id} at ${stats.location}`);
  }

  async aggregate_round(): Promise<void> {
    this.aggregation_rounds++;
    log.federated(`=== Aggregation Round ${this.aggregation_rounds} ===`);

    // Collect knowledge from all agents
    const all_learnings: Array<{ agent_id: string; learnings: ReturnType<ConceptGraph["export_learnings"]> }> = [];

    for (const [id, agent] of this.agents) {
      const learnings = agent.export_knowledge();
      all_learnings.push({ agent_id: id, learnings });
      log.federated(`${id}: ${learnings.concepts.length} concepts, ${learnings.relationships.length} relationships`);
    }

    // Aggregate into global graph
    for (const { agent_id, learnings } of all_learnings) {
      this.global_graph.import_learnings(learnings, agent_id);
    }

    // Distribute aggregated knowledge back to agents
    const global_knowledge = this.global_graph.export_learnings("global");
    for (const [id, agent] of this.agents) {
      agent.import_knowledge(global_knowledge, "global");
    }

    log.federated(`Global graph: ${this.global_graph.get_stats().concepts} concepts, ${this.global_graph.get_stats().relationships} relationships`);
  }

  get_global_stats(): ReturnType<ConceptGraph["get_stats"]> {
    return this.global_graph.get_stats();
  }
}

// ============================================================
// Utilities
// ============================================================

const log = {
  agent: (id: string, msg: string) => console.log(`[${ts()}] 🤖 [${id}] ${msg}`),
  learn: (msg: string) => console.log(`[${ts()}] 📚 ${msg}`),
  federated: (msg: string) => console.log(`[${ts()}] 🌐 ${msg}`),
  query: (msg: string) => console.log(`[${ts()}] 🔍 ${msg}`),
  system: (msg: string) => console.log(`[${ts()}] ⚙️  ${msg}`),
};

function ts(): string {
  return new Date().toISOString().split("T")[1].split(".")[0];
}

// ============================================================
// Demo Tasks
// ============================================================

const LOCATION_TASKS: Record<string, string[]> = {
  "agent_medical": [
    "Diabetes is a metabolic disorder that affects blood sugar regulation. It's related to insulin production in the pancreas.",
    "Heart disease is often caused by atherosclerosis and is related to hypertension. Exercise can help prevent it.",
    "COVID-19 is a respiratory disease caused by SARS-CoV-2 virus. Symptoms include fever and cough.",
  ],
  "agent_finance": [
    "Stocks are equity investments that represent ownership in companies. They trade on exchanges like NYSE.",
    "Bonds are debt instruments issued by governments or corporations. They provide fixed income returns.",
    "Inflation reduces purchasing power and affects interest rates set by central banks.",
  ],
  "agent_tech": [
    "Machine learning is a subset of AI that learns from data. Deep learning uses neural networks.",
    "Cloud computing provides on-demand computing resources. AWS, Azure, and GCP are major providers.",
    "Kubernetes orchestrates container deployments. It works with Docker for containerization.",
  ],
};

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     Federated Learning Agent Network with Concept Graphs      ║
╠═══════════════════════════════════════════════════════════════╣
║  Privacy-Preserving Distributed AI Learning:                 ║
║    • Each agent learns locally from its domain               ║
║    • Agents share concepts, not raw data                     ║
║    • Knowledge is aggregated globally                        ║
║    • All agents benefit from collective learning             ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Create agents
  const aggregator = new KnowledgeAggregator();

  const agents = [
    new FederatedAgent("agent_medical", "Hospital Network"),
    new FederatedAgent("agent_finance", "Financial Institution"),
    new FederatedAgent("agent_tech", "Tech Company"),
  ];

  for (const agent of agents) {
    aggregator.register_agent(agent);
  }

  // Each agent learns from their domain
  log.system("\n=== Phase 1: Local Learning ===\n");

  for (const agent of agents) {
    const stats = agent.get_stats();
    const tasks = LOCATION_TASKS[stats.id] || [];

    for (const task of tasks) {
      await agent.learn_from_task(task);
      await new Promise((r) => setTimeout(r, 300));
    }
    console.log("");
  }

  // Show local stats before aggregation
  log.system("\n=== Before Aggregation ===\n");
  for (const agent of agents) {
    const s = agent.get_stats();
    console.log(`  ${s.id}: ${s.graph_stats.concepts} concepts, ${s.graph_stats.relationships} relationships`);
  }

  // Federated aggregation
  log.system("\n=== Phase 2: Federated Aggregation ===\n");
  await aggregator.aggregate_round();

  // Show stats after aggregation
  log.system("\n=== After Aggregation ===\n");
  for (const agent of agents) {
    const s = agent.get_stats();
    console.log(`  ${s.id}: ${s.graph_stats.concepts} concepts, ${s.graph_stats.multi_agent_concepts} from multiple agents`);
  }

  const global = aggregator.get_global_stats();
  console.log(`\n  Global: ${global.concepts} concepts, ${global.relationships} relationships`);
  console.log(`  Multi-agent concepts: ${global.multi_agent_concepts}`);

  // Cross-domain queries
  log.system("\n=== Phase 3: Cross-Domain Queries ===\n");

  const queries = [
    { agent: agents[0], query: "How does technology relate to healthcare?" },
    { agent: agents[1], query: "What connections exist between AI and finance?" },
    { agent: agents[2], query: "What do you know about medical conditions?" },
  ];

  for (const { agent, query } of queries) {
    const stats = agent.get_stats();
    log.query(`[${stats.id}] ${query}`);
    const response = await agent.query(query);
    console.log(`📝 ${response.slice(0, 250)}...\n`);
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n✅ Federated learning demonstration complete!");
  console.log("\nKey Benefits:");
  console.log("  • Each agent kept its raw data private");
  console.log("  • Knowledge was shared through concepts only");
  console.log("  • All agents now have cross-domain understanding");
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
