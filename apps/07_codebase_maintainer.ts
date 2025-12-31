#!/usr/bin/env bun
/**
 * APP 7: Autonomous Codebase Maintainer
 * =======================================
 *
 * An agent that continuously monitors a repository, detects issues
 * (bugs, security vulnerabilities, outdated dependencies), and
 * submits PRs to fix them without human intervention.
 *
 * COMPLEXITY: ★★★★★★ (Expert+)
 *
 * Architecture:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                  Codebase Maintainer                        │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │                                                             │
 *   │  ┌───────────────┐                 ┌───────────────┐       │
 *   │  │ File Watcher  │                 │  Issue Queue  │       │
 *   │  │  (chokidar)   │────────────────►│   (Priority)  │       │
 *   │  └───────────────┘                 └───────┬───────┘       │
 *   │                                            │               │
 *   │  ┌───────────────┐                 ┌───────▼───────┐       │
 *   │  │   Scheduler   │                 │   AI Fixer    │       │
 *   │  │  (periodic)   │────────────────►│    Engine     │       │
 *   │  └───────────────┘                 └───────┬───────┘       │
 *   │                                            │               │
 *   │  ┌───────────────┐                 ┌───────▼───────┐       │
 *   │  │ GitHub Events │                 │  PR Creator   │       │
 *   │  │  (webhooks)   │────────────────►│  & Validator  │       │
 *   │  └───────────────┘                 └───────────────┘       │
 *   │                                                             │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Capabilities:
 *   - File change detection and analysis
 *   - Security vulnerability scanning
 *   - Dependency update checks
 *   - Code quality analysis
 *   - Automated fix generation
 *   - Self-testing before PR submission
 *   - Learning from PR review feedback
 *
 * Usage:
 *   bun run apps/07_codebase_maintainer.ts [--watch /path/to/repo]
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { EventEmitter } from "events";

// ============================================================
// Configuration
// ============================================================

const MODEL = "claude-sonnet-4-20250514";
const CHECK_INTERVAL_MS = 60000; // 1 minute
const MAX_CONCURRENT_FIXES = 3;

// ============================================================
// Types
// ============================================================

type IssueSeverity = "critical" | "high" | "medium" | "low";
type IssueType = "security" | "bug" | "dependency" | "style" | "performance" | "documentation";

interface CodeIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  file: string;
  line?: number;
  description: string;
  suggested_fix?: string;
  detected_at: Date;
  status: "pending" | "fixing" | "fixed" | "failed" | "ignored";
}

interface FixAttempt {
  issue_id: string;
  original_content: string;
  fixed_content: string;
  explanation: string;
  tests_passed: boolean;
  pr_url?: string;
}

interface MaintainerState {
  issues: CodeIssue[];
  fixes: FixAttempt[];
  files_analyzed: number;
  issues_fixed: number;
  issues_failed: number;
  last_scan: Date | null;
  learnings: string[];
}

// ============================================================
// Utilities
// ============================================================

const log = {
  scan: (msg: string) => console.log(`[${ts()}] 🔍 ${msg}`),
  issue: (severity: IssueSeverity, msg: string) => {
    const icons = { critical: "🚨", high: "⚠️", medium: "📝", low: "💡" };
    console.log(`[${ts()}] ${icons[severity]} [${severity.toUpperCase()}] ${msg}`);
  },
  fix: (msg: string) => console.log(`[${ts()}] 🔧 ${msg}`),
  test: (msg: string) => console.log(`[${ts()}] 🧪 ${msg}`),
  pr: (msg: string) => console.log(`[${ts()}] 📤 ${msg}`),
  learn: (msg: string) => console.log(`[${ts()}] 🧠 ${msg}`),
  system: (msg: string) => console.log(`[${ts()}] ⚙️  ${msg}`),
};

function ts(): string {
  return new Date().toISOString().split("T")[1].split(".")[0];
}

function generate_id(): string {
  return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// ============================================================
// Code Analyzers
// ============================================================

class SecurityAnalyzer {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async analyze(file_path: string, content: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    // Check for common security patterns
    const security_patterns = [
      { pattern: /eval\s*\(/, type: "eval usage", severity: "critical" as IssueSeverity },
      { pattern: /innerHTML\s*=/, type: "innerHTML assignment", severity: "high" as IssueSeverity },
      { pattern: /password\s*=\s*["'][^"']+["']/, type: "hardcoded password", severity: "critical" as IssueSeverity },
      { pattern: /api[_-]?key\s*=\s*["'][^"']+["']/i, type: "hardcoded API key", severity: "critical" as IssueSeverity },
      { pattern: /exec\s*\(/, type: "command execution", severity: "high" as IssueSeverity },
      { pattern: /dangerouslySetInnerHTML/, type: "React XSS risk", severity: "medium" as IssueSeverity },
    ];

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const { pattern, type, severity } of security_patterns) {
        if (pattern.test(lines[i])) {
          issues.push({
            id: generate_id(),
            type: "security",
            severity,
            file: file_path,
            line: i + 1,
            description: `Potential security issue: ${type}`,
            detected_at: new Date(),
            status: "pending",
          });
        }
      }
    }

    // Use AI for deeper analysis if file is significant
    if (content.length > 100 && issues.length === 0) {
      const ai_issues = await this.ai_security_scan(file_path, content);
      issues.push(...ai_issues);
    }

    return issues;
  }

  private async ai_security_scan(file_path: string, content: string): Promise<CodeIssue[]> {
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Analyze this code for security vulnerabilities. Only report REAL issues, not false positives.

File: ${file_path}
\`\`\`
${content.slice(0, 3000)}
\`\`\`

If you find issues, respond with JSON array:
[{"severity": "critical|high|medium|low", "line": number, "description": "issue description", "suggested_fix": "how to fix"}]

If no issues, respond with: []`,
          },
        ],
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return parsed.map((issue: { severity: IssueSeverity; line: number; description: string; suggested_fix?: string }) => ({
          id: generate_id(),
          type: "security" as IssueType,
          severity: issue.severity,
          file: file_path,
          line: issue.line,
          description: issue.description,
          suggested_fix: issue.suggested_fix,
          detected_at: new Date(),
          status: "pending" as const,
        }));
      }
    } catch {
      // Ignore AI scan failures
    }

    return [];
  }
}

class DependencyAnalyzer {
  async analyze(package_json_path: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    try {
      const content = fs.readFileSync(package_json_path, "utf-8");
      const pkg = JSON.parse(content);

      // Check for deprecated or vulnerable patterns
      const all_deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      for (const [name, version] of Object.entries(all_deps)) {
        // Check for any version (security risk)
        if (version === "*" || version === "latest") {
          issues.push({
            id: generate_id(),
            type: "dependency",
            severity: "medium",
            file: package_json_path,
            description: `Unpinned dependency "${name}": ${version}`,
            suggested_fix: `Pin "${name}" to a specific version`,
            detected_at: new Date(),
            status: "pending",
          });
        }

        // Check for very old major versions (simplified check)
        const ver_match = String(version).match(/\d+/);
        if (ver_match && parseInt(ver_match[0], 10) === 0) {
          issues.push({
            id: generate_id(),
            type: "dependency",
            severity: "low",
            file: package_json_path,
            description: `Pre-1.0 dependency "${name}": ${version}`,
            suggested_fix: `Consider updating "${name}" to a stable version`,
            detected_at: new Date(),
            status: "pending",
          });
        }
      }
    } catch {
      // File not found or invalid JSON
    }

    return issues;
  }
}

class CodeQualityAnalyzer {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async analyze(file_path: string, content: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    // Check for common code smells
    const lines = content.split("\n");

    // Very long lines
    lines.forEach((line, i) => {
      if (line.length > 120) {
        issues.push({
          id: generate_id(),
          type: "style",
          severity: "low",
          file: file_path,
          line: i + 1,
          description: `Line too long (${line.length} chars)`,
          detected_at: new Date(),
          status: "pending",
        });
      }
    });

    // Very long functions (simplified heuristic)
    let brace_depth = 0;
    let function_start = -1;
    lines.forEach((line, i) => {
      if (line.includes("function") || line.match(/=>\s*\{/)) {
        if (function_start === -1) function_start = i;
      }
      brace_depth += (line.match(/\{/g) || []).length;
      brace_depth -= (line.match(/\}/g) || []).length;

      if (brace_depth === 0 && function_start !== -1) {
        const length = i - function_start;
        if (length > 50) {
          issues.push({
            id: generate_id(),
            type: "style",
            severity: "medium",
            file: file_path,
            line: function_start + 1,
            description: `Long function (${length} lines) - consider breaking up`,
            detected_at: new Date(),
            status: "pending",
          });
        }
        function_start = -1;
      }
    });

    // TODO comments that are old (check for dates)
    lines.forEach((line, i) => {
      if (/\/\/\s*TODO/i.test(line) || /\/\/\s*FIXME/i.test(line)) {
        issues.push({
          id: generate_id(),
          type: "documentation",
          severity: "low",
          file: file_path,
          line: i + 1,
          description: `Unresolved TODO/FIXME: ${line.trim().slice(0, 60)}`,
          detected_at: new Date(),
          status: "pending",
        });
      }
    });

    return issues;
  }
}

// ============================================================
// Fix Engine
// ============================================================

class FixEngine {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async generate_fix(issue: CodeIssue, file_content: string): Promise<FixAttempt | null> {
    log.fix(`Generating fix for: ${issue.description}`);

    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `Fix this code issue:

File: ${issue.file}
Issue: ${issue.description}
${issue.line ? `Line: ${issue.line}` : ""}
${issue.suggested_fix ? `Suggested approach: ${issue.suggested_fix}` : ""}

Original code:
\`\`\`
${file_content}
\`\`\`

Provide the complete fixed file content. Respond with:
1. EXPLANATION: Brief explanation of the fix
2. FIXED_CODE: The complete fixed code (not just the changed part)

Format:
EXPLANATION: <your explanation>
FIXED_CODE:
\`\`\`
<complete fixed code>
\`\`\``,
          },
        ],
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      const explanation_match = text.match(/EXPLANATION:\s*([\s\S]*?)(?=FIXED_CODE:)/);
      const code_match = text.match(/```[\w]*\n([\s\S]*?)```/);

      if (code_match) {
        return {
          issue_id: issue.id,
          original_content: file_content,
          fixed_content: code_match[1].trim(),
          explanation: explanation_match ? explanation_match[1].trim() : "Fix applied",
          tests_passed: false, // Will be updated after testing
        };
      }
    } catch (error) {
      log.fix(`Failed to generate fix: ${error instanceof Error ? error.message : String(error)}`);
    }

    return null;
  }

  async validate_fix(fix: FixAttempt, issue: CodeIssue): Promise<boolean> {
    log.test(`Validating fix for ${issue.file}...`);

    // Basic validation: ensure the fix actually changes something
    if (fix.original_content === fix.fixed_content) {
      log.test("Fix made no changes - invalid");
      return false;
    }

    // Ensure the fixed content is valid (basic syntax check)
    if (issue.file.endsWith(".json")) {
      try {
        JSON.parse(fix.fixed_content);
      } catch {
        log.test("Fixed JSON is invalid");
        return false;
      }
    }

    // For TypeScript/JavaScript, we'd run actual compilation/tests here
    // For demo, we'll do a simulated check
    log.test("Simulated validation passed");
    return true;
  }
}

// ============================================================
// Codebase Maintainer
// ============================================================

class CodebaseMaintainer extends EventEmitter {
  private root_path: string;
  private state: MaintainerState;
  private security_analyzer: SecurityAnalyzer;
  private dependency_analyzer: DependencyAnalyzer;
  private quality_analyzer: CodeQualityAnalyzer;
  private fix_engine: FixEngine;
  private scan_interval: ReturnType<typeof setInterval> | null = null;

  constructor(root_path: string) {
    super();
    this.root_path = root_path;
    this.state = {
      issues: [],
      fixes: [],
      files_analyzed: 0,
      issues_fixed: 0,
      issues_failed: 0,
      last_scan: null,
      learnings: [],
    };

    this.security_analyzer = new SecurityAnalyzer();
    this.dependency_analyzer = new DependencyAnalyzer();
    this.quality_analyzer = new CodeQualityAnalyzer();
    this.fix_engine = new FixEngine();
  }

  async scan_codebase(): Promise<void> {
    log.scan(`Scanning codebase: ${this.root_path}`);
    this.state.last_scan = new Date();

    const files = this.get_source_files(this.root_path);
    log.scan(`Found ${files.length} source files`);

    for (const file of files) {
      await this.analyze_file(file);
    }

    // Check dependencies
    const pkg_path = path.join(this.root_path, "package.json");
    if (fs.existsSync(pkg_path)) {
      const dep_issues = await this.dependency_analyzer.analyze(pkg_path);
      this.add_issues(dep_issues);
    }

    log.scan(`Scan complete. Found ${this.state.issues.filter((i) => i.status === "pending").length} pending issues`);
  }

  private get_source_files(dir: string, files: string[] = []): string[] {
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full_path = path.join(dir, entry.name);

      // Skip node_modules, .git, etc.
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }

      if (entry.isDirectory()) {
        this.get_source_files(full_path, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if ([".ts", ".tsx", ".js", ".jsx", ".json", ".py", ".go", ".rs"].includes(ext)) {
          files.push(full_path);
        }
      }
    }

    return files;
  }

  private async analyze_file(file_path: string): Promise<void> {
    try {
      const content = fs.readFileSync(file_path, "utf-8");
      this.state.files_analyzed++;

      // Security analysis
      const security_issues = await this.security_analyzer.analyze(file_path, content);
      this.add_issues(security_issues);

      // Quality analysis
      const quality_issues = await this.quality_analyzer.analyze(file_path, content);
      this.add_issues(quality_issues);
    } catch (error) {
      // File read error
    }
  }

  private add_issues(issues: CodeIssue[]): void {
    for (const issue of issues) {
      // Deduplicate
      const exists = this.state.issues.some(
        (i) => i.file === issue.file && i.line === issue.line && i.description === issue.description
      );
      if (!exists) {
        this.state.issues.push(issue);
        log.issue(issue.severity, `${issue.file}:${issue.line || "?"} - ${issue.description}`);
        this.emit("issue_detected", issue);
      }
    }
  }

  async fix_pending_issues(): Promise<void> {
    const pending = this.state.issues
      .filter((i) => i.status === "pending")
      .sort((a, b) => {
        const severity_order = { critical: 0, high: 1, medium: 2, low: 3 };
        return severity_order[a.severity] - severity_order[b.severity];
      })
      .slice(0, MAX_CONCURRENT_FIXES);

    if (pending.length === 0) {
      log.fix("No pending issues to fix");
      return;
    }

    log.fix(`Fixing ${pending.length} issues...`);

    for (const issue of pending) {
      issue.status = "fixing";

      try {
        const content = fs.readFileSync(issue.file, "utf-8");
        const fix = await this.fix_engine.generate_fix(issue, content);

        if (fix) {
          const valid = await this.fix_engine.validate_fix(fix, issue);

          if (valid) {
            fix.tests_passed = true;
            this.state.fixes.push(fix);

            // In a real implementation, we'd create a PR here
            // For demo, we'll simulate it
            log.pr(`Would create PR: "Fix ${issue.type} issue in ${path.basename(issue.file)}"`);
            log.pr(`Explanation: ${fix.explanation}`);

            issue.status = "fixed";
            this.state.issues_fixed++;
            this.emit("issue_fixed", issue, fix);
          } else {
            issue.status = "failed";
            this.state.issues_failed++;
            this.state.learnings.push(`Failed to fix ${issue.type} in ${issue.file}: validation failed`);
          }
        } else {
          issue.status = "failed";
          this.state.issues_failed++;
        }
      } catch (error) {
        issue.status = "failed";
        this.state.issues_failed++;
        log.fix(`Error fixing issue: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  start_monitoring(): void {
    log.system(`Starting continuous monitoring (interval: ${CHECK_INTERVAL_MS / 1000}s)`);

    // Initial scan
    this.scan_codebase().then(() => this.fix_pending_issues());

    // Periodic scans
    this.scan_interval = setInterval(async () => {
      await this.scan_codebase();
      await this.fix_pending_issues();
    }, CHECK_INTERVAL_MS);
  }

  stop_monitoring(): void {
    if (this.scan_interval) {
      clearInterval(this.scan_interval);
      this.scan_interval = null;
      log.system("Monitoring stopped");
    }
  }

  get_stats(): {
    files_analyzed: number;
    total_issues: number;
    pending_issues: number;
    fixed_issues: number;
    failed_issues: number;
    by_severity: Record<IssueSeverity, number>;
    by_type: Record<IssueType, number>;
    learnings_count: number;
  } {
    const by_severity: Record<IssueSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    const by_type: Record<IssueType, number> = {
      security: 0,
      bug: 0,
      dependency: 0,
      style: 0,
      performance: 0,
      documentation: 0,
    };

    for (const issue of this.state.issues) {
      by_severity[issue.severity]++;
      by_type[issue.type]++;
    }

    return {
      files_analyzed: this.state.files_analyzed,
      total_issues: this.state.issues.length,
      pending_issues: this.state.issues.filter((i) => i.status === "pending").length,
      fixed_issues: this.state.issues_fixed,
      failed_issues: this.state.issues_failed,
      by_severity,
      by_type,
      learnings_count: this.state.learnings.length,
    };
  }
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Autonomous Codebase Maintainer                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Continuously monitors code for:                              ║
║    • Security vulnerabilities                                 ║
║    • Code quality issues                                      ║
║    • Outdated dependencies                                    ║
║    • Documentation gaps                                       ║
║                                                               ║
║  Automatically generates fixes and creates PRs                ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Get target path from args or use current directory
  const args = process.argv.slice(2);
  let target_path = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--watch" && args[i + 1]) {
      target_path = args[i + 1];
    }
  }

  if (!fs.existsSync(target_path)) {
    console.error(`Error: Path does not exist: ${target_path}`);
    process.exit(1);
  }

  log.system(`Target: ${target_path}`);

  const maintainer = new CodebaseMaintainer(target_path);

  // Event listeners
  maintainer.on("issue_detected", (issue: CodeIssue) => {
    // Could send to Slack, email, etc.
  });

  maintainer.on("issue_fixed", (issue: CodeIssue, fix: FixAttempt) => {
    log.learn(`Successfully fixed: ${issue.description}`);
  });

  // Run a single scan for demo
  await maintainer.scan_codebase();
  await maintainer.fix_pending_issues();

  // Show stats
  console.log("\n" + "=".repeat(60));
  const stats = maintainer.get_stats();
  console.log("\n📊 Scan Results:\n");
  console.log(`  Files Analyzed: ${stats.files_analyzed}`);
  console.log(`  Total Issues: ${stats.total_issues}`);
  console.log(`  Pending: ${stats.pending_issues}`);
  console.log(`  Fixed: ${stats.fixed_issues}`);
  console.log(`  Failed: ${stats.failed_issues}`);
  console.log(`\n  By Severity:`);
  console.log(`    🚨 Critical: ${stats.by_severity.critical}`);
  console.log(`    ⚠️  High: ${stats.by_severity.high}`);
  console.log(`    📝 Medium: ${stats.by_severity.medium}`);
  console.log(`    💡 Low: ${stats.by_severity.low}`);
  console.log(`\n  By Type:`);
  Object.entries(stats.by_type).forEach(([type, count]) => {
    if (count > 0) console.log(`    ${type}: ${count}`);
  });

  console.log("\n✅ Scan complete!");

  // For continuous monitoring, uncomment:
  // maintainer.start_monitoring();
  // process.on("SIGINT", () => { maintainer.stop_monitoring(); process.exit(0); });
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
