#!/usr/bin/env bun
/**
 * APP 11: Dream Architect - Generative Worldbuilding System
 * ==========================================================
 *
 * A sci-fi worldbuilding engine that generates entire universes from a single concept.
 * It maintains internal consistency through a knowledge graph and can answer
 * any question about the generated world.
 *
 * COMPLEXITY: ★★★★★ (Futuristic)
 *
 * Features:
 *   - Procedural universe generation from seed concepts
 *   - Internally consistent lore via knowledge graph constraints
 *   - Character generation with motivations and relationships
 *   - Timeline generation with causally-linked events
 *   - Location generation with geography and culture
 *   - Infinite drill-down: ask about anything, get consistent details
 *   - Export to various formats (JSON, Markdown, interactive)
 *
 * Usage:
 *   bun run apps/11_dream_architect.ts
 *   bun run apps/11_dream_architect.ts "A world where dreams are currency"
 */

import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// Configuration
// ============================================================

const MODEL = "claude-sonnet-4-20250514";
const client = new Anthropic();

// ============================================================
// Types - The Building Blocks of Reality
// ============================================================

interface WorldSeed {
  concept: string;
  genre: string;
  tone: string;
  themes: string[];
}

interface PhysicalLaw {
  id: string;
  name: string;
  description: string;
  implications: string[];
  exceptions?: string[];
}

interface Location {
  id: string;
  name: string;
  type: "planet" | "city" | "region" | "dimension" | "structure" | "abstract";
  description: string;
  geography?: string;
  culture?: string;
  inhabitants?: string[];
  connected_to: string[]; // Location IDs
  secrets?: string[];
}

interface Character {
  id: string;
  name: string;
  role: "protagonist" | "antagonist" | "supporting" | "mythical" | "historical";
  description: string;
  motivations: string[];
  abilities?: string[];
  relationships: Array<{ character_id: string; type: string; description: string }>;
  location_id?: string;
  secrets?: string[];
  arc?: string;
}

interface Faction {
  id: string;
  name: string;
  type: "government" | "religion" | "corporation" | "rebellion" | "ancient" | "secret";
  description: string;
  goals: string[];
  methods: string[];
  members: string[]; // Character IDs
  rivals: string[]; // Faction IDs
  allies: string[]; // Faction IDs
  headquarters?: string; // Location ID
}

interface Event {
  id: string;
  name: string;
  type: "historical" | "prophesied" | "ongoing" | "secret";
  description: string;
  date?: string; // In-world date/era
  location_id?: string;
  participants: string[]; // Character/Faction IDs
  causes: string[]; // Event IDs that led to this
  effects: string[]; // Event IDs this caused
  significance: string;
}

interface Artifact {
  id: string;
  name: string;
  type: "weapon" | "tool" | "relic" | "technology" | "substance" | "concept";
  description: string;
  powers?: string[];
  origin?: string;
  current_location?: string;
  current_owner?: string;
  history: string[];
}

interface Conflict {
  id: string;
  name: string;
  type: "war" | "ideological" | "personal" | "cosmic" | "internal";
  description: string;
  sides: Array<{ name: string; members: string[]; goals: string[] }>;
  stakes: string;
  status: "resolved" | "ongoing" | "dormant" | "prophesied";
  resolution?: string;
}

interface World {
  seed: WorldSeed;
  name: string;
  tagline: string;
  overview: string;
  physical_laws: PhysicalLaw[];
  locations: Map<string, Location>;
  characters: Map<string, Character>;
  factions: Map<string, Faction>;
  timeline: Event[];
  artifacts: Map<string, Artifact>;
  conflicts: Conflict[];
  mysteries: string[]; // Unanswered questions for depth
  creation_date: Date;
}

// Knowledge graph for consistency
interface WorldGraph {
  nodes: Map<string, {
    id: string;
    type: "location" | "character" | "faction" | "event" | "artifact" | "law" | "conflict";
    data: unknown;
  }>;
  edges: Map<string, {
    from: string;
    to: string;
    type: string;
    properties?: Record<string, unknown>;
  }>;
}

// ============================================================
// World Graph - Maintains Consistency
// ============================================================

class ConsistencyGraph {
  private nodes: Map<string, { type: string; data: unknown }> = new Map();
  private edges: Array<{ from: string; to: string; type: string; data?: unknown }> = [];
  private constraints: Array<(graph: ConsistencyGraph) => string | null> = [];

