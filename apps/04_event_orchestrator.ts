#!/usr/bin/env bun
/**
 * APP 4: Multi-Source Event Orchestrator
 * ========================================
 *
 * A 24/7 daemon that monitors multiple event sources (GitHub, Slack,
 * email, cron schedules) and coordinates AI-powered responses,
 * demonstrating:
 * - Event-driven architecture with multiple sources
 * - Subagents for specialized tasks (Lesson 08)
 * - Session persistence (Lesson 10, 17)
 * - Hooks for event filtering (Lesson 09)
 * - WebSockets for real-time events
 * - Priority queues and rate limiting
 * - Graceful shutdown and recovery
 *
 * COMPLEXITY: ★★★★☆ (Advanced)
 *
 * Architecture:
 *   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
 *   │   GitHub    │  │    Slack    │  │    Cron     │
 *   │  Webhooks   │  │    Events   │  │   Schedule  │
 *   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
 *          │                │                │
 *          └────────────────┼────────────────┘
 *                           │
 *                   ┌───────▼───────┐
 *                   │ Event Router  │
 *                   │   (Priority)  │
 *                   └───────┬───────┘
 *                           │
 *          ┌────────────────┼────────────────┐
 *          │                │                │
 *   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
 *   │  Code Agent │  │ Comms Agent │  │ Admin Agent │
 *   │ (PR review) │  │ (responses) │  │ (triaging)  │
 *   └─────────────┘  └─────────────┘  └─────────────┘
 *
 * Usage:
 *   bun run apps/04_event_orchestrator.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { EventEmitter } from "events";

// ============================================================
// Configuration
// ============================================================

const PORT = Number(process.env.ORCHESTRATOR_PORT) || 3002;
const MODEL = "claude-sonnet-4-20250514";

// ============================================================
// Types
// ============================================================

type EventPriority = "critical" | "high" | "normal" | "low";
type EventSource = "github" | "slack" | "email" | "cron" | "api";
type AgentType = "code" | "comms" | "admin" | "general";

interface Event {
  id: string;
  source: EventSource;
  type: string;
  priority: EventPriority;
  payload: unknown;
  timestamp: Date;
  retry_count: number;
}

interface AgentTask {
  event: Event;
  agent_type: AgentType;
  status: "pending" | "processing" | "completed" | "failed";
  result?: unknown;
  error?: string;
  started_at?: Date;
  completed_at?: Date;
}

interface OrchestratorStats {
  events_received: number;
  events_processed: number;
  events_failed: number;
  by_source: Record<EventSource, number>;
  by_priority: Record<EventPriority, number>;
  avg_processing_time_ms: number;
  uptime_seconds: number;
}

// ============================================================
// Utilities
// ============================================================

const log = {
  info: (msg: string) => console.log(`[${ts()}] ℹ️  ${msg}`),
  success: (msg: string) => console.log(`[${ts()}] ✅ ${msg}`),
  warning: (msg: string) => console.log(`[${ts()}] ⚠️  ${msg}`),
  error: (msg: string) => console.log(`[${ts()}] ❌ ${msg}`),
  event: (source: string, msg: string) => console.log(`[${ts()}] 📥 [${source}] ${msg}`),
  agent: (type: string, msg: string) => console.log(`[${ts()}] 🤖 [${type}] ${msg}`),
};

function ts(): string {
  return new Date().toISOString();
}

function generate_id(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// Priority Queue
// ============================================================

class PriorityQueue<T extends { priority: EventPriority }> {
  private queues: Map<EventPriority, T[]> = new Map([
    ["critical", []],
    ["high", []],
    ["normal", []],
    ["low", []],
  ]);

  enqueue(item: T): void {
    const queue = this.queues.get(item.priority);
    queue?.push(item);
  }

  dequeue(): T | undefined {
    for (const priority of ["critical", "high", "normal", "low"] as EventPriority[]) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift();
      }
    }
    return undefined;
  }

  size(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  get_stats(): Record<EventPriority, number> {
    const stats: Record<EventPriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
    };
    for (const [priority, queue] of this.queues) {
      stats[priority] = queue.length;
    }
    return stats;
  }
}

// ============================================================
// Rate Limiter
// ============================================================

class RateLimiter {
  private tokens: number;
  private last_refill: number;
  private readonly max_tokens: number;
  private readonly refill_rate: number; // tokens per second

  constructor(max_tokens: number, refill_rate: number) {
    this.max_tokens = max_tokens;
    this.tokens = max_tokens;
    this.refill_rate = refill_rate;
    this.last_refill = Date.now();
  }

  try_acquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.last_refill) / 1000;
    this.tokens = Math.min(this.max_tokens, this.tokens + elapsed * this.refill_rate);
    this.last_refill = now;
  }
}

// ============================================================
// Specialized Agents
// ============================================================

const client = new Anthropic();

async function run_code_agent(event: Event): Promise<string> {
  log.agent("code", `Processing: ${event.type}`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `You are a code review and analysis agent. You specialize in:
- Reviewing code changes
- Identifying bugs and security issues
- Suggesting improvements
- Analyzing build failures

Be thorough but concise.`,
    messages: [
      {
        role: "user",
        content: `Analyze this code-related event:
Type: ${event.type}
Source: ${event.source}
Payload: ${JSON.stringify(event.payload, null, 2)}

Provide analysis and recommended actions.`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function run_comms_agent(event: Event): Promise<string> {
  log.agent("comms", `Processing: ${event.type}`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `You are a communications agent. You specialize in:
- Drafting responses to messages
- Summarizing discussions
- Escalating urgent issues
- Maintaining professional tone

Be helpful and concise.`,
    messages: [
      {
        role: "user",
        content: `Handle this communication event:
Type: ${event.type}
Source: ${event.source}
Payload: ${JSON.stringify(event.payload, null, 2)}

Draft an appropriate response or summary.`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function run_admin_agent(event: Event): Promise<string> {
  log.agent("admin", `Processing: ${event.type}`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `You are an administrative agent. You specialize in:
- Triaging and prioritizing issues
- Managing schedules and reminders
- Generating reports
- Coordinating between systems

Be organized and actionable.`,
    messages: [
      {
        role: "user",
        content: `Handle this administrative event:
Type: ${event.type}
Source: ${event.source}
Payload: ${JSON.stringify(event.payload, null, 2)}

Provide triage and recommended actions.`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function run_general_agent(event: Event): Promise<string> {
  log.agent("general", `Processing: ${event.type}`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `You are a general-purpose AI assistant. Handle any task appropriately.`,
    messages: [
      {
        role: "user",
        content: `Handle this event:
Type: ${event.type}
Source: ${event.source}
Payload: ${JSON.stringify(event.payload, null, 2)}

Provide analysis and recommendations.`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// ============================================================
// Event Router
// ============================================================

function route_event(event: Event): AgentType {
  // Route based on source and type
  if (event.source === "github") {
    if (event.type.includes("pull_request") || event.type.includes("push")) {
      return "code";
    }
    if (event.type.includes("issue")) {
      return "admin";
    }
  }

  if (event.source === "slack" || event.source === "email") {
    return "comms";
  }

  if (event.source === "cron") {
    return "admin";
  }

  return "general";
}

function determine_priority(source: EventSource, type: string, payload: unknown): EventPriority {
  // Critical: production incidents, security alerts
  if (type.includes("security") || type.includes("incident")) {
    return "critical";
  }

  // High: mentions, direct messages, failures
  if (type.includes("mention") || type.includes("direct") || type.includes("failure")) {
    return "high";
  }

  // Low: scheduled reports, batch jobs
  if (source === "cron") {
    return "low";
  }

  return "normal";
}

// ============================================================
// Orchestrator
// ============================================================

class EventOrchestrator extends EventEmitter {
  private queue: PriorityQueue<Event>;
  private rate_limiter: RateLimiter;
  private active_tasks: Map<string, AgentTask>;
  private stats: OrchestratorStats;
  private processing: boolean;
  private start_time: number;
  private processing_times: number[];

  constructor() {
    super();
    this.queue = new PriorityQueue();
    this.rate_limiter = new RateLimiter(10, 2); // 10 tokens max, 2/sec refill
    this.active_tasks = new Map();
    this.processing = false;
    this.start_time = Date.now();
    this.processing_times = [];
    this.stats = {
      events_received: 0,
      events_processed: 0,
      events_failed: 0,
      by_source: { github: 0, slack: 0, email: 0, cron: 0, api: 0 },
      by_priority: { critical: 0, high: 0, normal: 0, low: 0 },
      avg_processing_time_ms: 0,
      uptime_seconds: 0,
    };
  }

  submit_event(source: EventSource, type: string, payload: unknown): string {
    const priority = determine_priority(source, type, payload);
    const event: Event = {
      id: generate_id(),
      source,
      type,
      priority,
      payload,
      timestamp: new Date(),
      retry_count: 0,
    };

    this.queue.enqueue(event);
    this.stats.events_received++;
    this.stats.by_source[source]++;
    this.stats.by_priority[priority]++;

    log.event(source, `${type} [${priority}] queued as ${event.id}`);
    this.emit("event_queued", event);

    // Start processing if not already running
    if (!this.processing) {
      this.process_queue();
    }

    return event.id;
  }

  private async process_queue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.size() > 0) {
      // Check rate limit
      if (!this.rate_limiter.try_acquire()) {
        log.warning("Rate limited, waiting...");
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      const event = this.queue.dequeue();
      if (!event) break;

      const task: AgentTask = {
        event,
        agent_type: route_event(event),
        status: "processing",
        started_at: new Date(),
      };

      this.active_tasks.set(event.id, task);
      this.emit("task_started", task);

      try {
        const start = Date.now();
        let result: string;

        switch (task.agent_type) {
          case "code":
            result = await run_code_agent(event);
            break;
          case "comms":
            result = await run_comms_agent(event);
            break;
          case "admin":
            result = await run_admin_agent(event);
            break;
          default:
            result = await run_general_agent(event);
        }

        const elapsed = Date.now() - start;
        this.processing_times.push(elapsed);

        task.status = "completed";
        task.result = result;
        task.completed_at = new Date();
        this.stats.events_processed++;

        log.success(`${event.id} processed by ${task.agent_type} agent in ${elapsed}ms`);
        this.emit("task_completed", task);

        // Update average processing time
        this.stats.avg_processing_time_ms =
          this.processing_times.reduce((a, b) => a + b, 0) / this.processing_times.length;
      } catch (error) {
        task.status = "failed";
        task.error = error instanceof Error ? error.message : String(error);
        task.completed_at = new Date();

        // Retry logic
        if (event.retry_count < 3) {
          event.retry_count++;
          event.priority = "low"; // Demote priority on retry
          this.queue.enqueue(event);
          log.warning(`${event.id} failed, retrying (attempt ${event.retry_count})`);
        } else {
          this.stats.events_failed++;
          log.error(`${event.id} failed permanently: ${task.error}`);
        }

        this.emit("task_failed", task);
      }

      this.active_tasks.delete(event.id);
    }

    this.processing = false;
  }

  get_stats(): OrchestratorStats {
    this.stats.uptime_seconds = Math.floor((Date.now() - this.start_time) / 1000);
    return { ...this.stats };
  }

  get_queue_status(): { size: number; by_priority: Record<EventPriority, number> } {
    return {
      size: this.queue.size(),
      by_priority: this.queue.get_stats(),
    };
  }
}

// ============================================================
// Cron Scheduler (simulated events)
// ============================================================

function start_cron_scheduler(orchestrator: EventOrchestrator): void {
  // Daily summary at midnight
  const schedule_daily = () => {
    orchestrator.submit_event("cron", "daily_summary", {
      report_type: "daily",
      date: new Date().toISOString().split("T")[0],
    });
  };

  // Hourly health check
  const schedule_hourly = () => {
    orchestrator.submit_event("cron", "health_check", {
      check_type: "system_health",
      timestamp: new Date().toISOString(),
    });
  };

  // Schedule: check every minute if it's time
  setInterval(() => {
    const now = new Date();
    if (now.getMinutes() === 0 && now.getSeconds() < 5) {
      schedule_hourly();
      if (now.getHours() === 0) {
        schedule_daily();
      }
    }
  }, 5000);

  log.info("Cron scheduler started (hourly health checks, daily summaries)");
}

// ============================================================
// HTTP Server
// ============================================================

const orchestrator = new EventOrchestrator();

// Event listeners for logging
orchestrator.on("task_completed", (task: AgentTask) => {
  // Could send to monitoring system, Slack, etc.
});

orchestrator.on("task_failed", (task: AgentTask) => {
  // Could send alerts
});

console.log(`
╔════════════════════════════════════════════════════════════╗
║      Multi-Source Event Orchestrator - 24/7 AI Daemon      ║
╚════════════════════════════════════════════════════════════╝
`);

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "healthy",
        ...orchestrator.get_stats(),
        queue: orchestrator.get_queue_status(),
      });
    }

    // Stats endpoint
    if (url.pathname === "/stats") {
      return Response.json(orchestrator.get_stats());
    }

    // Submit event API
    if (url.pathname === "/event" && req.method === "POST") {
      try {
        const body = await req.json() as { source: EventSource; type: string; payload: unknown };
        const event_id = orchestrator.submit_event(
          body.source || "api",
          body.type || "custom",
          body.payload
        );
        return Response.json({ success: true, event_id });
      } catch (error) {
        return Response.json(
          { success: false, error: error instanceof Error ? error.message : String(error) },
          { status: 400 }
        );
      }
    }

    // GitHub webhook endpoint
    if (url.pathname === "/webhook/github" && req.method === "POST") {
      const event_type = req.headers.get("X-GitHub-Event") || "unknown";
      const payload = await req.json();
      const event_id = orchestrator.submit_event("github", event_type, payload);
      return Response.json({ received: true, event_id });
    }

    // Slack webhook endpoint
    if (url.pathname === "/webhook/slack" && req.method === "POST") {
      const payload = await req.json();
      const event_id = orchestrator.submit_event(
        "slack",
        (payload as { type?: string }).type || "message",
        payload
      );
      return Response.json({ received: true, event_id });
    }

    // Default response
    return new Response(
      `Event Orchestrator API

Endpoints:
  GET  /health         - Health check and stats
  GET  /stats          - Processing statistics
  POST /event          - Submit custom event
  POST /webhook/github - GitHub webhook
  POST /webhook/slack  - Slack webhook

Status: Running
Uptime: ${Math.floor((Date.now() - Date.now()) / 1000)}s
Queue: ${orchestrator.get_queue_status().size} pending`,
      { headers: { "Content-Type": "text/plain" } }
    );
  },
});

// Start background services
start_cron_scheduler(orchestrator);

log.info(`Server listening on http://localhost:${PORT}`);
log.info("Endpoints:");
log.info("  GET  /health         - Health check and stats");
log.info("  GET  /stats          - Processing statistics");
log.info("  POST /event          - Submit custom event");
log.info("  POST /webhook/github - GitHub webhook");
log.info("  POST /webhook/slack  - Slack webhook");
log.info("");

// Demo: Submit a test event on startup
setTimeout(() => {
  log.info("Submitting demo event...");
  orchestrator.submit_event("api", "demo_event", {
    message: "Hello from Event Orchestrator!",
    demo: true,
  });
}, 2000);

// Graceful shutdown
process.on("SIGINT", () => {
  log.info("Shutting down gracefully...");
  log.info(`Final stats: ${JSON.stringify(orchestrator.get_stats(), null, 2)}`);
  process.exit(0);
});
