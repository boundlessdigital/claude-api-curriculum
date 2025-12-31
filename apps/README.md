# Real-World Claude API Applications

This directory contains 5 real-world applications demonstrating the Claude API concepts from the curriculum, in increasing complexity.

## Application Overview

| App | Name | Complexity | Key Concepts | Type |
|-----|------|------------|--------------|------|
| 01 | CLI Chat Bot | ★☆☆☆☆ | Messages, Streaming, Sessions | Interactive |
| 02 | Document Q&A | ★★☆☆☆ | Custom Tools, Structured Output, Cost Tracking | CLI Tool |
| 03 | GitHub Webhook Agent | ★★★☆☆ | Event-Driven, Webhooks, PR Review | 24/7 Daemon |
| 04 | Event Orchestrator | ★★★★☆ | Multi-Source Events, Subagents, Priority Queue | 24/7 Daemon |
| 05 | Self-Evolving Agent | ★★★★★ | Meta-Learning, Tool Generation, Prompt Evolution | Autonomous |

## Quick Start

```bash
# Install dependencies (from project root)
bun install

# Run any app
bun run apps/01_cli_chatbot.ts
bun run apps/02_document_qa.ts ./README.md "What is this about?"
bun run apps/03_github_webhook_agent.ts
bun run apps/04_event_orchestrator.ts
bun run apps/05_self_evolving_agent.ts
```

## Application Details

### 01: CLI Chat Bot ★☆☆☆☆

A simple interactive command-line chatbot for multi-turn conversations.

**Demonstrates:**
- Multi-turn conversation management (Lesson 02)
- System prompts for personality (Lesson 05)
- Streaming responses for real-time output (Lesson 07)
- Session management (Lesson 10)
- Graceful error handling (Lesson 12)

**Usage:**
```bash
bun run apps/01_cli_chatbot.ts
```

**Commands:** `/clear`, `/system <prompt>`, `/help`, `/exit`

---

### 02: Document Q&A Assistant ★★☆☆☆

Analyze any text document and answer questions about its content.

**Demonstrates:**
- Document understanding (Lesson 26)
- Custom tools for document navigation (Lesson 06)
- Structured output with Zod (Lesson 13)
- Cost tracking (Lesson 14)

**Usage:**
```bash
# One-shot question
bun run apps/02_document_qa.ts ./path/to/file.txt "Your question?"

# Interactive mode
bun run apps/02_document_qa.ts ./path/to/file.txt
```

**Commands:** `/summary`, `/outline`, `/exit`

---

### 03: GitHub Webhook Agent ★★★☆☆

A 24/7 daemon that responds to GitHub webhooks with AI-powered actions.

**Demonstrates:**
- Event-driven architecture with `Bun.serve()`
- Webhook signature verification
- PR code review automation
- Issue triaging and labeling
- Structured output for consistent responses (Lesson 13)

**Supported Events:**
- `pull_request`: Reviews code and suggests improvements
- `issues`: Triages and labels new issues
- `issue_comment`: Responds to @mentions

**Setup:**
```bash
# Set environment variables
export GITHUB_TOKEN="your_github_token"
export GITHUB_WEBHOOK_SECRET="your_webhook_secret"

# Start the server
bun run apps/03_github_webhook_agent.ts

# Expose with ngrok
ngrok http 3001
```

**Endpoints:**
- `POST /webhook` - GitHub webhook receiver
- `GET /health` - Health check

---

### 04: Multi-Source Event Orchestrator ★★★★☆

A 24/7 daemon that monitors multiple event sources and coordinates AI-powered responses.

**Architecture:**
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   GitHub    │  │    Slack    │  │    Cron     │
│  Webhooks   │  │    Events   │  │   Schedule  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                ┌───────▼───────┐
                │ Event Router  │
                │   (Priority)  │
                └───────┬───────┘
                        │
       ┌────────────────┼────────────────┐
       │                │                │
┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
│  Code Agent │  │ Comms Agent │  │ Admin Agent │
│ (PR review) │  │ (responses) │  │ (triaging)  │
└─────────────┘  └─────────────┘  └─────────────┘
```

**Demonstrates:**
- Event-driven architecture with multiple sources
- Subagents for specialized tasks (Lesson 08)
- Priority queues and rate limiting
- Cron scheduling for periodic tasks

**Usage:**
```bash
bun run apps/04_event_orchestrator.ts
```

**Endpoints:**
- `GET /health` - Health check and stats
- `GET /stats` - Processing statistics
- `POST /event` - Submit custom event
- `POST /webhook/github` - GitHub webhook
- `POST /webhook/slack` - Slack webhook

---

### 05: Self-Evolving Agent ★★★★★

An advanced AI agent that can analyze its own performance, learn from mistakes, generate new tools, and improve its prompts over time.

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    Self-Evolving Agent                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Memory    │◄──►│   Agent     │◄──►│    Tool     │ │
│  │   Store     │    │    Core     │    │   Library   │ │
│  └─────────────┘    └──────┬──────┘    └─────────────┘ │
│                            │                            │
│         ┌──────────────────┼──────────────────┐        │
│         │                  │                  │        │
│  ┌──────▼──────┐   ┌───────▼───────┐  ┌──────▼──────┐ │
│  │  Reflector  │   │    Prompt     │  │    Tool     │ │
│  │  (analyze)  │   │   Evolver     │  │  Generator  │ │
│  └─────────────┘   └───────────────┘  └─────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Self-Improvement Loop:**
1. Execute task with current configuration
2. Evaluate outcome (success/failure, quality score)
3. Reflect on what worked and what didn't
4. Generate improvements (new tools, better prompts)
5. Persist learnings to memory
6. Apply successful improvements

**Demonstrates:**
- Meta-learning: Agent reflects on task outcomes
- Tool synthesis: Agent writes new tools as needed
- Prompt evolution: System prompts improve based on performance
- Memory persistence: Long-term learning across sessions (Lesson 17)
- Self-evaluation: Quality scoring

**Usage:**
```bash
bun run apps/05_self_evolving_agent.ts
```

**Persistent Data:**
- `agent_memory.json` - Task outcomes, learnings, generated tools, prompt variants

---

## Curriculum Mapping

Each app demonstrates concepts from multiple lessons:

| Lesson | App 01 | App 02 | App 03 | App 04 | App 05 |
|--------|--------|--------|--------|--------|--------|
| 02: Messages | ✅ | ✅ | ✅ | ✅ | ✅ |
| 05: System Prompts | ✅ | ✅ | ✅ | ✅ | ✅ |
| 06: Custom Tools | | ✅ | ✅ | ✅ | ✅ |
| 07: Streaming | ✅ | | | | |
| 08: Subagents | | | | ✅ | |
| 10: Sessions | ✅ | | | | |
| 12: Error Handling | ✅ | ✅ | ✅ | ✅ | ✅ |
| 13: Structured Output | | ✅ | ✅ | | |
| 14: Cost Tracking | | ✅ | | | |
| 17: Checkpoints | | | | | ✅ |
| 26: Vision/Documents | | ✅ | | | |

## Environment Variables

```bash
# Required for GitHub integration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Optional port configuration
PORT=3001                    # For App 03
ORCHESTRATOR_PORT=3002       # For App 04
```

## Next Steps

After exploring these applications, consider:

1. **Extend App 03** with more GitHub event types (releases, deployments)
2. **Add Slack integration** to App 04 using the Slack Bolt SDK
3. **Implement A/B testing** in App 05 for prompt variants
4. **Add monitoring** with Prometheus/Grafana dashboards
5. **Deploy to production** using Docker or Kubernetes

---

*Built with the Claude API Curriculum - Boundless Digital*