  add_node(id: string, type: string, data: unknown): void {
    this.nodes.set(id, { type, data });
  }

  add_edge(from: string, to: string, type: string, data?: unknown): void {
    this.edges.push({ from, to, type, data });
  }

  get_node(id: string): { type: string; data: unknown } | undefined {
    return this.nodes.get(id);
  }

  get_related(id: string, edge_type?: string): string[] {
    return this.edges
      .filter(e => (e.from === id || e.to === id) && (!edge_type || e.type === edge_type))
      .map(e => e.from === id ? e.to : e.from);
  }

  get_context_for(id: string, depth: number = 2): string {
    const visited = new Set<string>();
    const context: string[] = [];

    const traverse = (node_id: string, current_depth: number): void => {
      if (current_depth > depth || visited.has(node_id)) return;
      visited.add(node_id);

      const node = this.nodes.get(node_id);
      if (node) {
        context.push(`[${node.type}] ${node_id}: ${JSON.stringify(node.data).slice(0, 200)}`);
      }

      for (const edge of this.edges) {
        if (edge.from === node_id && !visited.has(edge.to)) {
          context.push(`  --${edge.type}--> ${edge.to}`);
          traverse(edge.to, current_depth + 1);
        }
        if (edge.to === node_id && !visited.has(edge.from)) {
          context.push(`  <--${edge.type}-- ${edge.from}`);
          traverse(edge.from, current_depth + 1);
        }
      }
    };

    traverse(id, 0);
    return context.join("\n");
  }

  add_constraint(check: (graph: ConsistencyGraph) => string | null): void {
    this.constraints.push(check);
  }

  validate(): string[] {
    return this.constraints
      .map(c => c(this))
      .filter((msg): msg is string => msg !== null);
  }

  to_summary(): string {
    const type_counts: Record<string, number> = {};
    for (const [, node] of this.nodes) {
      type_counts[node.type] = (type_counts[node.type] || 0) + 1;
    }
    return `Graph: ${this.nodes.size} nodes (${Object.entries(type_counts).map(([t, c]) => `${c} ${t}s`).join(", ")}), ${this.edges.length} edges`;
  }
}

// ============================================================
// Dream Architect - The World Generator
// ============================================================

class DreamArchitect {
  private world: World | null = null;
  private graph: ConsistencyGraph = new ConsistencyGraph();
  private generation_log: string[] = [];

  async generate_world(concept: string): Promise<World> {
    console.log("\n🌌 DREAM ARCHITECT - Initializing Reality Matrix...\n");

    // Phase 1: Seed Analysis
    console.log("📡 Phase 1: Analyzing Seed Concept...");
    const seed = await this.analyze_seed(concept);
    this.log(`Seed analyzed: ${seed.genre} world with themes: ${seed.themes.join(", ")}`);

    // Phase 2: Physical Laws
    console.log("⚛️  Phase 2: Establishing Physical Laws...");
    const laws = await this.generate_laws(seed);
    this.log(`Generated ${laws.length} fundamental laws`);

    // Phase 3: Geography
    console.log("🗺️  Phase 3: Generating Geography...");
    const locations = await this.generate_locations(seed, laws);
    this.log(`Created ${locations.size} locations`);

    // Phase 4: History
    console.log("📜 Phase 4: Weaving Timeline...");
    const timeline = await this.generate_timeline(seed, laws, locations);
    this.log(`Generated ${timeline.length} historical events`);

    // Phase 5: Factions
    console.log("⚔️  Phase 5: Forming Factions...");
    const factions = await this.generate_factions(seed, locations, timeline);
    this.log(`Created ${factions.size} factions`);

    // Phase 6: Characters
    console.log("👥 Phase 6: Breathing Life into Characters...");
    const characters = await this.generate_characters(seed, locations, factions, timeline);
    this.log(`Brought ${characters.size} characters to life`);

    // Phase 7: Artifacts
    console.log("✨ Phase 7: Forging Artifacts...");
    const artifacts = await this.generate_artifacts(seed, laws, timeline);
    this.log(`Created ${artifacts.size} artifacts`);

    // Phase 8: Conflicts
    console.log("🔥 Phase 8: Igniting Conflicts...");
    const conflicts = await this.generate_conflicts(factions, characters, timeline);
    this.log(`Established ${conflicts.length} conflicts`);

    // Phase 9: Mysteries
    console.log("❓ Phase 9: Planting Mysteries...");
    const mysteries = await this.generate_mysteries(seed, laws, timeline);
    this.log(`Seeded ${mysteries.length} mysteries`);

    // Phase 10: World Synthesis
    console.log("🌍 Phase 10: Synthesizing World...");
    const world_meta = await this.synthesize_world(seed, laws, locations, timeline, factions, characters);

    this.world = {
      seed,
      name: world_meta.name,
      tagline: world_meta.tagline,
      overview: world_meta.overview,
      physical_laws: laws,
      locations,
      characters,
      factions,
      timeline,
      artifacts,
      conflicts,
      mysteries,
      creation_date: new Date(),
    };

    // Validate consistency
    const violations = this.graph.validate();
    if (violations.length > 0) {
      console.log("\n⚠️  Consistency warnings:", violations);
    }

    console.log("\n✅ World generation complete!");
    console.log(this.graph.to_summary());

    return this.world;
  }

