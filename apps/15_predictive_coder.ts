#!/usr/bin/env bun
/**
 * APP 15: Predictive Code Writer
 * ================================
 *
 * Instead of autocomplete, this agent watches your coding patterns and
 * PREDICTS what feature you'll want to build next, then drafts it before
 * you ask. Uses temporal pattern recognition and your git history to
 * anticipate developer intent.
 *
 * COMPLEXITY: ★★★★★ (Futuristic)
 *
 * Features:
 *   - Learns your coding patterns from git history
 *   - Analyzes TODO comments and incomplete code
 *   - Predicts next likely features/fixes
 *   - Pre-generates code you'll probably need
 *   - Detects "coding momentum" and common sequences
 *   - Suggests before you even think to ask
 *
 * Usage:
 *   bun run apps/15_predictive_coder.ts
 *   bun run apps/15_predictive_coder.ts --watch  # Continuous monitoring
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import { spawn } from "child_process";

// ============================================================
// Configuration
// ============================================================

const MODEL = "claude-sonnet-4-20250514";
const client = new Anthropic();
const PATTERNS_FILE = "predictive_coder_patterns.json";

// ============================================================
// Types
// ============================================================

interface CodingPattern {
  id: string;
  description: string;
  trigger_conditions: string[];
  typical_next_action: string;
  confidence: number;
  occurrences: number;
  last_seen: Date;
}

interface CodePrediction {
  id: string;
  predicted_at: Date;
  prediction_type: "feature" | "fix" | "refactor" | "test" | "docs";
  description: string;
  confidence: number;
  reasoning: string;
  generated_code?: string;
  file_path?: string;
  was_accurate?: boolean;
}

interface FileState {
  path: string;
  last_modified: Date;
  recent_changes: string[];
  todos: string[];
  incomplete_functions: string[];
  import_patterns: string[];
}

interface DeveloperProfile {
  // Timing patterns
  active_hours: number[];
  avg_commit_size: number;
  commits_per_day: number;

  // Coding style
  preferred_patterns: string[];
  common_sequences: string[][]; // e.g., ["add feature", "add tests", "update docs"]
  typical_file_changes: Record<string, string[]>; // file A often followed by file B

  // Current session
  current_focus_area?: string;
  recent_file_changes: FileState[];
  momentum_direction?: string; // "building feature" | "fixing bugs" | "refactoring"
}

interface PredictiveCoderState {
  created_at: Date;
  patterns: CodingPattern[];
  predictions: CodePrediction[];
  developer_profile: DeveloperProfile;
  accuracy_stats: {
    total_predictions: number;
    accurate_predictions: number;
  };
}

// ============================================================
// Git History Analyzer
// ============================================================

async function run_git_command(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args);
    let output = "";
    let error = "";

    proc.stdout.on("data", (data) => { output += data; });
    proc.stderr.on("data", (data) => { error += data; });

    proc.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(error || `Git command failed with code ${code}`));
    });
  });
}

async function analyze_git_history(): Promise<{
  recent_commits: Array<{ hash: string; message: string; files: string[]; date: Date }>;
  file_change_patterns: Record<string, string[]>;
  commit_sequences: string[][];
}> {
  try {
    // Get recent commits
    const log = await run_git_command([
      "log", "--oneline", "-30", "--name-only", "--format=%H|%s|%aI"
    ]);

    const commits: Array<{ hash: string; message: string; files: string[]; date: Date }> = [];
    let current_commit: { hash: string; message: string; files: string[]; date: Date } | null = null;

    for (const line of log.split("\n")) {
      if (line.includes("|")) {
        if (current_commit) commits.push(current_commit);
        const [hash, message, date] = line.split("|");
        current_commit = { hash, message, files: [], date: new Date(date) };
      } else if (line.trim() && current_commit) {
        current_commit.files.push(line.trim());
      }
    }
    if (current_commit) commits.push(current_commit);

    // Analyze file change patterns
    const file_patterns: Record<string, string[]> = {};
    for (let i = 0; i < commits.length - 1; i++) {
      for (const file of commits[i].files) {
        if (!file_patterns[file]) file_patterns[file] = [];
        file_patterns[file].push(...commits[i + 1].files);
      }
    }

    // Extract commit message sequences
    const sequences: string[][] = [];
    for (let i = 0; i < commits.length - 2; i++) {
      sequences.push([
        categorize_commit(commits[i].message),
        categorize_commit(commits[i + 1].message),
        categorize_commit(commits[i + 2].message),
      ]);
    }

    return { recent_commits: commits, file_change_patterns: file_patterns, commit_sequences: sequences };
  } catch {
    return { recent_commits: [], file_change_patterns: {}, commit_sequences: [] };
  }
}

function categorize_commit(message: string): string {
  const lower = message.toLowerCase();
  if (/^(feat|add|implement)/i.test(lower)) return "feature";
  if (/^(fix|bug|patch)/i.test(lower)) return "fix";
  if (/^(refactor|clean|improve)/i.test(lower)) return "refactor";
  if (/^(test|spec)/i.test(lower)) return "test";
  if (/^(doc|readme|comment)/i.test(lower)) return "docs";
  if (/^(chore|update|bump)/i.test(lower)) return "chore";
  return "other";
}

// ============================================================
// Code Analyzer
// ============================================================

async function analyze_file(path: string): Promise<FileState | null> {
  try {
    const content = fs.readFileSync(path, "utf-8");
    const lines = content.split("\n");

    // Find TODOs
    const todos: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\/\/\s*TODO:?\s*(.+)/i) ||
        lines[i].match(/#\s*TODO:?\s*(.+)/i);
      if (match) todos.push(`Line ${i + 1}: ${match[1].trim()}`);
    }

    // Find incomplete functions (functions with // TODO or empty bodies)
    const incomplete: string[] = [];
    const func_pattern = /(?:function|const|let|var)\s+(\w+)\s*=?\s*(?:\([^)]*\)|async\s*\([^)]*\))\s*(?:=>)?\s*\{/g;
    let match;
    while ((match = func_pattern.exec(content)) !== null) {
      const start = match.index;
      const name = match[1];
      // Check if next 50 chars contain TODO or throw
      const snippet = content.slice(start, start + 200);
      if (/TODO|throw new Error\("not implemented"\)/i.test(snippet)) {
        incomplete.push(name);
      }
    }

    // Find imports
    const imports: string[] = [];
    const import_pattern = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = import_pattern.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return {
      path,
      last_modified: fs.statSync(path).mtime,
      recent_changes: [], // Would need git diff
      todos,
      incomplete_functions: incomplete,
      import_patterns: imports,
    };
  } catch {
    return null;
  }
}

// ============================================================
// Predictive Engine
// ============================================================

class PredictiveCoder {
  private state: PredictiveCoderState;

  constructor() {
    this.state = this.load_or_create();
  }

  private load_or_create(): PredictiveCoderState {
    if (fs.existsSync(PATTERNS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PATTERNS_FILE, "utf-8"));
      console.log(`📊 Loaded patterns: ${data.patterns.length} known patterns`);
      return data;
    }

    return {
      created_at: new Date(),
      patterns: [],
      predictions: [],
      developer_profile: {
        active_hours: [],
        avg_commit_size: 0,
        commits_per_day: 0,
        preferred_patterns: [],
        common_sequences: [],
        typical_file_changes: {},
        recent_file_changes: [],
      },
      accuracy_stats: { total_predictions: 0, accurate_predictions: 0 },
    };
  }

  private save(): void {
    fs.writeFileSync(PATTERNS_FILE, JSON.stringify(this.state, null, 2));
  }

  async learn_from_history(): Promise<void> {
    console.log("📚 Learning from git history...\n");

    const history = await analyze_git_history();

    if (history.recent_commits.length === 0) {
      console.log("   No git history found. Learning will improve as you commit.\n");
      return;
    }

    // Update developer profile
    const profile = this.state.developer_profile;

    // Analyze commit times
    const hours = history.recent_commits.map(c => c.date.getHours());
    profile.active_hours = [...new Set(hours)].sort((a, b) => a - b);

    // Analyze commit sizes
    const sizes = history.recent_commits.map(c => c.files.length);
    profile.avg_commit_size = sizes.reduce((a, b) => a + b, 0) / sizes.length;

    // Analyze file change patterns
    profile.typical_file_changes = history.file_change_patterns;

    // Analyze commit sequences
    profile.common_sequences = history.commit_sequences.slice(0, 10);

    // Extract patterns
    await this.extract_patterns(history);

    console.log(`   ✓ Analyzed ${history.recent_commits.length} commits`);
    console.log(`   ✓ Found ${Object.keys(profile.typical_file_changes).length} file change patterns`);
    console.log(`   ✓ Identified ${profile.common_sequences.length} common sequences\n`);

    this.save();
  }

  private async extract_patterns(history: {
    recent_commits: Array<{ hash: string; message: string; files: string[]; date: Date }>;
    file_change_patterns: Record<string, string[]>;
    commit_sequences: string[][];
  }): Promise<void> {
    // Pattern: After adding a feature file, usually add tests
    const feature_files = history.recent_commits
      .filter(c => categorize_commit(c.message) === "feature")
      .flatMap(c => c.files);

    for (const file of feature_files) {
      if (file.includes(".ts") && !file.includes(".test.") && !file.includes(".spec.")) {
        const test_follows = history.file_change_patterns[file]?.some(f =>
          f.includes(".test.") || f.includes(".spec.")
        );

        if (test_follows) {
          this.add_pattern({
            id: `pattern_test_after_feature_${Date.now()}`,
            description: "Tests usually follow new feature files",
            trigger_conditions: [`New file: ${file.split("/").pop()}`],
            typical_next_action: "Add tests for the new feature",
            confidence: 0.7,
            occurrences: 1,
            last_seen: new Date(),
          });
        }
      }
    }

    // Pattern: Commit sequences
    for (const seq of history.commit_sequences) {
      if (seq[0] === "feature" && seq[1] === "test") {
        this.add_pattern({
          id: `pattern_feature_test_${Date.now()}`,
          description: "Tests follow features",
          trigger_conditions: ["Just committed a feature"],
          typical_next_action: "Write tests for the feature",
          confidence: 0.8,
          occurrences: 1,
          last_seen: new Date(),
        });
      }
      if (seq[0] === "fix" && seq[1] === "fix") {
        this.add_pattern({
          id: `pattern_bug_cluster_${Date.now()}`,
          description: "Bug fixes come in clusters",
          trigger_conditions: ["Just fixed a bug"],
          typical_next_action: "Look for related bugs",
          confidence: 0.6,
          occurrences: 1,
          last_seen: new Date(),
        });
      }
    }
  }

  private add_pattern(pattern: CodingPattern): void {
    const existing = this.state.patterns.find(p => p.description === pattern.description);
    if (existing) {
      existing.occurrences++;
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      existing.last_seen = new Date();
    } else {
      this.state.patterns.push(pattern);
    }
  }

  async analyze_current_state(): Promise<{
    current_focus: string;
    open_todos: string[];
    incomplete_work: string[];
    likely_next_steps: string[];
  }> {
    console.log("🔍 Analyzing current codebase state...\n");

    // Find recently modified files
    const recent_files: string[] = [];
    try {
      const status = await run_git_command(["status", "--porcelain"]);
      for (const line of status.split("\n")) {
        if (line.trim()) {
          const file = line.slice(3).trim();
          if (fs.existsSync(file)) recent_files.push(file);
        }
      }
    } catch {
      // Not in a git repo, scan current directory
      const files = fs.readdirSync(".").filter(f => f.endsWith(".ts") || f.endsWith(".js"));
      recent_files.push(...files);
    }

    // Analyze each file
    const all_todos: string[] = [];
    const all_incomplete: string[] = [];

    for (const file of recent_files.slice(0, 10)) {
      const state = await analyze_file(file);
      if (state) {
        all_todos.push(...state.todos.map(t => `${file}: ${t}`));
        all_incomplete.push(...state.incomplete_functions.map(f => `${file}: ${f}()`));
      }
    }

    // Determine focus area
    let focus = "general development";
    if (recent_files.some(f => f.includes("test"))) focus = "testing";
    else if (recent_files.some(f => f.includes("api") || f.includes("route"))) focus = "API development";
    else if (recent_files.some(f => f.includes("component"))) focus = "UI development";

    // Generate likely next steps
    const next_steps: string[] = [];
    if (all_todos.length > 0) next_steps.push(`Complete TODO: ${all_todos[0]}`);
    if (all_incomplete.length > 0) next_steps.push(`Implement: ${all_incomplete[0]}`);
    if (focus === "testing") next_steps.push("Run tests and fix failures");

    console.log(`   Focus area: ${focus}`);
    console.log(`   Open TODOs: ${all_todos.length}`);
    console.log(`   Incomplete functions: ${all_incomplete.length}\n`);

    return {
      current_focus: focus,
      open_todos: all_todos,
      incomplete_work: all_incomplete,
      likely_next_steps: next_steps,
    };
  }

  async make_predictions(): Promise<CodePrediction[]> {
    console.log("🔮 Generating predictions...\n");

    const state = await this.analyze_current_state();
    const predictions: CodePrediction[] = [];

    // Prediction 1: Based on TODOs
    if (state.open_todos.length > 0) {
      const todo = state.open_todos[0];
      const prediction = await this.predict_todo_implementation(todo);
      if (prediction) predictions.push(prediction);
    }

    // Prediction 2: Based on incomplete functions
    if (state.incomplete_work.length > 0) {
      const func = state.incomplete_work[0];
      const prediction = await this.predict_function_implementation(func);
      if (prediction) predictions.push(prediction);
    }

    // Prediction 3: Based on patterns
    for (const pattern of this.state.patterns.filter(p => p.confidence > 0.6)) {
      const prediction: CodePrediction = {
        id: `pred_pattern_${Date.now()}`,
        predicted_at: new Date(),
        prediction_type: "feature",
        description: pattern.typical_next_action,
        confidence: pattern.confidence,
        reasoning: `Pattern detected: ${pattern.description}`,
      };
      predictions.push(prediction);
    }

    // Store predictions
    this.state.predictions.push(...predictions);
    this.state.accuracy_stats.total_predictions += predictions.length;
    this.save();

    return predictions;
  }

  private async predict_todo_implementation(todo: string): Promise<CodePrediction | null> {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1000,
        system: `You are a predictive coding assistant. Generate code that likely fulfills the given TODO.`,
        messages: [{
          role: "user",
          content: `A developer has this TODO in their code:
"${todo}"

Predict what code they likely need to write. Provide:
1. A brief description of what needs to be done
2. The likely code implementation

Format:
DESCRIPTION: ...
CODE:
\`\`\`typescript
...
\`\`\``,
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";

      const desc_match = text.match(/DESCRIPTION:\s*(.+)/i);
      const code_match = text.match(/```(?:typescript|javascript)?\s*([\s\S]+?)```/);

      return {
        id: `pred_todo_${Date.now()}`,
        predicted_at: new Date(),
        prediction_type: "feature",
        description: desc_match?.[1] || "Implement TODO",
        confidence: 0.7,
        reasoning: `Based on TODO: ${todo}`,
        generated_code: code_match?.[1]?.trim(),
      };
    } catch {
      return null;
    }
  }

  private async predict_function_implementation(func: string): Promise<CodePrediction | null> {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: `You are a predictive coding assistant. Generate likely implementation for incomplete functions.`,
        messages: [{
          role: "user",
          content: `A developer has an incomplete function: ${func}

Based on the function name, predict what the implementation should be.
Be concise and practical.

Provide the likely implementation:`,
        }],
      });

      const code = response.content[0].type === "text" ? response.content[0].text : "";

      return {
        id: `pred_func_${Date.now()}`,
        predicted_at: new Date(),
        prediction_type: "feature",
        description: `Implement ${func}`,
        confidence: 0.6,
        reasoning: `Incomplete function detected: ${func}`,
        generated_code: code,
      };
    } catch {
      return null;
    }
  }

  async predict_next_feature(): Promise<CodePrediction | null> {
    console.log("🚀 Predicting next likely feature...\n");

    const history = await analyze_git_history();
    const state = await this.analyze_current_state();

    if (history.recent_commits.length === 0 && state.open_todos.length === 0) {
      console.log("   Not enough context to predict. Keep coding!\n");
      return null;
    }

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: `You are a predictive coding assistant that anticipates what a developer will build next.
Analyze their patterns and predict what feature or code they'll likely write next.`,
        messages: [{
          role: "user",
          content: `Developer's recent commits:
${history.recent_commits.slice(0, 10).map(c => `- ${c.message}`).join("\n")}

Current focus: ${state.current_focus}
Open TODOs: ${state.open_todos.slice(0, 3).join("; ") || "None"}
Incomplete work: ${state.incomplete_work.slice(0, 3).join("; ") || "None"}

Based on this context, predict what they'll likely code next.
Then, pre-generate that code.

Format:
PREDICTION: What they'll likely do next
CONFIDENCE: 0.0 to 1.0
REASONING: Why you think this
CODE:
\`\`\`typescript
// Pre-generated code
\`\`\``,
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";

      const pred_match = text.match(/PREDICTION:\s*(.+)/i);
      const conf_match = text.match(/CONFIDENCE:\s*([\d.]+)/i);
      const reason_match = text.match(/REASONING:\s*(.+)/i);
      const code_match = text.match(/```(?:typescript|javascript)?\s*([\s\S]+?)```/);

      const prediction: CodePrediction = {
        id: `pred_next_${Date.now()}`,
        predicted_at: new Date(),
        prediction_type: "feature",
        description: pred_match?.[1] || "Next feature",
        confidence: conf_match ? parseFloat(conf_match[1]) : 0.5,
        reasoning: reason_match?.[1] || "Based on patterns",
        generated_code: code_match?.[1]?.trim(),
      };

      this.state.predictions.push(prediction);
      this.state.accuracy_stats.total_predictions++;
      this.save();

      return prediction;
    } catch (error) {
      console.error("Prediction failed:", error);
      return null;
    }
  }

  get_stats(): string {
    const s = this.state;
    const accuracy = s.accuracy_stats.total_predictions > 0
      ? (s.accuracy_stats.accurate_predictions / s.accuracy_stats.total_predictions * 100).toFixed(1)
      : "N/A";

    return `
╭───────────────────────────────────────────────────────────╮
│           🔮 Predictive Coder Statistics                   │
├───────────────────────────────────────────────────────────┤
│  Learned Patterns: ${s.patterns.length.toString().padEnd(10)} Predictions: ${s.predictions.length.toString().padEnd(10)} │
│  Accuracy: ${accuracy.toString().padEnd(15)} Active Hours: ${s.developer_profile.active_hours.slice(0, 3).join(", ").padEnd(10)} │
├───────────────────────────────────────────────────────────┤
│  Top Patterns:                                            │
${s.patterns.slice(0, 3).map(p =>
      `│    • ${p.description.slice(0, 45).padEnd(45)}  │`
    ).join("\n") || "│    No patterns learned yet                              │"}
╰───────────────────────────────────────────────────────────╯`;
  }
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║          🔮 P R E D I C T I V E   C O D E R 🔮                   ║
║                                                                   ║
║         Anticipating Your Code Before You Write It                ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  const predictor = new PredictiveCoder();

  // Learn from history
  await predictor.learn_from_history();

  // Show stats
  console.log(predictor.get_stats());

  const args = process.argv.slice(2);

  if (args.includes("--watch")) {
    console.log("\n👁️  Watching mode enabled. Will predict on file changes...\n");
    // In a real implementation, we'd use fs.watch here
    console.log("(Watch mode would monitor file changes - demo mode)");
  }

  // Interactive mode
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n💭 Commands:");
  console.log("   /predict     - Predict next likely code");
  console.log("   /analyze     - Analyze current state");
  console.log("   /learn       - Re-learn from git history");
  console.log("   /stats       - Show statistics");
  console.log("   /quit        - Exit\n");

  const prompt = (): void => {
    rl.question("🔮 > ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === "/quit" || trimmed === "/exit") {
        console.log("\n✨ May your code be ever predictable!\n");
        rl.close();
        return;
      }

      try {
        if (trimmed === "/predict") {
          const prediction = await predictor.predict_next_feature();
          if (prediction) {
            console.log(`\n🎯 Prediction (${(prediction.confidence * 100).toFixed(0)}% confidence):`);
            console.log(`   ${prediction.description}`);
            console.log(`\n   Reasoning: ${prediction.reasoning}`);
            if (prediction.generated_code) {
              console.log(`\n   Pre-generated code:`);
              console.log("   " + "─".repeat(50));
              console.log(prediction.generated_code.split("\n").map(l => `   ${l}`).join("\n"));
              console.log("   " + "─".repeat(50));
            }
            console.log("");
          }
        } else if (trimmed === "/analyze") {
          const predictions = await predictor.make_predictions();
          console.log(`\n📊 Generated ${predictions.length} predictions:\n`);
          for (const p of predictions) {
            console.log(`   • [${(p.confidence * 100).toFixed(0)}%] ${p.description}`);
          }
          console.log("");
        } else if (trimmed === "/learn") {
          await predictor.learn_from_history();
        } else if (trimmed === "/stats") {
          console.log(predictor.get_stats());
        } else {
          console.log("Unknown command. Try /predict, /analyze, /learn, /stats, or /quit");
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
