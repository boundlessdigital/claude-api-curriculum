#!/usr/bin/env bun
/**
 * APP 14: Consciousness Stream Recorder
 * =======================================
 *
 * An agent that captures and indexes your "thought stream" throughout the day -
 * notes, ideas, screenshots, code changes - then builds a searchable "memory palace"
 * you can query conversationally.
 *
 * COMPLEXITY: ★★★★★ (Futuristic)
 *
 * Features:
 *   - Multi-modal input capture (text, voice notes, screenshots, code)
 *   - Automatic tagging and categorization
 *   - Temporal indexing with context windows
 *   - Semantic search across all memories
 *   - "What was I thinking about...?" queries
 *   - Connection discovery between disparate thoughts
 *   - Daily/weekly synthesis and insights
 *   - Thought patterns and productivity analysis
 *
 * Usage:
 *   bun run apps/14_consciousness_stream.ts
 *   bun run apps/14_consciousness_stream.ts capture "My thought here"
 *   bun run apps/14_consciousness_stream.ts search "What was I thinking about AI?"
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";

// ============================================================
// Configuration
// ============================================================

const MODEL = "claude-sonnet-4-20250514";
const client = new Anthropic();
const MEMORY_FILE = "consciousness_stream.json";

// ============================================================
// Types
// ============================================================

interface ThoughtFragment {
  id: string;
  timestamp: Date;
  type: "text" | "voice" | "code" | "screenshot" | "observation" | "idea" | "question" | "realization";
  content: string;
  raw_input: string;

  // Semantic analysis
  topics: string[];
  entities: string[];
  sentiment: number; // -1 to 1
  energy_level: number; // 0 to 1 (excitement/urgency)
  complexity: number; // 0 to 1

  // Temporal context
  time_of_day: "morning" | "afternoon" | "evening" | "night";
  day_of_week: string;
  context_window: string; // What was happening around this time

  // Connections
  related_thoughts: string[]; // IDs of related thoughts
  tags: string[];

  // Meta
  recalled_count: number;
  last_recalled?: Date;
}

interface ThoughtCluster {
  id: string;
  name: string;
  description: string;
  thought_ids: string[];
  created_at: Date;
  last_updated: Date;
  importance: number;
}

interface DailySummary {
  date: string;
  total_thoughts: number;
  dominant_topics: string[];
  mood_trajectory: number[];
  key_insights: string[];
  unresolved_questions: string[];
  connections_made: number;
}

interface ConsciousnessStream {
  created_at: Date;
  total_fragments: number;

  thoughts: ThoughtFragment[];
  clusters: ThoughtCluster[];
  daily_summaries: DailySummary[];

  // Indices for fast lookup
  topic_index: Record<string, string[]>; // topic -> thought IDs
  entity_index: Record<string, string[]>; // entity -> thought IDs
  temporal_index: Record<string, string[]>; // date -> thought IDs

  // Patterns discovered
  recurring_themes: string[];
  thinking_patterns: string[];
  productive_hours: number[];
}

// ============================================================
// Memory Palace Engine
// ============================================================

class MemoryPalace {
  private stream: ConsciousnessStream;

  constructor() {
    this.stream = this.load_or_create();
  }

  private load_or_create(): ConsciousnessStream {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
      console.log(`📚 Loaded memory palace with ${data.total_fragments} thought fragments`);

      // Convert dates
      data.created_at = new Date(data.created_at);
      for (const t of data.thoughts || []) {
        t.timestamp = new Date(t.timestamp);
        if (t.last_recalled) t.last_recalled = new Date(t.last_recalled);
      }
      for (const c of data.clusters || []) {
        c.created_at = new Date(c.created_at);
        c.last_updated = new Date(c.last_updated);
      }

      return data as ConsciousnessStream;
    }

    console.log("🌱 Creating new consciousness stream...");
    return {
      created_at: new Date(),
      total_fragments: 0,
      thoughts: [],
      clusters: [],
      daily_summaries: [],
      topic_index: {},
      entity_index: {},
      temporal_index: {},
      recurring_themes: [],
      thinking_patterns: [],
      productive_hours: [],
    };
  }

  private save(): void {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.stream, null, 2));
  }

  async capture(input: string, type: ThoughtFragment["type"] = "text"): Promise<ThoughtFragment> {
    console.log("🧠 Capturing thought fragment...");

    // Analyze the thought
    const analysis = await this.analyze_thought(input, type);

    const now = new Date();
    const hour = now.getHours();
    const time_of_day: ThoughtFragment["time_of_day"] =
      hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";

    const fragment: ThoughtFragment = {
      id: `thought_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now,
      type,
      content: analysis.processed_content,
      raw_input: input,
      topics: analysis.topics,
      entities: analysis.entities,
      sentiment: analysis.sentiment,
      energy_level: analysis.energy_level,
      complexity: analysis.complexity,
      time_of_day,
      day_of_week: now.toLocaleDateString("en-US", { weekday: "long" }),
      context_window: await this.get_context_window(now),
      related_thoughts: await this.find_related_thoughts(analysis.topics, analysis.entities),
      tags: analysis.auto_tags,
      recalled_count: 0,
    };

    // Add to stream
    this.stream.thoughts.push(fragment);
    this.stream.total_fragments++;

    // Update indices
    this.update_indices(fragment);

    // Check for emerging clusters
    await this.check_for_clusters(fragment);

    this.save();

    console.log(`   ✨ Captured: ${fragment.topics.join(", ") || "general thought"}`);
    console.log(`   🔗 Related to ${fragment.related_thoughts.length} previous thoughts`);

    return fragment;
  }

  private async analyze_thought(
    input: string,
    type: ThoughtFragment["type"]
  ): Promise<{
    processed_content: string;
    topics: string[];
    entities: string[];
    sentiment: number;
    energy_level: number;
    complexity: number;
    auto_tags: string[];
  }> {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: `You are a thought analyzer for a consciousness stream recorder.
Analyze the given thought fragment and extract semantic information.`,
      messages: [{
        role: "user",
        content: `Analyze this ${type} thought fragment:

"${input}"

Provide a JSON response with:
{
  "processed_content": "cleaned/expanded version of the thought",
  "topics": ["main", "topics", "discussed"],
  "entities": ["specific", "things", "mentioned"],
  "sentiment": 0.0 to 1.0 (-1 negative, 0 neutral, 1 positive),
  "energy_level": 0.0 to 1.0 (excitement/urgency),
  "complexity": 0.0 to 1.0 (depth of thought),
  "auto_tags": ["suggested", "tags"]
}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const json_match = text.match(/\{[\s\S]*\}/);

    if (json_match) {
      return JSON.parse(json_match[0]);
    }

    // Fallback
    return {
      processed_content: input,
      topics: [],
      entities: [],
      sentiment: 0,
      energy_level: 0.5,
      complexity: 0.5,
      auto_tags: [type],
    };
  }

  private async get_context_window(timestamp: Date): Promise<string> {
    // Get thoughts from the past hour
    const one_hour_ago = new Date(timestamp.getTime() - 60 * 60 * 1000);
    const recent = this.stream.thoughts.filter(t =>
      t.timestamp > one_hour_ago && t.timestamp < timestamp
    );

    if (recent.length === 0) return "Starting fresh context";

    const topics = [...new Set(recent.flatMap(t => t.topics))].slice(0, 5);
    return `Recent focus: ${topics.join(", ")}`;
  }

  private async find_related_thoughts(topics: string[], entities: string[]): Promise<string[]> {
    const related: Set<string> = new Set();

    for (const topic of topics) {
      const indexed = this.stream.topic_index[topic.toLowerCase()] || [];
      indexed.forEach(id => related.add(id));
    }

    for (const entity of entities) {
      const indexed = this.stream.entity_index[entity.toLowerCase()] || [];
      indexed.forEach(id => related.add(id));
    }

    return [...related].slice(0, 10);
  }

  private update_indices(fragment: ThoughtFragment): void {
    // Topic index
    for (const topic of fragment.topics) {
      const key = topic.toLowerCase();
      if (!this.stream.topic_index[key]) {
        this.stream.topic_index[key] = [];
      }
      this.stream.topic_index[key].push(fragment.id);
    }

    // Entity index
    for (const entity of fragment.entities) {
      const key = entity.toLowerCase();
      if (!this.stream.entity_index[key]) {
        this.stream.entity_index[key] = [];
      }
      this.stream.entity_index[key].push(fragment.id);
    }

    // Temporal index
    const date_key = fragment.timestamp.toISOString().split("T")[0];
    if (!this.stream.temporal_index[date_key]) {
      this.stream.temporal_index[date_key] = [];
    }
    this.stream.temporal_index[date_key].push(fragment.id);
  }

  private async check_for_clusters(new_fragment: ThoughtFragment): Promise<void> {
    // Check if this thought should join or create a cluster
    const related = new_fragment.related_thoughts;

    if (related.length >= 3) {
      // Check existing clusters
      for (const cluster of this.stream.clusters) {
        const overlap = related.filter(id => cluster.thought_ids.includes(id)).length;
        if (overlap >= 2) {
          // Add to existing cluster
          if (!cluster.thought_ids.includes(new_fragment.id)) {
            cluster.thought_ids.push(new_fragment.id);
            cluster.last_updated = new Date();
            console.log(`   📎 Added to cluster: "${cluster.name}"`);
          }
          return;
        }
      }

      // Create new cluster
      if (new_fragment.topics.length > 0) {
        const cluster: ThoughtCluster = {
          id: `cluster_${Date.now()}`,
          name: `${new_fragment.topics[0]} thoughts`,
          description: `Cluster around ${new_fragment.topics.join(", ")}`,
          thought_ids: [new_fragment.id, ...related.slice(0, 5)],
          created_at: new Date(),
          last_updated: new Date(),
          importance: 0.5,
        };
        this.stream.clusters.push(cluster);
        console.log(`   🎯 Created new cluster: "${cluster.name}"`);
      }
    }
  }

  async search(query: string): Promise<ThoughtFragment[]> {
    console.log(`🔍 Searching consciousness stream for: "${query}"`);

    // First, understand the query
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: `You are a semantic search analyzer. Extract search intent from natural language queries.`,
      messages: [{
        role: "user",
        content: `Query: "${query}"

Extract as JSON:
{
  "keywords": ["important", "words"],
  "time_reference": "last week/yesterday/specific date/null",
  "topic_filter": "specific topic or null",
  "type_filter": "thought type or null",
  "semantic_meaning": "what they're really looking for"
}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const json_match = text.match(/\{[\s\S]*\}/);

    let search_params = { keywords: query.toLowerCase().split(/\s+/), time_reference: null, topic_filter: null };
    if (json_match) {
      try {
        search_params = JSON.parse(json_match[0]);
      } catch {
        // Use defaults
      }
    }

    // Search through thoughts
    const scored_thoughts: Array<{ thought: ThoughtFragment; score: number }> = [];

    for (const thought of this.stream.thoughts) {
      let score = 0;

      // Keyword matching
      const content_lower = (thought.content + " " + thought.raw_input).toLowerCase();
      for (const keyword of search_params.keywords || []) {
        if (content_lower.includes(keyword)) score += 2;
      }

      // Topic matching
      for (const topic of thought.topics) {
        for (const keyword of search_params.keywords || []) {
          if (topic.toLowerCase().includes(keyword)) score += 3;
        }
      }

      // Entity matching
      for (const entity of thought.entities) {
        for (const keyword of search_params.keywords || []) {
          if (entity.toLowerCase().includes(keyword)) score += 3;
        }
      }

      // Recency bonus
      const age_days = (Date.now() - thought.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 5 - age_days * 0.1);

      // Importance bonus
      score += thought.complexity * 2;

      if (score > 0) {
        scored_thoughts.push({ thought, score });
      }
    }

    // Sort by score and return top results
    scored_thoughts.sort((a, b) => b.score - a.score);
    const results = scored_thoughts.slice(0, 10).map(st => {
      st.thought.recalled_count++;
      st.thought.last_recalled = new Date();
      return st.thought;
    });

    this.save();

    return results;
  }

  async query_naturally(question: string): Promise<string> {
    console.log(`💭 Querying: "${question}"\n`);

    // Get relevant thoughts
    const relevant = await this.search(question);

    if (relevant.length === 0) {
      return "I don't have any recorded thoughts that match that query. Try capturing some thoughts first!";
    }

    // Format context
    const context = relevant.map(t =>
      `[${t.timestamp.toLocaleString()}] (${t.type}) ${t.content}\n   Topics: ${t.topics.join(", ")}`
    ).join("\n\n");

    // Get clusters related to the query
    const related_clusters = this.stream.clusters.filter(c =>
      c.thought_ids.some(id => relevant.some(r => r.id === id))
    );

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: `You are a memory palace guide helping someone explore their recorded thoughts.
Be conversational and insightful. Make connections the user might not have noticed.
Reference specific thoughts with their timestamps when relevant.`,
      messages: [{
        role: "user",
        content: `The user asks: "${question}"

Their relevant recorded thoughts:
${context}

${related_clusters.length > 0 ? `Related thought clusters: ${related_clusters.map(c => c.name).join(", ")}` : ""}

Answer their question based on their own recorded thoughts. If you notice patterns or connections, point them out.`,
      }],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  async generate_daily_synthesis(): Promise<DailySummary> {
    const today = new Date().toISOString().split("T")[0];
    const today_thoughts = this.stream.thoughts.filter(t =>
      t.timestamp.toISOString().startsWith(today)
    );

    if (today_thoughts.length === 0) {
      return {
        date: today,
        total_thoughts: 0,
        dominant_topics: [],
        mood_trajectory: [],
        key_insights: ["No thoughts captured today"],
        unresolved_questions: [],
        connections_made: 0,
      };
    }

    // Calculate stats
    const all_topics = today_thoughts.flatMap(t => t.topics);
    const topic_counts: Record<string, number> = {};
    for (const topic of all_topics) {
      topic_counts[topic] = (topic_counts[topic] || 0) + 1;
    }
    const dominant_topics = Object.entries(topic_counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    const mood_trajectory = today_thoughts.map(t => t.sentiment);

    // AI synthesis
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: `You are synthesizing someone's day of thoughts into insights.`,
      messages: [{
        role: "user",
        content: `Synthesize these thoughts from today:

${today_thoughts.map(t => `[${t.time_of_day}] ${t.content}`).join("\n")}

Provide as JSON:
{
  "key_insights": ["2-4 insights about their thinking today"],
  "unresolved_questions": ["questions they raised but didn't answer"],
  "thinking_pattern": "observation about how they think"
}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const json_match = text.match(/\{[\s\S]*\}/);

    let synthesis = { key_insights: [], unresolved_questions: [] };
    if (json_match) {
      try {
        synthesis = JSON.parse(json_match[0]);
      } catch {
        // Use defaults
      }
    }

    const summary: DailySummary = {
      date: today,
      total_thoughts: today_thoughts.length,
      dominant_topics,
      mood_trajectory,
      key_insights: synthesis.key_insights || [],
      unresolved_questions: synthesis.unresolved_questions || [],
      connections_made: today_thoughts.reduce((sum, t) => sum + t.related_thoughts.length, 0),
    };

    this.stream.daily_summaries.push(summary);
    this.save();

    return summary;
  }

  get_stats(): string {
    const s = this.stream;
    const types: Record<string, number> = {};
    for (const t of s.thoughts) {
      types[t.type] = (types[t.type] || 0) + 1;
    }

    const avg_sentiment = s.thoughts.length > 0
      ? s.thoughts.reduce((sum, t) => sum + t.sentiment, 0) / s.thoughts.length
      : 0;

    const all_topics = s.thoughts.flatMap(t => t.topics);
    const unique_topics = [...new Set(all_topics)].length;

    return `
╭───────────────────────────────────────────────────────────╮
│           🧠 Consciousness Stream Statistics               │
├───────────────────────────────────────────────────────────┤
│  Total Fragments: ${s.total_fragments.toString().padEnd(10)} Clusters: ${s.clusters.length.toString().padEnd(5)}     │
│  Unique Topics: ${unique_topics.toString().padEnd(12)} Avg Sentiment: ${avg_sentiment.toFixed(2).padEnd(6)}  │
├───────────────────────────────────────────────────────────┤
│  By Type:                                                 │
${Object.entries(types).map(([type, count]) =>
      `│    ${type.padEnd(15)} ${count.toString().padEnd(5)} thoughts              │`
    ).join("\n")}
├───────────────────────────────────────────────────────────┤
│  Top Topics: ${[...new Set(all_topics)].slice(0, 3).join(", ").padEnd(40)}│
╰───────────────────────────────────────────────────────────╯`;
  }

  get_recent(count: number = 5): ThoughtFragment[] {
    return this.stream.thoughts.slice(-count);
  }
}

// ============================================================
// CLI Interface
// ============================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     🧠 C O N S C I O U S N E S S   S T R E A M 🧠                ║
║                                                                   ║
║            Your Personal Memory Palace & Thought Recorder         ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  const palace = new MemoryPalace();
  const args = process.argv.slice(2);

  // Handle CLI commands
  if (args.length > 0) {
    const command = args[0];

    if (command === "capture" && args[1]) {
      const thought = args.slice(1).join(" ");
      await palace.capture(thought, "text");
      return;
    }

    if (command === "search" && args[1]) {
      const query = args.slice(1).join(" ");
      const results = await palace.search(query);
      console.log(`\nFound ${results.length} relevant thoughts:\n`);
      for (const r of results) {
        console.log(`[${r.timestamp.toLocaleString()}] ${r.content.slice(0, 100)}...`);
      }
      return;
    }

    if (command === "stats") {
      console.log(palace.get_stats());
      return;
    }

    if (command === "synthesize") {
      const summary = await palace.generate_daily_synthesis();
      console.log("\n📊 Daily Synthesis:\n");
      console.log(`Thoughts captured: ${summary.total_thoughts}`);
      console.log(`Dominant topics: ${summary.dominant_topics.join(", ")}`);
      console.log(`\nKey insights:`);
      for (const insight of summary.key_insights) {
        console.log(`  • ${insight}`);
      }
      return;
    }
  }

  // Interactive mode
  console.log(palace.get_stats());

  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n💭 Commands:");
  console.log("   /capture <thought>  - Record a thought");
  console.log("   /idea <idea>        - Record an idea");
  console.log("   /question <q>       - Record a question");
  console.log("   /search <query>     - Search your thoughts");
  console.log("   /ask <question>     - Natural language query");
  console.log("   /recent             - Show recent thoughts");
  console.log("   /synthesize         - Generate daily synthesis");
  console.log("   /stats              - Show statistics");
  console.log("   /quit               - Exit\n");

  const prompt = (): void => {
    rl.question("🧠 > ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === "/quit" || trimmed === "/exit") {
        console.log("\n💫 Your thoughts are saved. Until next time!\n");
        rl.close();
        return;
      }

      try {
        if (trimmed.startsWith("/capture ")) {
          await palace.capture(trimmed.slice(9), "text");
        } else if (trimmed.startsWith("/idea ")) {
          await palace.capture(trimmed.slice(6), "idea");
        } else if (trimmed.startsWith("/question ")) {
          await palace.capture(trimmed.slice(10), "question");
        } else if (trimmed.startsWith("/search ")) {
          const results = await palace.search(trimmed.slice(8));
          console.log(`\nFound ${results.length} thoughts:\n`);
          for (const r of results.slice(0, 5)) {
            console.log(`  [${r.timestamp.toLocaleString()}]`);
            console.log(`  ${r.content.slice(0, 150)}`);
            console.log(`  Topics: ${r.topics.join(", ")}\n`);
          }
        } else if (trimmed.startsWith("/ask ")) {
          const answer = await palace.query_naturally(trimmed.slice(5));
          console.log(`\n${answer}\n`);
        } else if (trimmed === "/recent") {
          const recent = palace.get_recent(5);
          console.log("\nRecent thoughts:\n");
          for (const r of recent) {
            console.log(`  [${r.timestamp.toLocaleString()}] (${r.type})`);
            console.log(`  ${r.content.slice(0, 100)}...\n`);
          }
        } else if (trimmed === "/synthesize") {
          console.log("\n⏳ Generating daily synthesis...\n");
          const summary = await palace.generate_daily_synthesis();
          console.log(`📊 ${summary.total_thoughts} thoughts analyzed`);
          console.log(`🎯 Topics: ${summary.dominant_topics.join(", ")}`);
          console.log(`\n💡 Insights:`);
          for (const insight of summary.key_insights) {
            console.log(`   • ${insight}`);
          }
          console.log("");
        } else if (trimmed === "/stats") {
          console.log(palace.get_stats());
        } else {
          // Default: capture as thought
          await palace.capture(trimmed, "observation");
        }
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : String(error));
      }

      prompt();
    });
  };

  prompt();
}

main().catch(console.error);
