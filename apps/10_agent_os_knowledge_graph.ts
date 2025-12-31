#!/usr/bin/env bun
/**
 * APP 10: AI Agent Operating System with Full Knowledge Graph
 * =============================================================
 *
 * A meta-system that spawns, manages, and orchestrates AI agents
 * using a comprehensive knowledge graph for context retrieval,
 * reasoning, and adaptive behavior.
 *
 * COMPLEXITY: ★★★★★★★★ (Expert+++)
 *
 * Knowledge Graph Evolution (Complete):
 *   App 8: Simple entity-relationship graph
 *   App 9: Concept graph with semantic relationships
 *   App 10: Full KG with reasoning, RAG, and temporal awareness
 *
 * Full Knowledge Graph Features:
 *   - Ontology-based reasoning (inheritance, inference)
 *   - Temporal relationships (events over time)
 *   - Provenance tracking (source of knowledge)
 *   - Confidence decay (knowledge freshness)
 *   - RAG integration (retrieval-augmented generation)
 *   - Rule-based inference engine
 *   - Graph-based context window management
 *
 * Architecture:
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │                    AI Agent Operating System                    │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │                                                                 │
 *   │  ┌───────────────────────────────────────────────────────────┐ │
 *   │  │                    Knowledge Graph Core                    │ │
 *   │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
 *   │  │  │ Ontology │  │ Temporal │  │Provenance│  │Inference │  │ │
 *   │  │  │  Layer   │  │  Layer   │  │  Layer   │  │  Engine  │  │ │
 *   │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
 *   │  └───────────────────────────────────────────────────────────┘ │
 *   │                              │                                  │
 *   │  ┌───────────────────────────▼───────────────────────────────┐ │
 *   │  │                     Agent Scheduler                        │ │
 *   │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
 *   │  │  │ Spawner  │  │ Monitor  │  │ Balancer │  │ Recycler │  │ │
 *   │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
 *   │  └───────────────────────────────────────────────────────────┘ │
 *   │                              │                                  │
 *   │         ┌────────────────────┼────────────────────┐            │
 *   │         │                    │                    │            │
 *   │  ┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐    │
 *   │  │   Agent 1   │      │   Agent 2   │      │   Agent N   │    │
 *   │  │ (with KG    │      │ (with KG    │      │ (with KG    │    │
 *   │  │  context)   │      │  context)   │      │  context)   │    │
 *   │  └─────────────┘      └─────────────┘      └─────────────┘    │
 *   │                                                                 │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * Recommended Libraries:
 *   - Graphology (https://graphology.github.io/) - Graph data structure
 *   - Sigma.js - Visualization (TypeScript native)
 *   - Neo4j (production) - Enterprise graph database
 *
 * Usage:
 *   bun run apps/10_agent_os_knowledge_graph.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { EventEmitter } from "events";

// ============================================================
// Types
// ============================================================

interface KGNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
  ontology_class?: string; // For inheritance/reasoning
  confidence: number;
  created_at: Date;
  updated_at: Date;
  valid_from?: Date; // Temporal validity
  valid_until?: Date;
  provenance: {
    source: string;
    method: "direct" | "inferred" | "aggregated";
    evidence: string[];
  };
}

interface KGEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
  weight: number;
  confidence: number;
  temporal?: {
    start: Date;
    end?: Date;
  };
  provenance: {
    source: string;
    inferred: boolean;
  };
}

interface InferenceRule {
  id: string;
  name: string;
  condition: (graph: FullKnowledgeGraph, node: KGNode) => boolean;
  inference: (graph: FullKnowledgeGraph, node: KGNode) => { nodes: Partial<KGNode>[]; edges: Partial<KGEdge>[] };
}

interface AgentContext {
  relevant_nodes: KGNode[];
  relevant_edges: KGEdge[];
  inferred_facts: string[];
  temporal_context: string;
  confidence_summary: number;
}

// ============================================================
// Full Knowledge Graph Implementation
// ============================================================

class FullKnowledgeGraph {
  private nodes: Map<string, KGNode> = new Map();
  private edges: Map<string, KGEdge> = new Map();
  private adjacency: Map<string, Set<string>> = new Map();
  private inference_rules: InferenceRule[] = [];
  private ontology: Map<string, Set<string>> = new Map(); // class -> parent classes

  constructor() {
    this.setup_default_ontology();
    this.setup_inference_rules();
  }

  private setup_default_ontology(): void {
    // Define class hierarchy
    this.ontology.set("Person", new Set(["Entity"]));
    this.ontology.set("Organization", new Set(["Entity"]));
    this.ontology.set("Location", new Set(["Entity"]));
    this.ontology.set("Event", new Set(["Entity"]));
    this.ontology.set("Concept", new Set(["Entity"]));
    this.ontology.set("Agent", new Set(["Entity", "Actor"]));
    this.ontology.set("Task", new Set(["Event"]));
    this.ontology.set("Document", new Set(["Entity"]));
  }

  private setup_inference_rules(): void {
    // Transitive closure for "is_a" relationships
    this.inference_rules.push({
      id: "transitive_is_a",
      name: "Transitive IS-A Inheritance",
      condition: (graph, node) => {
        const parents = graph.get_parents(node.id, "is_a");
        return parents.some((p) => graph.get_parents(p.id, "is_a").length > 0);
      },
      inference: (graph, node) => {
        const grandparents = graph.get_parents(node.id, "is_a")
          .flatMap((p) => graph.get_parents(p.id, "is_a"));

        return {
          nodes: [],
          edges: grandparents.map((gp) => ({
            source: node.id,
            target: gp.id,
            type: "is_a",
            provenance: { source: "inference", inferred: true },
          })),
        };
      },
    });

    // Temporal inference: if event A precedes B and B precedes C, then A precedes C
    this.inference_rules.push({
      id: "transitive_precedes",
      name: "Transitive Temporal Precedence",
      condition: (graph, node) => {
        const after = graph.get_edges_from(node.id).filter((e) => e.type === "precedes");
        return after.some((e) => graph.get_edges_from(e.target).some((e2) => e2.type === "precedes"));
      },
      inference: (graph, node) => {
        const after = graph.get_edges_from(node.id).filter((e) => e.type === "precedes");
        const transitive: Partial<KGEdge>[] = [];

        for (const e of after) {
          const after_after = graph.get_edges_from(e.target).filter((e2) => e2.type === "precedes");
          for (const e2 of after_after) {
            transitive.push({
              source: node.id,
              target: e2.target,
              type: "precedes",
              provenance: { source: "inference", inferred: true },
            });
          }
        }

        return { nodes: [], edges: transitive };
      },
    });
  }

  add_node(
    id: string,
    type: string,
    label: string,
    properties: Record<string, unknown> = {},
    options: {
      ontology_class?: string;
      confidence?: number;
      provenance?: KGNode["provenance"];
      valid_from?: Date;
      valid_until?: Date;
    } = {}
  ): KGNode {
    const existing = this.nodes.get(id);
    if (existing) {
      existing.properties = { ...existing.properties, ...properties };
      existing.updated_at = new Date();
      if (options.confidence !== undefined) {
        existing.confidence = Math.max(existing.confidence, options.confidence);
      }
      return existing;
    }

    const node: KGNode = {
      id,
      type,
      label,
      properties,
      ontology_class: options.ontology_class || type,
      confidence: options.confidence || 0.8,
      created_at: new Date(),
      updated_at: new Date(),
      valid_from: options.valid_from,
      valid_until: options.valid_until,
      provenance: options.provenance || { source: "direct", method: "direct", evidence: [] },
    };

    this.nodes.set(id, node);
    this.adjacency.set(id, new Set());
    return node;
  }

  add_edge(
    source: string,
    target: string,
    type: string,
    properties: Record<string, unknown> = {},
    options: {
      weight?: number;
      confidence?: number;
      temporal?: KGEdge["temporal"];
      provenance?: KGEdge["provenance"];
    } = {}
  ): KGEdge | null {
    if (!this.nodes.has(source) || !this.nodes.has(target)) {
      return null;
    }

    const edge_id = `${source}-${type}-${target}`;
    const existing = this.edges.get(edge_id);

    if (existing) {
      existing.properties = { ...existing.properties, ...properties };
      existing.weight = Math.min(1, existing.weight + 0.1);
      return existing;
    }

    const edge: KGEdge = {
      id: edge_id,
      source,
      target,
      type,
      properties,
      weight: options.weight || 0.5,
      confidence: options.confidence || 0.8,
      temporal: options.temporal,
      provenance: options.provenance || { source: "direct", inferred: false },
    };

    this.edges.set(edge_id, edge);
    this.adjacency.get(source)?.add(edge_id);
    this.adjacency.get(target)?.add(edge_id);

    return edge;
  }

  get_node(id: string): KGNode | undefined {
    return this.nodes.get(id);
  }

  get_parents(id: string, relationship_type: string = "is_a"): KGNode[] {
    const edge_ids = this.adjacency.get(id) || new Set();
    const parents: KGNode[] = [];

    for (const eid of edge_ids) {
      const edge = this.edges.get(eid);
      if (edge && edge.type === relationship_type && edge.source === id) {
        const parent = this.nodes.get(edge.target);
        if (parent) parents.push(parent);
      }
    }

    return parents;
  }

  get_children(id: string, relationship_type: string = "is_a"): KGNode[] {
    const edge_ids = this.adjacency.get(id) || new Set();
    const children: KGNode[] = [];

    for (const eid of edge_ids) {
      const edge = this.edges.get(eid);
      if (edge && edge.type === relationship_type && edge.target === id) {
        const child = this.nodes.get(edge.source);
        if (child) children.push(child);
      }
    }

    return children;
  }

  get_edges_from(id: string): KGEdge[] {
    const edge_ids = this.adjacency.get(id) || new Set();
    return Array.from(edge_ids)
      .map((eid) => this.edges.get(eid))
      .filter((e): e is KGEdge => e !== undefined && e.source === id);
  }

  get_edges_to(id: string): KGEdge[] {
    const edge_ids = this.adjacency.get(id) || new Set();
    return Array.from(edge_ids)
      .map((eid) => this.edges.get(eid))
      .filter((e): e is KGEdge => e !== undefined && e.target === id);
  }

  // Run inference rules
  run_inference(): { inferred_nodes: number; inferred_edges: number } {
    let inferred_nodes = 0;
    let inferred_edges = 0;

    for (const node of this.nodes.values()) {
      for (const rule of this.inference_rules) {
        if (rule.condition(this, node)) {
          const { nodes, edges } = rule.inference(this, node);

          for (const n of nodes) {
            if (n.id && n.type && n.label && !this.nodes.has(n.id)) {
              this.add_node(n.id, n.type, n.label, n.properties || {}, {
                provenance: { source: "inference", method: "inferred", evidence: [rule.name] },
              });
              inferred_nodes++;
            }
          }

          for (const e of edges) {
            if (e.source && e.target && e.type) {
              const edge_id = `${e.source}-${e.type}-${e.target}`;
              if (!this.edges.has(edge_id)) {
                this.add_edge(e.source, e.target, e.type, e.properties || {}, {
                  provenance: { source: "inference", inferred: true },
                });
                inferred_edges++;
              }
            }
          }
        }
      }
    }

    return { inferred_nodes, inferred_edges };
  }

  // Apply confidence decay based on age
  apply_confidence_decay(half_life_days: number = 30): void {
    const now = Date.now();

    for (const node of this.nodes.values()) {
      const age_days = (now - node.updated_at.getTime()) / (1000 * 60 * 60 * 24);
      const decay_factor = Math.pow(0.5, age_days / half_life_days);
      node.confidence = Math.max(0.1, node.confidence * decay_factor);
    }
  }

  // Get temporally valid nodes
  get_valid_nodes(at_time: Date = new Date()): KGNode[] {
    return Array.from(this.nodes.values()).filter((node) => {
      if (node.valid_from && node.valid_from > at_time) return false;
      if (node.valid_until && node.valid_until < at_time) return false;
      return true;
    });
  }

  // RAG-style context retrieval
  get_context_for_query(query: string, max_nodes: number = 10): AgentContext {
    const query_words = query.toLowerCase().split(/\s+/);
    const scored_nodes: Array<{ node: KGNode; score: number }> = [];

    for (const node of this.nodes.values()) {
      let score = 0;
      const node_text = `${node.label} ${node.type} ${JSON.stringify(node.properties)}`.toLowerCase();

      for (const word of query_words) {
        if (node_text.includes(word)) {
          score += 1;
        }
      }

      // Boost by confidence
      score *= node.confidence;

      if (score > 0) {
        scored_nodes.push({ node, score });
      }
    }

    // Sort by score and take top N
    scored_nodes.sort((a, b) => b.score - a.score);
    const relevant_nodes = scored_nodes.slice(0, max_nodes).map((s) => s.node);

    // Get edges between relevant nodes
    const node_ids = new Set(relevant_nodes.map((n) => n.id));
    const relevant_edges = Array.from(this.edges.values()).filter(
      (e) => node_ids.has(e.source) || node_ids.has(e.target)
    );

    // Generate inferred facts
    const inferred_facts: string[] = [];
    for (const edge of relevant_edges.filter((e) => e.provenance.inferred)) {
      const source = this.nodes.get(edge.source);
      const target = this.nodes.get(edge.target);
      if (source && target) {
        inferred_facts.push(`${source.label} ${edge.type} ${target.label} (inferred)`);
      }
    }

    // Temporal context
    const temporal_nodes = relevant_nodes.filter((n) => n.valid_from || n.valid_until);
    const temporal_context = temporal_nodes
      .map((n) => `${n.label}: ${n.valid_from?.toISOString() || "?"} to ${n.valid_until?.toISOString() || "ongoing"}`)
      .join("; ");

    // Average confidence
    const confidence_summary = relevant_nodes.length > 0
      ? relevant_nodes.reduce((sum, n) => sum + n.confidence, 0) / relevant_nodes.length
      : 0;

    return {
      relevant_nodes,
      relevant_edges,
      inferred_facts,
      temporal_context,
      confidence_summary,
    };
  }

  get_stats(): {
    nodes: number;
    edges: number;
    inferred_edges: number;
    avg_confidence: number;
    by_type: Record<string, number>;
  } {
    const by_type: Record<string, number> = {};
    let total_confidence = 0;
    let inferred_edges = 0;

    for (const node of this.nodes.values()) {
      by_type[node.type] = (by_type[node.type] || 0) + 1;
      total_confidence += node.confidence;
    }

    for (const edge of this.edges.values()) {
      if (edge.provenance.inferred) inferred_edges++;
    }

    return {
      nodes: this.nodes.size,
      edges: this.edges.size,
      inferred_edges,
      avg_confidence: this.nodes.size > 0 ? total_confidence / this.nodes.size : 0,
      by_type,
    };
  }

  to_context_string(context: AgentContext): string {
    const parts: string[] = [];

    parts.push(`## Knowledge Graph Context (confidence: ${(context.confidence_summary * 100).toFixed(0)}%)`);
    parts.push("");

    if (context.relevant_nodes.length > 0) {
      parts.push("### Entities:");
      for (const node of context.relevant_nodes) {
        parts.push(`- ${node.label} (${node.type}): ${JSON.stringify(node.properties)}`);
      }
      parts.push("");
    }

    if (context.relevant_edges.length > 0) {
      parts.push("### Relationships:");
      for (const edge of context.relevant_edges.slice(0, 10)) {
        const source = this.nodes.get(edge.source);
        const target = this.nodes.get(edge.target);
        if (source && target) {
          parts.push(`- ${source.label} --[${edge.type}]--> ${target.label}`);
        }
      }
      parts.push("");
    }

    if (context.inferred_facts.length > 0) {
      parts.push("### Inferred Facts:");
      for (const fact of context.inferred_facts) {
        parts.push(`- ${fact}`);
      }
      parts.push("");
    }

    if (context.temporal_context) {
      parts.push(`### Temporal Context: ${context.temporal_context}`);
    }

    return parts.join("\n");
  }
}

// ============================================================
// Agent Manager
// ============================================================

interface ManagedAgent {
  id: string;
  type: string;
  status: "idle" | "running" | "completed" | "failed";
  task?: string;
  created_at: Date;
  last_active: Date;
  tasks_completed: number;
  tokens_used: number;
}

class AgentScheduler extends EventEmitter {
  private kg: FullKnowledgeGraph;
  private client: Anthropic;
  private agents: Map<string, ManagedAgent> = new Map();
  private max_agents: number;
  private task_queue: Array<{ task: string; priority: number; callback: (result: string) => void }> = [];

  constructor(kg: FullKnowledgeGraph, max_agents: number = 5) {
    super();
    this.kg = kg;
    this.client = new Anthropic();
    this.max_agents = max_agents;
  }

  async spawn_agent(type: string): Promise<ManagedAgent> {
    const id = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const agent: ManagedAgent = {
      id,
      type,
      status: "idle",
      created_at: new Date(),
      last_active: new Date(),
      tasks_completed: 0,
      tokens_used: 0,
    };

    this.agents.set(id, agent);

    // Add to knowledge graph
    this.kg.add_node(id, "Agent", `Agent ${id.slice(-4)}`, {
      type,
      spawned_at: new Date().toISOString(),
    });

    log.agent(id, `Spawned (type: ${type})`);
    this.emit("agent_spawned", agent);

    return agent;
  }

  async execute_task(agent_id: string, task: string): Promise<string> {
    const agent = this.agents.get(agent_id);
    if (!agent) throw new Error(`Agent ${agent_id} not found`);

    agent.status = "running";
    agent.task = task;
    agent.last_active = new Date();

    log.agent(agent_id, `Executing: ${task.slice(0, 50)}...`);

    // Get context from knowledge graph
    const context = this.kg.get_context_for_query(task);
    const kg_context = this.kg.to_context_string(context);

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `You are an AI agent with access to a knowledge graph.
Type: ${agent.type}
ID: ${agent.id}

Use the provided knowledge graph context to inform your responses.
Be accurate and cite your sources when possible.`,
        messages: [
          {
            role: "user",
            content: `Task: ${task}

${kg_context}

Complete the task using the available context.`,
          },
        ],
      });

      const result = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      agent.status = "completed";
      agent.tasks_completed++;
      agent.tokens_used += response.usage.input_tokens + response.usage.output_tokens;

      // Record task completion in KG
      const task_node_id = `task_${Date.now()}`;
      this.kg.add_node(task_node_id, "Task", task.slice(0, 50), {
        full_task: task,
        result: result.slice(0, 200),
        completed_at: new Date().toISOString(),
      });
      this.kg.add_edge(agent_id, task_node_id, "completed", {}, { temporal: { start: new Date() } });

      log.agent(agent_id, `Completed task (${response.usage.output_tokens} tokens)`);
      this.emit("task_completed", agent, task, result);

      return result;
    } catch (error) {
      agent.status = "failed";
      log.agent(agent_id, `Failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async recycle_agent(agent_id: string): Promise<void> {
    const agent = this.agents.get(agent_id);
    if (!agent) return;

    // Update KG
    const kg_node = this.kg.get_node(agent_id);
    if (kg_node) {
      kg_node.valid_until = new Date();
      kg_node.properties.recycled_at = new Date().toISOString();
      kg_node.properties.tasks_completed = agent.tasks_completed;
    }

    this.agents.delete(agent_id);
    log.agent(agent_id, `Recycled (completed ${agent.tasks_completed} tasks)`);
    this.emit("agent_recycled", agent);
  }

  get_active_agents(): ManagedAgent[] {
    return Array.from(this.agents.values()).filter((a) => a.status !== "completed" && a.status !== "failed");
  }

  get_stats(): {
    total_agents: number;
    active_agents: number;
    total_tasks: number;
    total_tokens: number;
  } {
    let total_tasks = 0;
    let total_tokens = 0;

    for (const agent of this.agents.values()) {
      total_tasks += agent.tasks_completed;
      total_tokens += agent.tokens_used;
    }

    return {
      total_agents: this.agents.size,
      active_agents: this.get_active_agents().length,
      total_tasks,
      total_tokens,
    };
  }
}

// ============================================================
// AI Agent Operating System
// ============================================================

class AgentOS {
  private kg: FullKnowledgeGraph;
  private scheduler: AgentScheduler;
  private client: Anthropic;
  private uptime_start: Date;

  constructor() {
    this.kg = new FullKnowledgeGraph();
    this.scheduler = new AgentScheduler(this.kg);
    this.client = new Anthropic();
    this.uptime_start = new Date();

    this.setup_event_handlers();
  }

  private setup_event_handlers(): void {
    this.scheduler.on("agent_spawned", (agent) => {
      log.os(`Agent spawned: ${agent.id}`);
    });

    this.scheduler.on("task_completed", (agent, task, result) => {
      // Could trigger follow-up actions
    });

    this.scheduler.on("agent_recycled", (agent) => {
      log.os(`Agent recycled: ${agent.id}`);
    });
  }

  async initialize_knowledge(domain: string): Promise<void> {
    log.os(`Initializing knowledge for domain: ${domain}`);

    // Use AI to generate initial knowledge graph
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Generate a knowledge graph for the domain: "${domain}"

Provide JSON with:
{
  "nodes": [
    {"id": "unique_id", "type": "Person|Organization|Concept|Event|...", "label": "Name", "properties": {...}}
  ],
  "edges": [
    {"source": "id", "target": "id", "type": "is_a|part_of|related_to|causes|precedes|...", "properties": {...}}
  ]
}

Create 10-15 interconnected nodes with meaningful relationships.`,
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
      const data = JSON.parse("{" + text);

      for (const node of data.nodes || []) {
        this.kg.add_node(node.id, node.type, node.label, node.properties || {});
        log.kg(`Node: ${node.label} (${node.type})`);
      }

      for (const edge of data.edges || []) {
        this.kg.add_edge(edge.source, edge.target, edge.type, edge.properties || {});
      }

      // Run inference
      const inferred = this.kg.run_inference();
      if (inferred.inferred_edges > 0) {
        log.kg(`Inferred ${inferred.inferred_edges} additional relationships`);
      }
    } catch {
      log.os("Failed to parse initial knowledge");
    }
  }

  async process_request(request: string): Promise<string> {
    log.os(`Processing: ${request.slice(0, 50)}...`);

    // Determine agent type needed
    const agent = await this.scheduler.spawn_agent("general");

    try {
      const result = await this.scheduler.execute_task(agent.id, request);
      return result;
    } finally {
      await this.scheduler.recycle_agent(agent.id);
    }
  }

  async add_knowledge(statement: string): Promise<void> {
    log.os(`Adding knowledge: ${statement.slice(0, 50)}...`);

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Extract entities and relationships from this statement for a knowledge graph:

"${statement}"

Provide JSON:
{"nodes": [...], "edges": [...]}`,
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
      const data = JSON.parse("{" + text);

      for (const node of data.nodes || []) {
        this.kg.add_node(node.id, node.type, node.label, node.properties || {});
      }

      for (const edge of data.edges || []) {
        this.kg.add_edge(edge.source, edge.target, edge.type, edge.properties || {});
      }

      this.kg.run_inference();
    } catch {
      log.os("Failed to extract knowledge");
    }
  }

  get_stats(): {
    uptime_seconds: number;
    kg_stats: ReturnType<FullKnowledgeGraph["get_stats"]>;
    scheduler_stats: ReturnType<AgentScheduler["get_stats"]>;
  } {
    return {
      uptime_seconds: Math.floor((Date.now() - this.uptime_start.getTime()) / 1000),
      kg_stats: this.kg.get_stats(),
      scheduler_stats: this.scheduler.get_stats(),
    };
  }
}

// ============================================================
// Utilities
// ============================================================

const log = {
  os: (msg: string) => console.log(`[${ts()}] 🖥️  ${msg}`),
  agent: (id: string, msg: string) => console.log(`[${ts()}] 🤖 [${id.slice(-8)}] ${msg}`),
  kg: (msg: string) => console.log(`[${ts()}] 🔗 ${msg}`),
  system: (msg: string) => console.log(`[${ts()}] ⚙️  ${msg}`),
};

function ts(): string {
  return new Date().toISOString().split("T")[1].split(".")[0];
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║        AI Agent Operating System with Knowledge Graph         ║
╠═══════════════════════════════════════════════════════════════╣
║  A meta-system for spawning and managing AI agents with:     ║
║    • Full ontology-based knowledge graph                     ║
║    • Inference engine for automatic reasoning                ║
║    • Temporal relationships and provenance tracking          ║
║    • RAG-style context retrieval for agents                  ║
║    • Dynamic agent spawning and lifecycle management         ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const os = new AgentOS();

  // Initialize with domain knowledge
  log.system("\n=== Initializing Knowledge Graph ===\n");
  await os.initialize_knowledge("Software Development and AI");

  // Add some explicit knowledge
  log.system("\n=== Adding Explicit Knowledge ===\n");
  const knowledge_statements = [
    "TypeScript is a superset of JavaScript that adds static types",
    "Machine learning models require training data to learn patterns",
    "Kubernetes is used for container orchestration in cloud environments",
  ];

  for (const statement of knowledge_statements) {
    await os.add_knowledge(statement);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Process some requests
  log.system("\n=== Processing Requests ===\n");
  const requests = [
    "What do you know about TypeScript and its relationship to other technologies?",
    "How does machine learning relate to the software development process?",
    "What infrastructure components are important for deploying AI systems?",
  ];

  for (const request of requests) {
    console.log(`\n📝 Request: ${request}\n`);
    const result = await os.process_request(request);
    console.log(`📤 Response: ${result.slice(0, 300)}...\n`);
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Show final stats
  console.log("\n" + "=".repeat(60));
  const stats = os.get_stats();
  console.log("\n📊 Agent OS Statistics:\n");
  console.log(`  Uptime: ${stats.uptime_seconds}s`);
  console.log(`  Knowledge Graph: ${stats.kg_stats.nodes} nodes, ${stats.kg_stats.edges} edges`);
  console.log(`  Inferred Edges: ${stats.kg_stats.inferred_edges}`);
  console.log(`  Avg Confidence: ${(stats.kg_stats.avg_confidence * 100).toFixed(1)}%`);
  console.log(`  Total Agents Spawned: ${stats.scheduler_stats.total_agents}`);
  console.log(`  Tasks Completed: ${stats.scheduler_stats.total_tasks}`);
  console.log(`  Tokens Used: ${stats.scheduler_stats.total_tokens}`);

  console.log("\n✅ Agent OS demonstration complete!");
  console.log("\nKey Features Demonstrated:");
  console.log("  • Ontology-based knowledge graph with inference");
  console.log("  • RAG-style context retrieval for agents");
  console.log("  • Dynamic agent spawning and lifecycle");
  console.log("  • Temporal relationships and provenance tracking");
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
