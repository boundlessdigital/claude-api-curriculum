#!/usr/bin/env bun
/**
 * APP 8: Real-Time Data Pipeline with Knowledge Graph
 * =====================================================
 *
 * A streaming data pipeline that builds and maintains a simple
 * knowledge graph from incoming events, enabling context-aware
 * AI responses based on entity relationships.
 *
 * COMPLEXITY: ★★★★★★ (Expert+)
 *
 * Knowledge Graph Concepts Introduced:
 *   - Entities: Objects in our domain (users, products, events)
 *   - Relationships: Connections between entities
 *   - Properties: Attributes of entities and relationships
 *   - Graph queries: Finding paths and patterns
 *
 * Architecture:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                Data Pipeline with KG                        │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │                                                             │
 *   │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
 *   │  │   Events    │────►│   Entity    │────►│  Knowledge  │   │
 *   │  │   Stream    │     │  Extractor  │     │    Graph    │   │
 *   │  └─────────────┘     └─────────────┘     └──────┬──────┘   │
 *   │                                                  │          │
 *   │  ┌─────────────┐     ┌─────────────┐     ┌──────▼──────┐   │
 *   │  │   Alerts    │◄────│   Anomaly   │◄────│   Context   │   │
 *   │  │  & Actions  │     │  Detector   │     │  Retriever  │   │
 *   │  └─────────────┘     └─────────────┘     └─────────────┘   │
 *   │                                                             │
 *   │                    ┌─────────────┐                         │
 *   │                    │  AI Agent   │                         │
 *   │                    │ (with KG    │                         │
 *   │                    │  context)   │                         │
 *   │                    └─────────────┘                         │
 *   │                                                             │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Library: Graphology (pure TypeScript, no external dependencies)
 *
 * Usage:
 *   bun run apps/08_data_pipeline_kg.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { EventEmitter } from "events";

// ============================================================
// Simple Knowledge Graph Implementation
// (In production, use Graphology: https://graphology.github.io/)
// ============================================================

interface Entity {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
  created_at: Date;
}

class SimpleKnowledgeGraph {
  private entities: Map<string, Entity> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private adjacency: Map<string, Set<string>> = new Map(); // entity_id -> relationship_ids

  add_entity(id: string, type: string, properties: Record<string, unknown> = {}): Entity {
    const existing = this.entities.get(id);
    if (existing) {
      existing.properties = { ...existing.properties, ...properties };
      existing.updated_at = new Date();
      return existing;
    }

    const entity: Entity = {
      id,
      type,
      properties,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.entities.set(id, entity);
    this.adjacency.set(id, new Set());
    return entity;
  }

  add_relationship(
    source_id: string,
    target_id: string,
    type: string,
    properties: Record<string, unknown> = {}
  ): Relationship | null {
    if (!this.entities.has(source_id) || !this.entities.has(target_id)) {
      return null;
    }

    const rel_id = `${source_id}-${type}-${target_id}`;

    // Check if relationship exists
    if (this.relationships.has(rel_id)) {
      const existing = this.relationships.get(rel_id)!;
      existing.properties = { ...existing.properties, ...properties };
      return existing;
    }

    const relationship: Relationship = {
      id: rel_id,
      source: source_id,
      target: target_id,
      type,
      properties,
      created_at: new Date(),
    };

    this.relationships.set(rel_id, relationship);
    this.adjacency.get(source_id)?.add(rel_id);
    this.adjacency.get(target_id)?.add(rel_id);

    return relationship;
  }

  get_entity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  get_neighbors(id: string, relationship_type?: string): Entity[] {
    const rel_ids = this.adjacency.get(id) || new Set();
    const neighbors: Entity[] = [];

    for (const rel_id of rel_ids) {
      const rel = this.relationships.get(rel_id);
      if (!rel) continue;
      if (relationship_type && rel.type !== relationship_type) continue;

      const neighbor_id = rel.source === id ? rel.target : rel.source;
      const neighbor = this.entities.get(neighbor_id);
      if (neighbor) neighbors.push(neighbor);
    }

    return neighbors;
  }

  get_relationships(entity_id: string): Relationship[] {
    const rel_ids = this.adjacency.get(entity_id) || new Set();
    return Array.from(rel_ids)
      .map((id) => this.relationships.get(id))
      .filter((r): r is Relationship => r !== undefined);
  }

  find_path(start_id: string, end_id: string, max_depth: number = 5): string[] | null {
    if (!this.entities.has(start_id) || !this.entities.has(end_id)) {
      return null;
    }

    // BFS for shortest path
    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [{ id: start_id, path: [start_id] }];

    while (queue.length > 0 && queue[0].path.length <= max_depth) {
      const current = queue.shift()!;

      if (current.id === end_id) {
        return current.path;
      }

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const neighbors = this.get_neighbors(current.id);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          queue.push({
            id: neighbor.id,
            path: [...current.path, neighbor.id],
          });
        }
      }
    }

    return null;
  }

  get_entities_by_type(type: string): Entity[] {
    return Array.from(this.entities.values()).filter((e) => e.type === type);
  }

  get_context_for_entity(id: string, depth: number = 2): string {
    const entity = this.entities.get(id);
    if (!entity) return "";

    const context_parts: string[] = [];
    const visited = new Set<string>();

    const collect_context = (current_id: string, current_depth: number) => {
      if (current_depth > depth || visited.has(current_id)) return;
      visited.add(current_id);

      const e = this.entities.get(current_id);
      if (!e) return;

      const rels = this.get_relationships(current_id);
      for (const rel of rels) {
        const other_id = rel.source === current_id ? rel.target : rel.source;
        const other = this.entities.get(other_id);
        if (other) {
          context_parts.push(`${e.type}:${e.id} --[${rel.type}]--> ${other.type}:${other.id}`);
          collect_context(other_id, current_depth + 1);
        }
      }
    };

    collect_context(id, 0);
    return context_parts.join("\n");
  }

  get_stats(): { entities: number; relationships: number; by_type: Record<string, number> } {
    const by_type: Record<string, number> = {};
    for (const entity of this.entities.values()) {
      by_type[entity.type] = (by_type[entity.type] || 0) + 1;
    }
    return {
      entities: this.entities.size,
      relationships: this.relationships.size,
      by_type,
    };
  }

  to_summary(): string {
    const stats = this.get_stats();
    return `Knowledge Graph: ${stats.entities} entities, ${stats.relationships} relationships
Types: ${Object.entries(stats.by_type).map(([t, c]) => `${t}(${c})`).join(", ")}`;
  }
}

// ============================================================
// Event Types
// ============================================================

type StreamEvent = {
  id: string;
  type: "user_action" | "system_event" | "transaction" | "alert";
  timestamp: Date;
  payload: Record<string, unknown>;
};

// ============================================================
// Entity Extractor (AI-powered)
// ============================================================

class EntityExtractor {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async extract(event: StreamEvent): Promise<{
    entities: Array<{ id: string; type: string; properties: Record<string, unknown> }>;
    relationships: Array<{ source: string; target: string; type: string; properties?: Record<string, unknown> }>;
  }> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Extract entities and relationships from this event for a knowledge graph.

Event: ${JSON.stringify(event)}

Respond with JSON:
{
  "entities": [{"id": "unique_id", "type": "user|product|action|location|...", "properties": {...}}],
  "relationships": [{"source": "entity_id", "target": "entity_id", "type": "relationship_type"}]
}

Be concise. Only extract meaningful entities and clear relationships.`,
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
      return JSON.parse("{" + text);
    } catch {
      return { entities: [], relationships: [] };
    }
  }
}

// ============================================================
// Anomaly Detector (KG-aware)
// ============================================================

class AnomalyDetector {
  private kg: SimpleKnowledgeGraph;
  private client: Anthropic;
  private recent_events: StreamEvent[] = [];

  constructor(kg: SimpleKnowledgeGraph) {
    this.kg = kg;
    this.client = new Anthropic();
  }

  add_event(event: StreamEvent): void {
    this.recent_events.push(event);
    if (this.recent_events.length > 100) {
      this.recent_events.shift();
    }
  }

  async detect(event: StreamEvent): Promise<{
    is_anomaly: boolean;
    severity: "low" | "medium" | "high";
    reason: string;
  } | null> {
    // Get related context from knowledge graph
    const context_parts: string[] = [];

    // Find related entities from event payload
    for (const value of Object.values(event.payload)) {
      if (typeof value === "string") {
        const entity = this.kg.get_entity(value);
        if (entity) {
          context_parts.push(this.kg.get_context_for_entity(value, 1));
        }
      }
    }

    const kg_context = context_parts.join("\n");

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Analyze this event for anomalies. Consider the knowledge graph context.

Event: ${JSON.stringify(event)}

Knowledge Graph Context:
${kg_context || "No relevant context found"}

Recent Event Types: ${this.recent_events.slice(-10).map((e) => e.type).join(", ")}

Is this anomalous? Respond with JSON:
{"is_anomaly": boolean, "severity": "low|medium|high", "reason": "explanation"}

If not anomalous, set is_anomaly to false.`,
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
      return JSON.parse("{" + text);
    } catch {
      return null;
    }
  }
}

// ============================================================
// Context-Aware AI Agent
// ============================================================

class KGAwareAgent {
  private client: Anthropic;
  private kg: SimpleKnowledgeGraph;

  constructor(kg: SimpleKnowledgeGraph) {
    this.client = new Anthropic();
    this.kg = kg;
  }

  async respond(query: string, entity_ids: string[] = []): Promise<string> {
    // Build context from knowledge graph
    const kg_context_parts: string[] = [];

    for (const id of entity_ids) {
      const context = this.kg.get_context_for_entity(id, 2);
      if (context) {
        kg_context_parts.push(`Context for ${id}:\n${context}`);
      }
    }

    // Also find entities mentioned in query
    const words = query.toLowerCase().split(/\s+/);
    for (const [id, entity] of Array.from(this.kg["entities"])) {
      if (words.some((w) => id.toLowerCase().includes(w) || entity.type.toLowerCase().includes(w))) {
        const context = this.kg.get_context_for_entity(id, 1);
        if (context && !kg_context_parts.includes(context)) {
          kg_context_parts.push(`Context for ${id}:\n${context}`);
        }
      }
    }

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: `You are an AI assistant with access to a knowledge graph.
Use the provided context to give informed, accurate responses.
Current KG stats: ${this.kg.to_summary()}`,
      messages: [
        {
          role: "user",
          content: `Query: ${query}

Knowledge Graph Context:
${kg_context_parts.join("\n\n") || "No specific context found."}

Provide a helpful response using the available context.`,
        },
      ],
    });

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }
}

// ============================================================
// Data Pipeline
// ============================================================

class DataPipeline extends EventEmitter {
  private kg: SimpleKnowledgeGraph;
  private extractor: EntityExtractor;
  private detector: AnomalyDetector;
  private agent: KGAwareAgent;
  private events_processed: number = 0;

  constructor() {
    super();
    this.kg = new SimpleKnowledgeGraph();
    this.extractor = new EntityExtractor();
    this.detector = new AnomalyDetector(this.kg);
    this.agent = new KGAwareAgent(this.kg);
  }

  async process_event(event: StreamEvent): Promise<void> {
    log.event(`Processing: ${event.type} (${event.id})`);

    // 1. Extract entities and relationships
    const extracted = await this.extractor.extract(event);

    // 2. Update knowledge graph
    for (const entity of extracted.entities) {
      this.kg.add_entity(entity.id, entity.type, entity.properties);
      log.kg(`Entity: ${entity.type}:${entity.id}`);
    }

    for (const rel of extracted.relationships) {
      this.kg.add_relationship(rel.source, rel.target, rel.type, rel.properties || {});
      log.kg(`Relationship: ${rel.source} --[${rel.type}]--> ${rel.target}`);
    }

    // 3. Add to detector history
    this.detector.add_event(event);

    // 4. Check for anomalies
    const anomaly = await this.detector.detect(event);
    if (anomaly?.is_anomaly) {
      log.anomaly(`[${anomaly.severity.toUpperCase()}] ${anomaly.reason}`);
      this.emit("anomaly", event, anomaly);
    }

    this.events_processed++;
    this.emit("event_processed", event);
  }

  async query(q: string): Promise<string> {
    return this.agent.respond(q);
  }

  get_stats(): { events_processed: number; kg_stats: ReturnType<SimpleKnowledgeGraph["get_stats"]> } {
    return {
      events_processed: this.events_processed,
      kg_stats: this.kg.get_stats(),
    };
  }

  get_kg(): SimpleKnowledgeGraph {
    return this.kg;
  }
}

// ============================================================
// Utilities
// ============================================================

const log = {
  event: (msg: string) => console.log(`[${ts()}] 📥 ${msg}`),
  kg: (msg: string) => console.log(`[${ts()}] 🔗 ${msg}`),
  anomaly: (msg: string) => console.log(`[${ts()}] ⚠️  ${msg}`),
  query: (msg: string) => console.log(`[${ts()}] 🔍 ${msg}`),
  system: (msg: string) => console.log(`[${ts()}] ⚙️  ${msg}`),
};

function ts(): string {
  return new Date().toISOString().split("T")[1].split(".")[0];
}

// ============================================================
// Demo Event Generator
// ============================================================

function generate_demo_events(): StreamEvent[] {
  return [
    {
      id: "evt_001",
      type: "user_action",
      timestamp: new Date(),
      payload: {
        user_id: "user_alice",
        action: "purchase",
        product_id: "prod_laptop",
        amount: 1299.99,
        location: "loc_nyc",
      },
    },
    {
      id: "evt_002",
      type: "user_action",
      timestamp: new Date(),
      payload: {
        user_id: "user_bob",
        action: "view",
        product_id: "prod_laptop",
        referrer: "user_alice",
      },
    },
    {
      id: "evt_003",
      type: "system_event",
      timestamp: new Date(),
      payload: {
        service: "payment_gateway",
        status: "healthy",
        latency_ms: 45,
      },
    },
    {
      id: "evt_004",
      type: "transaction",
      timestamp: new Date(),
      payload: {
        from: "user_bob",
        to: "merchant_techstore",
        product_id: "prod_laptop",
        amount: 1299.99,
        payment_method: "credit_card",
      },
    },
    {
      id: "evt_005",
      type: "user_action",
      timestamp: new Date(),
      payload: {
        user_id: "user_charlie",
        action: "review",
        product_id: "prod_laptop",
        rating: 5,
        referred_by: "user_alice",
      },
    },
    {
      id: "evt_006",
      type: "alert",
      timestamp: new Date(),
      payload: {
        alert_type: "unusual_pattern",
        user_id: "user_dave",
        action: "bulk_purchase",
        quantity: 50,
        product_id: "prod_laptop",
        location: "loc_unknown",
      },
    },
  ];
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║      Real-Time Data Pipeline with Knowledge Graph             ║
╠═══════════════════════════════════════════════════════════════╣
║  Features:                                                    ║
║    • Entity extraction from streaming events                  ║
║    • Dynamic knowledge graph construction                     ║
║    • Graph-aware anomaly detection                            ║
║    • Context-enriched AI responses                            ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const pipeline = new DataPipeline();

  // Event listeners
  pipeline.on("anomaly", (event, anomaly) => {
    // Could trigger alerts, Slack notifications, etc.
  });

  // Process demo events
  log.system("Processing demo events...\n");

  const events = generate_demo_events();
  for (const event of events) {
    await pipeline.process_event(event);
    console.log("");
    await new Promise((r) => setTimeout(r, 500));
  }

  // Show KG stats
  console.log("=".repeat(60));
  const stats = pipeline.get_stats();
  console.log("\n📊 Pipeline Statistics:\n");
  console.log(`  Events Processed: ${stats.events_processed}`);
  console.log(`  KG Entities: ${stats.kg_stats.entities}`);
  console.log(`  KG Relationships: ${stats.kg_stats.relationships}`);
  console.log(`  Entity Types: ${Object.entries(stats.kg_stats.by_type).map(([t, c]) => `${t}(${c})`).join(", ")}`);

  // Demo queries using KG context
  console.log("\n" + "=".repeat(60));
  console.log("\n🔍 Knowledge Graph Queries:\n");

  const queries = [
    "What do we know about user_alice?",
    "What products have been purchased?",
    "Are there any connections between users?",
  ];

  for (const q of queries) {
    log.query(q);
    const response = await pipeline.query(q);
    console.log(`📝 ${response.slice(0, 300)}...\n`);
  }

  // Show graph structure
  console.log("=".repeat(60));
  console.log("\n🔗 Knowledge Graph Relationships:\n");
  const kg = pipeline.get_kg();
  for (const entity of kg.get_entities_by_type("user").slice(0, 3)) {
    console.log(`  ${entity.id}:`);
    const rels = kg.get_relationships(entity.id);
    for (const rel of rels.slice(0, 3)) {
      const other = rel.source === entity.id ? rel.target : rel.source;
      console.log(`    --[${rel.type}]--> ${other}`);
    }
  }

  console.log("\n✅ Demo complete!");
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
