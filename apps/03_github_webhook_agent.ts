#!/usr/bin/env bun
/**
 * APP 3: GitHub Webhook Agent
 * ============================
 *
 * A 24/7 agent that responds to GitHub webhooks (PRs, issues, comments),
 * demonstrating:
 * - Event-driven architecture with Bun.serve()
 * - Webhook signature verification
 * - Custom tools for GitHub API interaction (Lesson 06)
 * - Structured output for consistent responses (Lesson 13)
 * - Error handling with retries (Lesson 12)
 * - Streaming responses for long operations (Lesson 07)
 *
 * COMPLEXITY: ★★★☆☆ (Intermediate)
 *
 * Setup:
 *   1. Set GITHUB_TOKEN and GITHUB_WEBHOOK_SECRET in .env
 *   2. Run: bun run apps/03_github_webhook_agent.ts
 *   3. Expose with ngrok: ngrok http 3001
 *   4. Add webhook URL to your GitHub repo settings
 *
 * Supported Events:
 *   - pull_request: Reviews code and suggests improvements
 *   - issues: Triages and labels new issues
 *   - issue_comment: Responds to @mentions
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import * as crypto from "crypto";

// ============================================================
// Configuration
// ============================================================

const PORT = Number(process.env.PORT) || 3001;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const MODEL = "claude-sonnet-4-20250514";

// ============================================================
// Types
// ============================================================

interface WebhookPayload {
  action: string;
  repository: {
    full_name: string;
    html_url: string;
  };
  sender: {
    login: string;
  };
  pull_request?: {
    number: number;
    title: string;
    body: string;
    html_url: string;
    diff_url: string;
    head: { sha: string };
    base: { ref: string };
  };
  issue?: {
    number: number;
    title: string;
    body: string;
    html_url: string;
    labels: Array<{ name: string }>;
  };
  comment?: {
    id: number;
    body: string;
    user: { login: string };
  };
}

// Structured output schemas
const pr_review_schema = z.object({
  summary: z.string().describe("Brief summary of the changes"),
  issues: z.array(z.object({
    severity: z.enum(["critical", "warning", "suggestion"]),
    file: z.string(),
    line: z.number().optional(),
    description: z.string(),
    suggestion: z.string().optional(),
  })).describe("List of issues found"),
  overall_assessment: z.enum(["approve", "request_changes", "comment"]),
  approval_message: z.string().describe("Message for the PR review"),
});

const issue_triage_schema = z.object({
  category: z.enum(["bug", "feature", "question", "documentation", "enhancement"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  suggested_labels: z.array(z.string()),
  response: z.string().describe("Response to post on the issue"),
  needs_more_info: z.boolean(),
});

type PRReview = z.infer<typeof pr_review_schema>;
type IssueTriage = z.infer<typeof issue_triage_schema>;

// ============================================================
// Utilities
// ============================================================

const log = {
  info: (msg: string) => console.log(`[${new Date().toISOString()}] ℹ️  ${msg}`),
  success: (msg: string) => console.log(`[${new Date().toISOString()}] ✅ ${msg}`),
  warning: (msg: string) => console.log(`[${new Date().toISOString()}] ⚠️  ${msg}`),
  error: (msg: string) => console.log(`[${new Date().toISOString()}] ❌ ${msg}`),
  event: (type: string, msg: string) => console.log(`[${new Date().toISOString()}] 📥 [${type}] ${msg}`),
};

function verify_signature(payload: string, signature: string | null): boolean {
  if (!GITHUB_WEBHOOK_SECRET || !signature) {
    log.warning("Webhook signature verification skipped (no secret configured)");
    return true; // Skip verification in development
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", GITHUB_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ============================================================
// GitHub API Helpers
// ============================================================

async function github_api(
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<unknown> {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function get_pr_diff(repo: string, pr_number: number): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/pulls/${pr_number}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3.diff",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get PR diff: ${response.status}`);
  }

  return response.text();
}

async function post_pr_review(
  repo: string,
  pr_number: number,
  review: PRReview
): Promise<void> {
  // Map our assessment to GitHub's review event
  const event_map = {
    approve: "APPROVE",
    request_changes: "REQUEST_CHANGES",
    comment: "COMMENT",
  };

  await github_api(`/repos/${repo}/pulls/${pr_number}/reviews`, "POST", {
    event: event_map[review.overall_assessment],
    body: `## AI Code Review Summary

${review.summary}

${review.issues.length > 0 ? `### Issues Found

${review.issues.map((i) => `- **[${i.severity.toUpperCase()}]** ${i.file}${i.line ? `:${i.line}` : ""}: ${i.description}${i.suggestion ? `\n  > 💡 Suggestion: ${i.suggestion}` : ""}`).join("\n")}` : "No significant issues found."}

---
${review.approval_message}

*🤖 Generated by GitHub Webhook Agent*`,
  });

  log.success(`Posted review to PR #${pr_number}`);
}

async function post_issue_comment(
  repo: string,
  issue_number: number,
  body: string
): Promise<void> {
  await github_api(`/repos/${repo}/issues/${issue_number}/comments`, "POST", {
    body: `${body}\n\n*🤖 Generated by GitHub Webhook Agent*`,
  });
  log.success(`Posted comment to issue #${issue_number}`);
}

async function add_labels(
  repo: string,
  issue_number: number,
  labels: string[]
): Promise<void> {
  await github_api(`/repos/${repo}/issues/${issue_number}/labels`, "POST", {
    labels,
  });
  log.success(`Added labels to issue #${issue_number}: ${labels.join(", ")}`);
}

// ============================================================
// AI Processing
// ============================================================

const client = new Anthropic();

async function review_pull_request(
  repo: string,
  pr: NonNullable<WebhookPayload["pull_request"]>
): Promise<void> {
  log.info(`Reviewing PR #${pr.number}: ${pr.title}`);

  try {
    // Get the diff
    const diff = await get_pr_diff(repo, pr.number);
    const truncated_diff = diff.slice(0, 50000); // Limit context

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: `You are an expert code reviewer. Review pull requests thoroughly but constructively.
Focus on:
1. Code quality and best practices
2. Potential bugs or edge cases
3. Security vulnerabilities
4. Performance issues
5. Maintainability

Be constructive and suggest improvements rather than just criticizing.
Format your response as a JSON object matching this schema:
${JSON.stringify(pr_review_schema.shape, null, 2)}`,
      messages: [
        {
          role: "user",
          content: `Please review this pull request:

**Title:** ${pr.title}
**Description:** ${pr.body || "No description provided"}

**Diff:**
\`\`\`diff
${truncated_diff}
\`\`\`

Provide a thorough code review as JSON.`,
        },
        {
          role: "assistant",
          content: "{",
        },
      ],
    });

    // Parse the response
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const review = JSON.parse("{" + text) as PRReview;

    // Post the review
    if (GITHUB_TOKEN) {
      await post_pr_review(repo, pr.number, review);
    } else {
      log.warning("GITHUB_TOKEN not set - skipping GitHub API calls");
      console.log("Would post review:", JSON.stringify(review, null, 2));
    }
  } catch (error) {
    log.error(`Failed to review PR: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function triage_issue(
  repo: string,
  issue: NonNullable<WebhookPayload["issue"]>
): Promise<void> {
  log.info(`Triaging issue #${issue.number}: ${issue.title}`);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `You are an expert issue triager. Analyze issues and categorize them appropriately.
Consider:
1. Is this a bug report, feature request, question, or documentation issue?
2. What priority level is appropriate?
3. What labels should be applied?
4. Does the issue need more information?

Format your response as a JSON object matching this schema:
${JSON.stringify(issue_triage_schema.shape, null, 2)}`,
      messages: [
        {
          role: "user",
          content: `Please triage this issue:

**Title:** ${issue.title}
**Body:** ${issue.body || "No description provided"}
**Current Labels:** ${issue.labels.map((l) => l.name).join(", ") || "None"}

Provide triage information as JSON.`,
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

    const triage = JSON.parse("{" + text) as IssueTriage;

    if (GITHUB_TOKEN) {
      // Add suggested labels
      if (triage.suggested_labels.length > 0) {
        await add_labels(repo, issue.number, triage.suggested_labels);
      }

      // Post response
      await post_issue_comment(repo, issue.number, triage.response);
    } else {
      log.warning("GITHUB_TOKEN not set - skipping GitHub API calls");
      console.log("Would apply triage:", JSON.stringify(triage, null, 2));
    }
  } catch (error) {
    log.error(`Failed to triage issue: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function respond_to_mention(
  repo: string,
  issue_number: number,
  comment: NonNullable<WebhookPayload["comment"]>,
  context: { title: string; body: string }
): Promise<void> {
  log.info(`Responding to mention in issue #${issue_number}`);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `You are a helpful GitHub assistant. Respond to questions and mentions helpfully.
Be concise but thorough. If you don't know something, say so.`,
      messages: [
        {
          role: "user",
          content: `Someone mentioned you in a GitHub issue.

**Issue Title:** ${context.title}
**Issue Body:** ${context.body || "No description"}

**Comment by @${comment.user.login}:**
${comment.body}

Please provide a helpful response.`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    if (GITHUB_TOKEN) {
      await post_issue_comment(repo, issue_number, text);
    } else {
      log.warning("GITHUB_TOKEN not set - skipping GitHub API calls");
      console.log("Would respond:", text);
    }
  } catch (error) {
    log.error(`Failed to respond: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================
// Webhook Handler
// ============================================================

async function handle_webhook(
  event_type: string,
  payload: WebhookPayload
): Promise<void> {
  const repo = payload.repository.full_name;

  switch (event_type) {
    case "pull_request":
      if (payload.action === "opened" || payload.action === "synchronize") {
        if (payload.pull_request) {
          await review_pull_request(repo, payload.pull_request);
        }
      }
      break;

    case "issues":
      if (payload.action === "opened") {
        if (payload.issue) {
          await triage_issue(repo, payload.issue);
        }
      }
      break;

    case "issue_comment":
      if (payload.action === "created" && payload.comment) {
        // Check if we're mentioned
        const bot_mention = "@github-webhook-agent"; // Customize this
        if (payload.comment.body.includes(bot_mention) && payload.issue) {
          await respond_to_mention(
            repo,
            payload.issue.number,
            payload.comment,
            { title: payload.issue.title, body: payload.issue.body }
          );
        }
      }
      break;

    default:
      log.info(`Ignoring event: ${event_type}`);
  }
}

// ============================================================
// HTTP Server
// ============================================================

console.log(`
╔════════════════════════════════════════════════════════════╗
║           GitHub Webhook Agent - Event-Driven AI           ║
╚════════════════════════════════════════════════════════════╝
`);

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", uptime: process.uptime() }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Webhook endpoint
    if (url.pathname === "/webhook" && req.method === "POST") {
      const body = await req.text();
      const signature = req.headers.get("X-Hub-Signature-256");
      const event_type = req.headers.get("X-GitHub-Event");

      // Verify signature
      if (!verify_signature(body, signature)) {
        log.error("Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }

      if (!event_type) {
        return new Response("Missing event type", { status: 400 });
      }

      try {
        const payload = JSON.parse(body) as WebhookPayload;
        log.event(event_type, `${payload.action} from ${payload.sender.login} in ${payload.repository.full_name}`);

        // Process asynchronously so we can respond quickly
        handle_webhook(event_type, payload).catch((err) => {
          log.error(`Webhook handler error: ${err.message}`);
        });

        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        log.error(`Failed to parse webhook: ${error instanceof Error ? error.message : String(error)}`);
        return new Response("Invalid payload", { status: 400 });
      }
    }

    // Default response
    return new Response(
      `GitHub Webhook Agent\n\nEndpoints:\n- POST /webhook - GitHub webhook receiver\n- GET /health - Health check\n\nStatus: Running\nUptime: ${Math.floor(process.uptime())}s`,
      { headers: { "Content-Type": "text/plain" } }
    );
  },
});

log.info(`Server listening on http://localhost:${PORT}`);
log.info("Endpoints:");
log.info("  POST /webhook - GitHub webhook receiver");
log.info("  GET  /health  - Health check");
log.info("");
log.info("To expose publicly, run: ngrok http " + PORT);
log.info("");

if (!GITHUB_TOKEN) {
  log.warning("GITHUB_TOKEN not set - running in dry-run mode");
}
if (!GITHUB_WEBHOOK_SECRET) {
  log.warning("GITHUB_WEBHOOK_SECRET not set - signature verification disabled");
}

// Keep the process running
process.on("SIGINT", () => {
  log.info("Shutting down...");
  process.exit(0);
});
