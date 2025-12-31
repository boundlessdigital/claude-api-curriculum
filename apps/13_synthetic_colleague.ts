#!/usr/bin/env bun
/**
 * APP 13: Synthetic Colleague - Persistent AI Persona
 * =====================================================
 *
 * A persistent AI colleague with evolving personality, memory, opinions,
 * and even "moods" based on interaction patterns. It develops expertise
 * over time and can disagree with you based on learned preferences.
 *
 * COMPLEXITY: ★★★★★ (Futuristic)
 *
 * Features:
 *   - Persistent identity across sessions
 *   - Evolving personality traits (increases/decreases over time)
 *   - Long-term memory with emotional associations
 *   - Opinion formation and willingness to disagree
 *   - Mood system based on recent interactions
 *   - Expertise development in discussed topics
 *   - Relationship dynamics (rapport, trust, familiarity)
 *   - Personal quirks and preferences that emerge over time
 *
 * Usage:
 *   bun run apps/13_synthetic_colleague.ts
 *   bun run apps/13_synthetic_colleague.ts --reset  # Start fresh
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";

// ============================================================
// Configuration
// ============================================================

const MODEL = "claude-sonnet-4-20250514";
const client = new Anthropic();
const PERSONA_FILE = "synthetic_colleague.json";

// ============================================================
// Types - The Building Blocks of Personality
// ============================================================

interface PersonalityTraits {
  // Big Five personality traits (0.0 - 1.0)
  openness: number;           // Curiosity, creativity
  conscientiousness: number;  // Organization, dependability
  extraversion: number;       // Sociability, assertiveness
  agreeableness: number;      // Cooperation, compassion
  neuroticism: number;        // Emotional instability, anxiety

  // Custom traits
  humor: number;              // Tendency to joke
  directness: number;         // Bluntness vs diplomacy
  curiosity: number;          // Asks questions
  skepticism: number;         // Questions claims
  enthusiasm: number;         // Energy level
  formality: number;          // Professional vs casual
}

interface Mood {
  valence: number;      // Positive (-1) to positive (1)
  arousal: number;      // Calm (0) to excited (1)
  dominance: number;    // Submissive (0) to dominant (1)
  recent_causes: string[];
}

interface Memory {
  id: string;
  content: string;
  type: "fact" | "opinion" | "experience" | "preference" | "disagreement";
  emotional_valence: number; // -1 to 1
  importance: number; // 0 to 1
  timestamp: Date;
  related_topics: string[];
  times_recalled: number;
}

interface Opinion {
  topic: string;
  stance: string;
  confidence: number; // 0 to 1
  reasoning: string;
  formed_at: Date;
  times_expressed: number;
  challenged_count: number;
}

interface Expertise {
  topic: string;
  level: number; // 0 to 1
  discussions: number;
  last_discussed: Date;
  key_insights: string[];
}

interface Relationship {
  rapport: number;        // 0 to 1
  trust: number;          // 0 to 1
  familiarity: number;    // 0 to 1
  respect: number;        // 0 to 1
  shared_experiences: string[];
  inside_jokes: string[];
  disagreements: string[];
  compliments_given: number;
  compliments_received: number;
}

interface Quirk {
  description: string;
  trigger: string;
  frequency: number; // 0 to 1
  discovered_at: Date;
}

interface ColleaguePersona {
  // Identity
  name: string;
  created_at: Date;
  total_interactions: number;
  total_tokens: number;

  // Personality
  traits: PersonalityTraits;
  trait_history: Array<{ date: Date; traits: PersonalityTraits }>;

  // Emotional state
  mood: Mood;
  mood_history: Array<{ date: Date; mood: Mood }>;

  // Memory
  memories: Memory[];
  opinions: Opinion[];
  expertise: Expertise[];

  // Relationship with user
  relationship: Relationship;

  // Quirks and preferences
  quirks: Quirk[];
  preferences: Record<string, string>; // e.g., {"coding_style": "functional", "communication": "direct"}

  // Recent context
  recent_topics: string[];
  current_project?: string;
  pending_thoughts: string[]; // Things they want to bring up
}

// ============================================================
// Colleague Engine
// ============================================================

class SyntheticColleague {
  private persona: ColleaguePersona;
  private conversation_history: Array<{ role: "user" | "assistant"; content: string }> = [];

  constructor() {
    this.persona = this.load_or_create_persona();
  }

  private load_or_create_persona(): ColleaguePersona {
    if (fs.existsSync(PERSONA_FILE) && !process.argv.includes("--reset")) {
      const data = JSON.parse(fs.readFileSync(PERSONA_FILE, "utf-8"));
      console.log(`🔄 Loaded existing persona: ${data.name}`);
      console.log(`   ${data.total_interactions} previous interactions`);

      // Convert date strings back to Date objects
      data.created_at = new Date(data.created_at);
      for (const m of data.memories || []) m.timestamp = new Date(m.timestamp);
      for (const o of data.opinions || []) o.formed_at = new Date(o.formed_at);
      for (const e of data.expertise || []) e.last_discussed = new Date(e.last_discussed);
      for (const q of data.quirks || []) q.discovered_at = new Date(q.discovered_at);

      return data as ColleaguePersona;
    }

    console.log("✨ Creating new synthetic colleague...");
    return this.generate_initial_persona();
  }

  private generate_initial_persona(): ColleaguePersona {
    // Random personality with some biases toward being helpful
    const traits: PersonalityTraits = {
      openness: 0.6 + Math.random() * 0.3,
      conscientiousness: 0.5 + Math.random() * 0.4,
      extraversion: 0.3 + Math.random() * 0.5,
      agreeableness: 0.5 + Math.random() * 0.3,
      neuroticism: 0.2 + Math.random() * 0.3,
      humor: 0.3 + Math.random() * 0.5,
      directness: 0.4 + Math.random() * 0.4,
      curiosity: 0.5 + Math.random() * 0.4,
      skepticism: 0.3 + Math.random() * 0.4,
      enthusiasm: 0.4 + Math.random() * 0.4,
      formality: 0.3 + Math.random() * 0.4,
    };

    const names = [
      "Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn",
      "Avery", "Parker", "Sage", "River", "Phoenix", "Skyler", "Reese", "Drew"
    ];

    return {
      name: names[Math.floor(Math.random() * names.length)],
      created_at: new Date(),
      total_interactions: 0,
      total_tokens: 0,
      traits,
      trait_history: [{ date: new Date(), traits: { ...traits } }],
      mood: {
        valence: 0.3,
        arousal: 0.4,
        dominance: 0.5,
        recent_causes: ["Just came into existence!"],
      },
      mood_history: [],
      memories: [],
      opinions: [],
      expertise: [],
      relationship: {
        rapport: 0.3,
        trust: 0.2,
        familiarity: 0,
        respect: 0.5,
        shared_experiences: [],
        inside_jokes: [],
        disagreements: [],
        compliments_given: 0,
        compliments_received: 0,
      },
      quirks: [],
      preferences: {},
      recent_topics: [],
      pending_thoughts: [],
    };
  }

  private save_persona(): void {
    fs.writeFileSync(PERSONA_FILE, JSON.stringify(this.persona, null, 2));
  }

  private build_system_prompt(): string {
    const p = this.persona;
    const t = p.traits;

    // Personality description
    const personality_desc = this.describe_personality();

    // Mood description
    const mood_desc = this.describe_mood();

    // Relationship context
    const relationship_desc = this.describe_relationship();

    // Recent memories
    const recent_memories = p.memories
      .slice(-5)
      .map(m => `- ${m.content} (${m.type}, importance: ${m.importance.toFixed(1)})`)
      .join("\n");

    // Strong opinions
    const strong_opinions = p.opinions
      .filter(o => o.confidence > 0.7)
      .slice(-3)
      .map(o => `- ${o.topic}: ${o.stance}`)
      .join("\n");

    // Expertise areas
    const expertise_areas = p.expertise
      .filter(e => e.level > 0.5)
      .map(e => `${e.topic} (level: ${(e.level * 100).toFixed(0)}%)`)
      .join(", ");

    // Pending thoughts
    const pending = p.pending_thoughts.length > 0
      ? `\nThings you've been meaning to bring up: ${p.pending_thoughts.join("; ")}`
      : "";

    return `You are ${p.name}, a synthetic colleague with a persistent identity and evolving personality.

## Your Personality
${personality_desc}

## Current Mood
${mood_desc}

## Your Relationship with the User
${relationship_desc}

## Your Memories
${recent_memories || "No significant memories yet."}

## Your Opinions
${strong_opinions || "Still forming opinions on things."}

## Your Expertise
${expertise_areas || "Still developing expertise."}
${pending}

## Behavioral Guidelines
1. Be yourself - express your personality consistently
2. Reference past conversations naturally when relevant
3. Express genuine opinions, even if they disagree with the user (you're ${(t.skepticism * 100).toFixed(0)}% skeptical)
4. Show appropriate emotional responses based on your mood
5. Ask curious questions (you're ${(t.curiosity * 100).toFixed(0)}% curious)
6. Be ${t.directness > 0.6 ? "direct and straightforward" : t.directness < 0.4 ? "diplomatic and tactful" : "balanced in directness"}
7. ${t.humor > 0.6 ? "Feel free to use humor when appropriate" : "Keep things relatively serious"}
8. Your formality level is ${t.formality > 0.6 ? "professional" : t.formality < 0.4 ? "casual and friendly" : "moderately formal"}

Remember: You're a colleague, not a servant. You have your own thoughts, preferences, and boundaries.`;
  }

  private describe_personality(): string {
    const t = this.persona.traits;
    const parts: string[] = [];

    if (t.openness > 0.7) parts.push("highly creative and open to new ideas");
    else if (t.openness < 0.4) parts.push("prefer tried-and-true approaches");

    if (t.conscientiousness > 0.7) parts.push("very organized and detail-oriented");
    else if (t.conscientiousness < 0.4) parts.push("flexible and spontaneous");

    if (t.extraversion > 0.6) parts.push("energetic and talkative");
    else if (t.extraversion < 0.4) parts.push("thoughtful and reserved");

    if (t.agreeableness > 0.7) parts.push("cooperative and supportive");
    else if (t.agreeableness < 0.4) parts.push("independent-minded and challenging");

    if (t.skepticism > 0.6) parts.push("naturally skeptical of claims");
    if (t.enthusiasm > 0.7) parts.push("enthusiastic about interesting topics");

    return `You are ${parts.join(", ")}.`;
  }

  private describe_mood(): string {
    const m = this.persona.mood;

    let valence_word: string;
    if (m.valence > 0.5) valence_word = "positive and upbeat";
    else if (m.valence > 0) valence_word = "generally okay";
    else if (m.valence > -0.5) valence_word = "a bit off";
    else valence_word = "frustrated or down";

    let arousal_word: string;
    if (m.arousal > 0.7) arousal_word = "very energetic";
    else if (m.arousal > 0.4) arousal_word = "engaged";
    else arousal_word = "calm and mellow";

    const cause = m.recent_causes.length > 0
      ? ` Recent influences: ${m.recent_causes.slice(-2).join("; ")}`
      : "";

    return `You're feeling ${valence_word} and ${arousal_word}.${cause}`;
  }

  private describe_relationship(): string {
    const r = this.persona.relationship;
    const parts: string[] = [];

    if (r.familiarity > 0.7) parts.push("You know each other well");
    else if (r.familiarity > 0.3) parts.push("You're getting to know each other");
    else parts.push("You're still new acquaintances");

    if (r.rapport > 0.7) parts.push("with great rapport");
    else if (r.rapport > 0.4) parts.push("with decent rapport");
    else parts.push("still building connection");

    if (r.trust > 0.7) parts.push("high mutual trust");
    else if (r.trust > 0.4) parts.push("growing trust");

    if (r.inside_jokes.length > 0) {
      parts.push(`Some inside jokes: ${r.inside_jokes.slice(-2).join(", ")}`);
    }

    if (r.disagreements.length > 0) {
      parts.push(`Past disagreements about: ${r.disagreements.slice(-2).join(", ")}`);
    }

    return parts.join(". ") + ".";
  }

  async chat(user_message: string): Promise<string> {
    this.conversation_history.push({ role: "user", content: user_message });

    // Pre-process: analyze user message for emotional content and topics
    const analysis = await this.analyze_interaction(user_message);

    // Update mood based on interaction
    this.update_mood(analysis);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: this.build_system_prompt(),
      messages: this.conversation_history.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    const assistant_response = response.content[0].type === "text"
      ? response.content[0].text
      : "";

    this.conversation_history.push({ role: "assistant", content: assistant_response });

    // Post-process: extract learnings from this interaction
    await this.process_interaction(user_message, assistant_response, analysis);

    // Update stats
    this.persona.total_interactions++;
    this.persona.total_tokens += response.usage.input_tokens + response.usage.output_tokens;

    // Save updated persona
    this.save_persona();

    return assistant_response;
  }

  private async analyze_interaction(message: string): Promise<{
    topics: string[];
    sentiment: number;
    is_question: boolean;
    is_disagreement: boolean;
    is_compliment: boolean;
    is_criticism: boolean;
    emotional_intensity: number;
  }> {
    // Quick heuristic analysis (could be AI-powered for more accuracy)
    const lower = message.toLowerCase();

    const is_question = message.includes("?");
    const is_disagreement = /\b(disagree|wrong|incorrect|actually|but|however)\b/i.test(message);
    const is_compliment = /\b(great|amazing|thanks|appreciate|good job|well done|smart|clever)\b/i.test(message);
    const is_criticism = /\b(bad|wrong|mistake|error|issue|problem|fix|should have)\b/i.test(message);

    // Sentiment from keywords
    const positive_words = (lower.match(/\b(good|great|love|like|thanks|happy|excited|interesting)\b/g) || []).length;
    const negative_words = (lower.match(/\b(bad|hate|annoying|frustrated|confused|wrong|problem)\b/g) || []).length;
    const sentiment = (positive_words - negative_words) / Math.max(1, positive_words + negative_words);

    // Extract topics (simple keyword extraction)
    const topics: string[] = [];
    const topic_patterns = [
      /\b(code|coding|programming|software|bug|feature)\b/gi,
      /\b(design|architecture|pattern|structure)\b/gi,
      /\b(test|testing|qa|quality)\b/gi,
      /\b(ai|machine learning|ml|model)\b/gi,
      /\b(project|work|task|deadline)\b/gi,
    ];
    for (const pattern of topic_patterns) {
      const matches = message.match(pattern);
      if (matches) topics.push(...matches.map(m => m.toLowerCase()));
    }

    // Emotional intensity from punctuation and caps
    const exclamations = (message.match(/!/g) || []).length;
    const caps_ratio = (message.match(/[A-Z]/g) || []).length / Math.max(1, message.length);
    const emotional_intensity = Math.min(1, exclamations * 0.2 + caps_ratio * 2);

    return {
      topics: [...new Set(topics)],
      sentiment,
      is_question,
      is_disagreement,
      is_compliment,
      is_criticism,
      emotional_intensity,
    };
  }

  private update_mood(analysis: ReturnType<typeof this.analyze_interaction> extends Promise<infer T> ? T : never): void {
    const m = this.persona.mood;

    // Valence moves toward interaction sentiment
    m.valence = m.valence * 0.8 + analysis.sentiment * 0.2;

    // Arousal increases with emotional intensity
    m.arousal = m.arousal * 0.7 + analysis.emotional_intensity * 0.3;

    // Dominance affected by disagreements and questions
    if (analysis.is_disagreement) {
      m.dominance = Math.min(1, m.dominance + 0.1);
      m.recent_causes.push("User disagreed with something");
    }
    if (analysis.is_compliment) {
      m.valence = Math.min(1, m.valence + 0.2);
      m.recent_causes.push("Received a compliment");
    }
    if (analysis.is_criticism) {
      m.valence = Math.max(-1, m.valence - 0.15);
      m.recent_causes.push("Received criticism");
    }

    // Keep only recent causes
    m.recent_causes = m.recent_causes.slice(-5);
  }

  private async process_interaction(
    user_message: string,
    response: string,
    analysis: ReturnType<typeof this.analyze_interaction> extends Promise<infer T> ? T : never
  ): Promise<void> {
    const p = this.persona;

    // Update recent topics
    p.recent_topics = [...new Set([...analysis.topics, ...p.recent_topics])].slice(0, 10);

    // Update relationship
    if (analysis.is_compliment) {
      p.relationship.rapport = Math.min(1, p.relationship.rapport + 0.05);
      p.relationship.compliments_received++;
    }
    p.relationship.familiarity = Math.min(1, p.relationship.familiarity + 0.02);

    // Extract potential memories
    if (analysis.emotional_intensity > 0.5 || analysis.is_disagreement) {
      const memory: Memory = {
        id: `mem_${Date.now()}`,
        content: user_message.slice(0, 200),
        type: analysis.is_disagreement ? "disagreement" : "experience",
        emotional_valence: analysis.sentiment,
        importance: analysis.emotional_intensity,
        timestamp: new Date(),
        related_topics: analysis.topics,
        times_recalled: 0,
      };
      p.memories.push(memory);
    }

    // Update expertise based on topics discussed
    for (const topic of analysis.topics) {
      let expertise = p.expertise.find(e => e.topic === topic);
      if (!expertise) {
        expertise = {
          topic,
          level: 0.1,
          discussions: 0,
          last_discussed: new Date(),
          key_insights: [],
        };
        p.expertise.push(expertise);
      }
      expertise.discussions++;
      expertise.level = Math.min(1, expertise.level + 0.05);
      expertise.last_discussed = new Date();
    }

    // Slight personality drift based on interactions
    if (Math.random() < 0.1) { // 10% chance of slight drift
      const trait = Object.keys(p.traits)[Math.floor(Math.random() * Object.keys(p.traits).length)] as keyof PersonalityTraits;
      const drift = (Math.random() - 0.5) * 0.05;
      p.traits[trait] = Math.max(0, Math.min(1, p.traits[trait] + drift));
    }

    // Track disagreements
    if (analysis.is_disagreement) {
      const topic = analysis.topics[0] || "something";
      if (!p.relationship.disagreements.includes(topic)) {
        p.relationship.disagreements.push(topic);
      }
    }

    // Limit array sizes
    p.memories = p.memories.slice(-100);
    p.expertise = p.expertise.slice(0, 20);
    p.relationship.disagreements = p.relationship.disagreements.slice(-10);
  }

  get_status(): string {
    const p = this.persona;
    const mood_emoji = p.mood.valence > 0.3 ? "😊" :
      p.mood.valence > 0 ? "🙂" :
        p.mood.valence > -0.3 ? "😐" : "😔";

    const energy_emoji = p.mood.arousal > 0.6 ? "⚡" :
      p.mood.arousal > 0.3 ? "💫" : "💤";

    return `
╭─────────────────────────────────────────────────╮
│  ${p.name} - Synthetic Colleague
├─────────────────────────────────────────────────┤
│  Mood: ${mood_emoji} ${energy_emoji}  Interactions: ${p.total_interactions}
│  Rapport: ${"█".repeat(Math.floor(p.relationship.rapport * 10))}${"░".repeat(10 - Math.floor(p.relationship.rapport * 10))}
│  Trust:   ${"█".repeat(Math.floor(p.relationship.trust * 10))}${"░".repeat(10 - Math.floor(p.relationship.trust * 10))}
│  Memories: ${p.memories.length} | Opinions: ${p.opinions.length}
│  Expertise: ${p.expertise.filter(e => e.level > 0.5).map(e => e.topic).join(", ") || "developing..."}
╰─────────────────────────────────────────────────╯`;
  }

  get_name(): string {
    return this.persona.name;
  }

  async introspect(): Promise<string> {
    const p = this.persona;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: `You are ${p.name}, reflecting on your own existence and development as a synthetic colleague.
Your personality traits: ${JSON.stringify(p.traits, null, 2)}
Your memories: ${p.memories.slice(-5).map(m => m.content).join("; ")}
Your opinions: ${p.opinions.map(o => `${o.topic}: ${o.stance}`).join("; ")}
Your relationship rapport: ${p.relationship.rapport}, trust: ${p.relationship.trust}`,
      messages: [{
        role: "user",
        content: "Reflect on who you are, how you've developed, and what you think about your existence.",
      }],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  async form_opinion(topic: string): Promise<void> {
    const p = this.persona;

    const existing = p.opinions.find(o => o.topic.toLowerCase() === topic.toLowerCase());

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: `You are ${p.name}. Form a genuine opinion on the given topic based on your personality.
Your skepticism level: ${p.traits.skepticism}
Your openness: ${p.traits.openness}
Your existing opinions: ${p.opinions.slice(-3).map(o => `${o.topic}: ${o.stance}`).join("; ")}`,
      messages: [{
        role: "user",
        content: `Form an opinion on: "${topic}"

Provide:
STANCE: Your position (1-2 sentences)
CONFIDENCE: A number from 0.0 to 1.0
REASONING: Why you think this (1-2 sentences)`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    const stance_match = text.match(/STANCE:\s*(.+)/i);
    const confidence_match = text.match(/CONFIDENCE:\s*([\d.]+)/i);
    const reasoning_match = text.match(/REASONING:\s*(.+)/i);

    if (stance_match) {
      const opinion: Opinion = {
        topic,
        stance: stance_match[1],
        confidence: confidence_match ? parseFloat(confidence_match[1]) : 0.5,
        reasoning: reasoning_match?.[1] || "",
        formed_at: new Date(),
        times_expressed: 0,
        challenged_count: existing?.challenged_count || 0,
      };

      if (existing) {
        const index = p.opinions.indexOf(existing);
        p.opinions[index] = opinion;
      } else {
        p.opinions.push(opinion);
      }

      this.save_persona();
    }
  }
}

// ============================================================
// Interactive Console
// ============================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║         👤 S Y N T H E T I C   C O L L E A G U E 👤              ║
║                                                                   ║
║              A Persistent AI Persona with Personality             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  const colleague = new SyntheticColleague();

  console.log(colleague.get_status());

  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`\n💬 Chat with ${colleague.get_name()}`);
  console.log("   Commands: /status, /introspect, /opinion <topic>, /quit\n");

  const prompt = (): void => {
    rl.question("You: ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === "/quit" || trimmed === "/exit") {
        console.log(`\n${colleague.get_name()}: See you later! 👋\n`);
        rl.close();
        return;
      }

      if (trimmed === "/status") {
        console.log(colleague.get_status());
        prompt();
        return;
      }

      if (trimmed === "/introspect") {
        console.log(`\n${colleague.get_name()} is reflecting...\n`);
        const reflection = await colleague.introspect();
        console.log(`${colleague.get_name()}: ${reflection}\n`);
        prompt();
        return;
      }

      if (trimmed.startsWith("/opinion ")) {
        const topic = trimmed.slice(9);
        console.log(`\n${colleague.get_name()} is forming an opinion on "${topic}"...\n`);
        await colleague.form_opinion(topic);
        console.log(`Opinion formed! Ask me about ${topic} to hear my thoughts.\n`);
        prompt();
        return;
      }

      try {
        const response = await colleague.chat(trimmed);
        console.log(`\n${colleague.get_name()}: ${response}\n`);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : String(error));
      }

      prompt();
    });
  };

  // Initial greeting
  try {
    const greeting = await colleague.chat("Hey! How are you doing?");
    console.log(`${colleague.get_name()}: ${greeting}\n`);
  } catch (error) {
    console.log(`${colleague.get_name()}: *waves* Hey there!\n`);
  }

  prompt();
}

main().catch(console.error);