  private log(msg: string): void {
    this.generation_log.push(`[${new Date().toISOString()}] ${msg}`);
    console.log(`   ${msg}`);
  }

  private async analyze_seed(concept: string): Promise<WorldSeed> {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `You are a master worldbuilder. Analyze the given concept and extract its essence for world generation. Return JSON only.`,
      messages: [{
        role: "user",
        content: `Analyze this world concept and return a JSON object with:
- concept: the core idea (string)
- genre: the genre (fantasy/scifi/horror/mythic/surreal/etc)
- tone: the emotional tone (dark/hopeful/mysterious/epic/intimate/etc)
- themes: array of 3-5 thematic elements to explore

Concept: "${concept}"

Return only valid JSON.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\{[\s\S]*\}/);
    if (!json_match) throw new Error("Failed to parse seed analysis");

    return JSON.parse(json_match[0]) as WorldSeed;
  }

  private async generate_laws(seed: WorldSeed): Promise<PhysicalLaw[]> {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: `You are a theoretical physicist designing the fundamental rules of a fictional universe. These laws must be internally consistent and have interesting implications.`,
      messages: [{
        role: "user",
        content: `Create 3-5 fundamental laws for this world. These can be physical, magical, metaphysical, or social laws that are treated as absolute.

World Concept: ${seed.concept}
Genre: ${seed.genre}
Themes: ${seed.themes.join(", ")}

For each law, provide:
- id: unique identifier (snake_case)
- name: dramatic name
- description: how it works
- implications: array of 2-4 consequences of this law
- exceptions: optional array of known exceptions

Return as a JSON array of law objects.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\[[\s\S]*\]/);
    if (!json_match) return [];

    const laws = JSON.parse(json_match[0]) as PhysicalLaw[];
    for (const law of laws) {
      this.graph.add_node(law.id, "law", law);
    }
    return laws;
  }

  private async generate_locations(seed: WorldSeed, laws: PhysicalLaw[]): Promise<Map<string, Location>> {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: `You are a master cartographer and cultural anthropologist designing locations for a fictional world. Each location should feel unique and be shaped by the world's laws.`,
      messages: [{
        role: "user",
        content: `Create 5-8 key locations for this world.

World Concept: ${seed.concept}
Genre: ${seed.genre}
Themes: ${seed.themes.join(", ")}
Physical Laws: ${laws.map(l => `${l.name}: ${l.description}`).join("\n")}

For each location:
- id: unique identifier (snake_case)
- name: evocative name
- type: planet/city/region/dimension/structure/abstract
- description: vivid description
- geography: physical features (if applicable)
- culture: cultural elements (if inhabited)
- inhabitants: types of beings (if any)
- connected_to: array of other location IDs this connects to
- secrets: 1-2 hidden aspects

Return as a JSON array of location objects.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\[[\s\S]*\]/);
    const locations = new Map<string, Location>();

    if (json_match) {
      const locs = JSON.parse(json_match[0]) as Location[];
      for (const loc of locs) {
        locations.set(loc.id, loc);
        this.graph.add_node(loc.id, "location", loc);
      }
      // Add edges for connections
      for (const loc of locs) {
        for (const conn of loc.connected_to || []) {
          this.graph.add_edge(loc.id, conn, "connected_to");
        }
      }
    }

    return locations;
  }

  private async generate_timeline(
    seed: WorldSeed,
    laws: PhysicalLaw[],
    locations: Map<string, Location>
  ): Promise<Event[]> {
    const location_names = Array.from(locations.values()).map(l => `${l.id}: ${l.name}`).join(", ");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: `You are a historian chronicling the ages of a fictional world. Events should be causally linked and reveal the world's nature.`,
      messages: [{
        role: "user",
        content: `Create a timeline of 6-10 significant events spanning this world's history.

World Concept: ${seed.concept}
Themes: ${seed.themes.join(", ")}
Physical Laws: ${laws.map(l => l.name).join(", ")}
Locations: ${location_names}

For each event:
- id: unique identifier (snake_case)
- name: dramatic name
- type: historical/prophesied/ongoing/secret
- description: what happened
- date: in-world date or era (e.g., "Third Age", "Year 0", "Before the Shattering")
- location_id: where it happened (use location IDs above)
- participants: empty array for now (will be filled with characters/factions)
- causes: array of event IDs that led to this (earlier events)
- effects: array of event IDs this caused (later events)
- significance: why this matters

Order events chronologically. Return as a JSON array.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\[[\s\S]*\]/);
    const events: Event[] = [];

    if (json_match) {
      const parsed = JSON.parse(json_match[0]) as Event[];
      for (const event of parsed) {
        events.push(event);
        this.graph.add_node(event.id, "event", event);
        if (event.location_id) {
          this.graph.add_edge(event.id, event.location_id, "occurred_at");
        }
        for (const cause of event.causes || []) {
          this.graph.add_edge(cause, event.id, "caused");
        }
      }
    }

    return events;
  }

  private async generate_factions(
    seed: WorldSeed,
    locations: Map<string, Location>,
    timeline: Event[]
  ): Promise<Map<string, Faction>> {
    const location_names = Array.from(locations.values()).map(l => `${l.id}: ${l.name}`).join(", ");
    const event_names = timeline.map(e => `${e.id}: ${e.name}`).join(", ");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: `You are a political scientist analyzing the power structures of a fictional world. Factions should have complex motivations and relationships.`,
      messages: [{
        role: "user",
        content: `Create 4-6 major factions for this world.

World Concept: ${seed.concept}
Themes: ${seed.themes.join(", ")}
Locations: ${location_names}
Key Events: ${event_names}

For each faction:
- id: unique identifier (snake_case)
- name: compelling name
- type: government/religion/corporation/rebellion/ancient/secret
- description: what they are
- goals: array of 2-3 objectives
- methods: array of how they operate
- members: empty array for now
- rivals: array of other faction IDs they oppose
- allies: array of other faction IDs they work with
- headquarters: location ID where they're based

Return as a JSON array.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\[[\s\S]*\]/);
    const factions = new Map<string, Faction>();

    if (json_match) {
      const parsed = JSON.parse(json_match[0]) as Faction[];
      for (const faction of parsed) {
        factions.set(faction.id, faction);
        this.graph.add_node(faction.id, "faction", faction);
        if (faction.headquarters) {
          this.graph.add_edge(faction.id, faction.headquarters, "headquartered_at");
        }
        for (const rival of faction.rivals || []) {
          this.graph.add_edge(faction.id, rival, "rivals_with");
        }
        for (const ally of faction.allies || []) {
          this.graph.add_edge(faction.id, ally, "allied_with");
        }
      }
    }

    return factions;
  }

  private async generate_characters(
    seed: WorldSeed,
    locations: Map<string, Location>,
    factions: Map<string, Faction>,
    timeline: Event[]
  ): Promise<Map<string, Character>> {
    const faction_names = Array.from(factions.values()).map(f => `${f.id}: ${f.name}`).join(", ");
    const location_names = Array.from(locations.values()).map(l => `${l.id}: ${l.name}`).join(", ");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3500,
      system: `You are a novelist creating memorable characters for a world. Each character should have depth, flaws, and connections to the world.`,
      messages: [{
        role: "user",
        content: `Create 6-10 key characters for this world.

World Concept: ${seed.concept}
Themes: ${seed.themes.join(", ")}
Factions: ${faction_names}
Locations: ${location_names}

For each character:
- id: unique identifier (snake_case)
- name: memorable name
- role: protagonist/antagonist/supporting/mythical/historical
- description: appearance and personality
- motivations: array of 2-3 driving desires
- abilities: array of special skills or powers (if any)
- relationships: array of {character_id, type, description} - reference other character IDs
- location_id: where they're primarily found
- secrets: 1-2 things they hide
- arc: their potential story arc

Include a mix of roles. Make relationships reference each other. Return as a JSON array.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\[[\s\S]*\]/);
    const characters = new Map<string, Character>();

    if (json_match) {
      const parsed = JSON.parse(json_match[0]) as Character[];
      for (const char of parsed) {
        characters.set(char.id, char);
        this.graph.add_node(char.id, "character", char);
        if (char.location_id) {
          this.graph.add_edge(char.id, char.location_id, "located_at");
        }
        for (const rel of char.relationships || []) {
          this.graph.add_edge(char.id, rel.character_id, rel.type);
        }
      }
    }

    return characters;
  }

  private async generate_artifacts(
    seed: WorldSeed,
    laws: PhysicalLaw[],
    timeline: Event[]
  ): Promise<Map<string, Artifact>> {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: `You are a curator of legendary objects. Each artifact should embody the world's themes and have a rich history.`,
      messages: [{
        role: "user",
        content: `Create 3-5 significant artifacts for this world.

World Concept: ${seed.concept}
Themes: ${seed.themes.join(", ")}
Physical Laws: ${laws.map(l => `${l.name}: ${l.description}`).join("\n")}
Key Events: ${timeline.map(e => e.name).join(", ")}

For each artifact:
- id: unique identifier (snake_case)
- name: legendary name
- type: weapon/tool/relic/technology/substance/concept
- description: what it is
- powers: array of abilities (if any)
- origin: how it came to be
- current_location: where it is now (can be "unknown" or "destroyed")
- current_owner: who has it (can be "none" or "unknown")
- history: array of 2-4 key moments in its history

Return as a JSON array.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\[[\s\S]*\]/);
    const artifacts = new Map<string, Artifact>();

    if (json_match) {
      const parsed = JSON.parse(json_match[0]) as Artifact[];
      for (const artifact of parsed) {
        artifacts.set(artifact.id, artifact);
        this.graph.add_node(artifact.id, "artifact", artifact);
      }
    }

    return artifacts;
  }

  private async generate_conflicts(
    factions: Map<string, Faction>,
    characters: Map<string, Character>,
    timeline: Event[]
  ): Promise<Conflict[]> {
    const faction_info = Array.from(factions.values())
      .map(f => `${f.id}: ${f.name} (goals: ${f.goals.join(", ")})`)
      .join("\n");
    const char_info = Array.from(characters.values())
      .map(c => `${c.id}: ${c.name} (${c.role})`)
      .join(", ");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: `You are a conflict designer creating the tensions that drive stories. Each conflict should have clear stakes and complex sides.`,
      messages: [{
        role: "user",
        content: `Create 2-4 major conflicts for this world.

Factions:
${faction_info}

Key Characters: ${char_info}

For each conflict:
- id: unique identifier (snake_case)
- name: dramatic name
- type: war/ideological/personal/cosmic/internal
- description: what the conflict is about
- sides: array of {name, members (array of faction/character IDs), goals}
- stakes: what happens if each side wins/loses
- status: resolved/ongoing/dormant/prophesied
- resolution: how it ended (if resolved)

Return as a JSON array.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\[[\s\S]*\]/);
    const conflicts: Conflict[] = [];

    if (json_match) {
      const parsed = JSON.parse(json_match[0]) as Conflict[];
      for (const conflict of parsed) {
        conflicts.push(conflict);
        this.graph.add_node(conflict.id, "conflict", conflict);
      }
    }

    return conflicts;
  }

  private async generate_mysteries(
    seed: WorldSeed,
    laws: PhysicalLaw[],
    timeline: Event[]
  ): Promise<string[]> {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: `You are a mystery writer planting seeds for future stories. Mysteries should be tantalizing and connected to the world's deeper truths.`,
      messages: [{
        role: "user",
        content: `Create 4-6 unanswered mysteries for this world.

World Concept: ${seed.concept}
Physical Laws: ${laws.map(l => l.name).join(", ")}
Key Events: ${timeline.map(e => e.name).join(", ")}

Each mystery should be a question that has no definitive answer yet, but hints at deeper truths.

Return as a JSON array of strings (the questions themselves).`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\[[\s\S]*\]/);

    if (json_match) {
      return JSON.parse(json_match[0]) as string[];
    }
    return [];
  }

  private async synthesize_world(
    seed: WorldSeed,
    laws: PhysicalLaw[],
    locations: Map<string, Location>,
    timeline: Event[],
    factions: Map<string, Faction>,
    characters: Map<string, Character>
  ): Promise<{ name: string; tagline: string; overview: string }> {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: `You are a master storyteller synthesizing a world into its essence. Create a compelling name and overview.`,
      messages: [{
        role: "user",
        content: `Synthesize this world into a compelling whole.

Concept: ${seed.concept}
Genre: ${seed.genre}
Themes: ${seed.themes.join(", ")}
Physical Laws: ${laws.map(l => l.name).join(", ")}
Locations: ${Array.from(locations.values()).map(l => l.name).join(", ")}
Key Events: ${timeline.slice(0, 5).map(e => e.name).join(", ")}
Factions: ${Array.from(factions.values()).map(f => f.name).join(", ")}
Key Characters: ${Array.from(characters.values()).filter(c => c.role === "protagonist" || c.role === "antagonist").map(c => c.name).join(", ")}

Return JSON with:
- name: an evocative world name
- tagline: a one-line hook (like a movie tagline)
- overview: a 2-3 paragraph overview of the world suitable for a reader encountering it for the first time`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json_match = text.match(/\{[\s\S]*\}/);

    if (json_match) {
      return JSON.parse(json_match[0]);
    }
    return { name: "Unnamed World", tagline: seed.concept, overview: "" };
  }

  // Query the world with infinite drill-down
  async query(question: string): Promise<string> {
    if (!this.world) throw new Error("No world generated yet");

    // Find relevant context from the graph
    const keywords = question.toLowerCase().split(/\s+/);
    const relevant_nodes: string[] = [];

    for (const [id, node] of this.graph["nodes"]) {
      const data_str = JSON.stringify(node.data).toLowerCase();
      if (keywords.some(kw => data_str.includes(kw) || id.includes(kw))) {
        relevant_nodes.push(id);
      }
    }

    // Get context for relevant nodes
    const context_parts = relevant_nodes.slice(0, 5).map(id => this.graph.get_context_for(id, 2));
    const context = context_parts.join("\n\n---\n\n");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: `You are an oracle with perfect knowledge of the world "${this.world.name}".
Answer questions about this world with authority and detail.
If the question asks about something not yet defined, extrapolate consistently from what exists.
Always maintain internal consistency with the established facts.

World Overview: ${this.world.overview}

Physical Laws: ${this.world.physical_laws.map(l => `${l.name}: ${l.description}`).join("\n")}`,
      messages: [{
        role: "user",
        content: `Question about the world: ${question}

Relevant World Data:
${context || "No specific data found - extrapolate from world rules."}

Answer the question thoroughly and consistently with the world's established facts. If extrapolating, make it feel natural and consistent.`,
      }],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  // Export world to Markdown
  export_to_markdown(): string {
    if (!this.world) throw new Error("No world generated yet");

    const md: string[] = [];

    md.push(`# ${this.world.name}`);
    md.push(`*${this.world.tagline}*\n`);
    md.push(`## Overview\n${this.world.overview}\n`);

    md.push(`## Physical Laws\n`);
    for (const law of this.world.physical_laws) {
      md.push(`### ${law.name}`);
      md.push(law.description);
      md.push(`\n**Implications:**`);
      for (const imp of law.implications) {
        md.push(`- ${imp}`);
      }
      md.push("");
    }

    md.push(`## Locations\n`);
    for (const [, loc] of this.world.locations) {
      md.push(`### ${loc.name} (${loc.type})`);
      md.push(loc.description);
      if (loc.geography) md.push(`\n**Geography:** ${loc.geography}`);
      if (loc.culture) md.push(`\n**Culture:** ${loc.culture}`);
      md.push("");
    }

    md.push(`## Characters\n`);
    for (const [, char] of this.world.characters) {
      md.push(`### ${char.name} (${char.role})`);
      md.push(char.description);
      md.push(`\n**Motivations:** ${char.motivations.join(", ")}`);
      if (char.arc) md.push(`\n**Arc:** ${char.arc}`);
      md.push("");
    }

    md.push(`## Factions\n`);
    for (const [, faction] of this.world.factions) {
      md.push(`### ${faction.name} (${faction.type})`);
      md.push(faction.description);
      md.push(`\n**Goals:** ${faction.goals.join(", ")}`);
      md.push("");
    }

    md.push(`## Timeline\n`);
    for (const event of this.world.timeline) {
      md.push(`### ${event.date || "Unknown Era"}: ${event.name}`);
      md.push(event.description);
      md.push(`\n*Significance: ${event.significance}*\n`);
    }

    md.push(`## Artifacts\n`);
    for (const [, artifact] of this.world.artifacts) {
      md.push(`### ${artifact.name} (${artifact.type})`);
      md.push(artifact.description);
      if (artifact.powers?.length) md.push(`\n**Powers:** ${artifact.powers.join(", ")}`);
      md.push("");
    }

    md.push(`## Conflicts\n`);
    for (const conflict of this.world.conflicts) {
      md.push(`### ${conflict.name} (${conflict.type}) - ${conflict.status}`);
      md.push(conflict.description);
      md.push(`\n**Stakes:** ${conflict.stakes}\n`);
    }

    md.push(`## Mysteries\n`);
    for (const mystery of this.world.mysteries) {
      md.push(`- ${mystery}`);
    }

    md.push(`\n---\n*Generated by Dream Architect on ${this.world.creation_date.toISOString()}*`);

    return md.join("\n");
  }

  get_world(): World | null {
    return this.world;
  }
}

// ============================================================
// Interactive Console
// ============================================================

async function interactive_session(architect: DreamArchitect): Promise<void> {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (): void => {
    rl.question("\n🔮 Ask about the world (or /export, /quit): ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === "/quit" || trimmed === "/exit") {
        console.log("\n👋 Farewell, dreamer...\n");
        rl.close();
        return;
      }

      if (trimmed === "/export") {
        const world = architect.get_world();
        if (world) {
          const filename = `world_${world.name.toLowerCase().replace(/\s+/g, "_")}.md`;
          const content = architect.export_to_markdown();
          await Bun.write(filename, content);
          console.log(`\n📄 Exported to ${filename}`);
        }
        prompt();
        return;
      }

      try {
        console.log("\n🌌 Consulting the world...\n");
        const answer = await architect.query(trimmed);
        console.log(answer);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : String(error));
      }

      prompt();
    });
  };

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Welcome to the Dream Archive. Ask anything about this world.");
  console.log("  Commands: /export (save to markdown), /quit (exit)");
  console.log("═══════════════════════════════════════════════════════════════");

  prompt();
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║              🌌 D R E A M   A R C H I T E C T 🌌                  ║
║                                                                   ║
║          Generative Worldbuilding with Knowledge Graphs           ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  const concept = process.argv[2] || "A world where dreams are currency and nightmares are weapons";

  console.log(`📝 Seed Concept: "${concept}"\n`);

  const architect = new DreamArchitect();

  try {
    const world = await architect.generate_world(concept);

    console.log("\n" + "═".repeat(70));
    console.log(`\n🌍 ${world.name}`);
    console.log(`   "${world.tagline}"\n`);
    console.log(world.overview);
    console.log("\n" + "═".repeat(70));

    console.log("\n📊 World Statistics:");
    console.log(`   • Physical Laws: ${world.physical_laws.length}`);
    console.log(`   • Locations: ${world.locations.size}`);
    console.log(`   • Characters: ${world.characters.size}`);
    console.log(`   • Factions: ${world.factions.size}`);
    console.log(`   • Timeline Events: ${world.timeline.length}`);
    console.log(`   • Artifacts: ${world.artifacts.size}`);
    console.log(`   • Conflicts: ${world.conflicts.length}`);
    console.log(`   • Mysteries: ${world.mysteries.length}`);

    // Enter interactive mode
    await interactive_session(architect);

  } catch (error) {
    console.error("Failed to generate world:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
