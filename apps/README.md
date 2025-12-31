# Real-World Claude API Applications

This directory contains 10 real-world applications demonstrating the Claude API concepts from the curriculum, in increasing complexity. Apps 08-10 feature **Knowledge Graph** integration for context-aware AI reasoning.

## Application Overview

| App | Name | Complexity | Key Concepts | Type |
|-----|------|------------|--------------|------|
| 01 | CLI Chat Bot | ★☆☆☆☆ | Messages, Streaming, Sessions | Interactive |
| 02 | Document Q&A | ★★☆☆☆ | Custom Tools, Structured Output, Cost Tracking | CLI Tool |
| 03 | GitHub Webhook Agent | ★★★☆☆ | Event-Driven, Webhooks, PR Review | 24/7 Daemon |
| 04 | Event Orchestrator | ★★★★☆ | Multi-Source Events, Subagents, Priority Queue | 24/7 Daemon |
| 05 | Self-Evolving Agent | ★★★★★ | Meta-Learning, Tool Generation, Prompt Evolution | Autonomous |
| 06 | Multi-Agent Collaboration | ★★★★☆ | Team Coordination, Voting, Specialized Roles | Collaborative |
| 07 | Codebase Maintainer | ★★★★☆ | Security Analysis, Dependency Updates, Auto-Fix | Autonomous |
| 08 | Data Pipeline + KG | ★★★★★ | Simple Knowledge Graph, Entity Extraction, RAG | 24/7 Daemon |
| 09 | Federated Concept Graph | ★★★★★ | Semantic Relationships, Distributed Learning | Distributed |
| 10 | Agent OS + Full KG | ★★★★★ | Ontology, Inference, Temporal Awareness, RAG | Meta-System |

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
bun run apps/06_multi_agent_collab.ts
bun run apps/07_codebase_maintainer.ts
bun run apps/08_data_pipeline_kg.ts
bun run apps/09_federated_concept_graph.ts
bun run apps/10_agent_os_knowledge_graph.ts
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

### 06: Multi-Agent Collaboration ★★★★☆

A collaborative system where 5 specialized AI agents work together on complex tasks.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    Multi-Agent Collaboration System                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Researcher  │  │   Architect  │  │    Coder     │              │
│  │   (domain)   │  │   (design)   │  │  (implement) │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┼─────────────────┘                       │
│                           │                                          │
│                    ┌──────▼──────┐                                  │
│                    │ Coordinator │                                  │
│                    │  (voting)   │                                  │
│                    └──────┬──────┘                                  │
│                           │                                          │
│         ┌─────────────────┼─────────────────┐                       │
│         │                 │                 │                       │
│  ┌──────▼───────┐  ┌──────▼──────┐                                 │
│  │   Reviewer   │  │    Tester   │                                 │
│  │  (quality)   │  │  (verify)   │                                 │
│  └──────────────┘  └─────────────┘                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Workflow Phases:**
1. **Research** - Researcher gathers domain knowledge
2. **Design** - Architect creates implementation plan
3. **Implement** - Coder writes the solution
4. **Review** - Reviewer checks code quality
5. **Test** - Tester verifies correctness

**Demonstrates:**
- Multi-agent coordination and communication
- Democratic voting on decisions
- Specialized agent roles
- Phase-based task execution

**Usage:**
```bash
bun run apps/06_multi_agent_collab.ts
```

---

### 07: Autonomous Codebase Maintainer ★★★★☆

A 24/7 agent that monitors and maintains code quality automatically.

**Components:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    Codebase Maintainer                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │    Security    │  │   Dependency   │  │  Code Quality  │        │
│  │    Analyzer    │  │    Analyzer    │  │    Analyzer    │        │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘        │
│          │                   │                   │                   │
│          └───────────────────┼───────────────────┘                  │
│                              │                                       │
│                       ┌──────▼──────┐                               │
│                       │ Fix Engine  │                               │
│                       │  (auto-fix) │                               │
│                       └──────┬──────┘                               │
│                              │                                       │
│                       ┌──────▼──────┐                               │
│                       │   Report    │                               │
│                       │  Generator  │                               │
│                       └─────────────┘                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Security vulnerability detection
- Outdated dependency detection
- Code quality analysis
- Auto-fix generation
- Continuous monitoring mode

**Demonstrates:**
- Autonomous code analysis
- Pattern-based issue detection
- AI-powered fix generation
- Continuous monitoring

**Usage:**
```bash
# Analyze current directory
bun run apps/07_codebase_maintainer.ts

# Continuous monitoring
bun run apps/07_codebase_maintainer.ts --watch
```

---

### 08: Real-Time Data Pipeline with Knowledge Graph ★★★★★

A streaming data pipeline that builds a knowledge graph in real-time for context-aware AI responses.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    Data Pipeline with Knowledge Graph                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Events Stream    ┌─────────────────────────────────────────────┐   │
│       │           │         Simple Knowledge Graph               │   │
│       ▼           │                                              │   │
│  ┌─────────┐      │    [User] ──performs──> [Action]            │   │
│  │ Entity  │──────│           ──involves──> [Product]           │   │
│  │Extractor│      │    [Action] ──occurred_at──> [Location]     │   │
│  └────┬────┘      │                                              │   │
│       │           └─────────────────────────────────────────────┘   │
│       ▼                           │                                  │
│  ┌─────────┐                      │                                  │
│  │ Anomaly │◄─────────────────────┘                                  │
│  │Detector │ (KG-aware detection)                                    │
│  └────┬────┘                                                         │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────────┐                                                   │
│  │ KG-Aware     │  Context = get_context_for_entity(entity_id)     │
│  │ AI Agent     │  Response = agent.respond(query, context)         │
│  └──────────────┘                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Knowledge Graph Features:**
- Entity extraction from streaming events
- Automatic relationship discovery
- Graph traversal for context retrieval
- Path finding between entities

**Demonstrates:**
- Simple entity-relationship graphs
- Real-time graph construction
- RAG-style context enrichment
- Graph-aware anomaly detection

**Usage:**
```bash
bun run apps/08_data_pipeline_kg.ts
```

---

### 09: Federated Concept Graph ★★★★★

A privacy-preserving distributed learning system where multiple agents share concepts without sharing raw data.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────┐
│               Federated Learning with Concept Graphs                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Medical   │  │  Finance    │  │    Tech     │                 │
│  │    Agent    │  │   Agent     │  │   Agent     │                 │
│  │  ┌───────┐  │  │  ┌───────┐  │  │  ┌───────┐  │                 │
│  │  │Concept│  │  │  │Concept│  │  │  │Concept│  │                 │
│  │  │ Graph │  │  │  │ Graph │  │  │  │ Graph │  │                 │
│  │  └───┬───┘  │  │  └───┬───┘  │  │  └───┬───┘  │                 │
│  └──────┼──────┘  └──────┼──────┘  └──────┼──────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          │ (share concepts, not data)               │
│                   ┌──────▼──────┐                                   │
│                   │  Knowledge  │                                   │
│                   │ Aggregator  │                                   │
│                   └──────┬──────┘                                   │
│                          │                                          │
│                   ┌──────▼──────┐                                   │
│                   │   Global    │                                   │
│                   │   Graph     │                                   │
│                   └─────────────┘                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Semantic Relationship Types:**
- `is_a` - Taxonomy (diabetes is_a disease)
- `part_of` - Composition (fever part_of symptoms)
- `related_to` - Association
- `causes` - Causation (virus causes infection)
- `precedes` - Temporal ordering
- `similar_to` - Semantic similarity

**Features:**
- Local learning from domain-specific data
- Privacy-preserving knowledge sharing
- Confidence scoring and evidence tracking
- Cross-domain knowledge aggregation

**Demonstrates:**
- Concept extraction with semantic relationships
- Federated learning patterns
- Confidence-weighted aggregation
- Multi-agent knowledge synthesis

**Usage:**
```bash
bun run apps/09_federated_concept_graph.ts
```

---

### 10: AI Agent Operating System ★★★★★

A meta-system for spawning and managing AI agents, powered by a full ontology-based knowledge graph with inference capabilities.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                 AI Agent Operating System                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Full Knowledge Graph Engine                     │    │
│  │                                                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │    │
│  │  │  Ontology   │  │  Inference  │  │  Temporal   │         │    │
│  │  │   Classes   │  │   Engine    │  │  Tracking   │         │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │    │
│  │                                                              │    │
│  │  Inference Rules:                                            │    │
│  │    • transitive_is_a: A is_a B, B is_a C → A is_a C        │    │
│  │    • transitive_precedes: A precedes B, B precedes C →      │    │
│  │                           A precedes C                       │    │
│  │                                                              │    │
│  │  Provenance: source, method (direct|inferred|aggregated)    │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │                                       │
│                       ┌──────▼──────┐                               │
│                       │    RAG      │  get_context_for_query(q)     │
│                       │  Retriever  │  → relevant KG context        │
│                       └──────┬──────┘                               │
│                              │                                       │
│  ┌───────────────────────────┼───────────────────────────────┐      │
│  │                    Agent Scheduler                         │      │
│  │                                                            │      │
│  │   spawn()         execute()         recycle()             │      │
│  │      │                │                 │                 │      │
│  │   ┌──▼──┐         ┌──▼──┐          ┌──▼──┐              │      │
│  │   │Agent│─────────│Agent│──────────│Agent│              │      │
│  │   │Pool │         │ Run │          │Pool │              │      │
│  │   └─────┘         └─────┘          └─────┘              │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Knowledge Graph Features:**
- Full ontology with class hierarchies
- Inference engine with transitive rules
- Temporal awareness (valid_from, valid_until)
- Provenance tracking (source, method, evidence)
- Confidence decay over time

**Agent OS Features:**
- Dynamic agent spawning
- Agent lifecycle management (pool → active → recycle)
- RAG-style context injection
- Token and task tracking

**Demonstrates:**
- Ontology-based knowledge representation
- Automatic inference and reasoning
- Temporal relationship modeling
- Full RAG pipeline integration
- Meta-level agent management

**Usage:**
```bash
bun run apps/10_agent_os_knowledge_graph.ts
```

---

## Knowledge Graph Progression

Apps 08-10 demonstrate a progression of knowledge graph complexity:

| App | Graph Type | Key Feature | Use Case |
|-----|-----------|-------------|----------|
| 08 | Simple Entity-Relationship | Basic nodes/edges | Real-time event processing |
| 09 | Concept Graph | Semantic relationships, confidence | Distributed learning |
| 10 | Full Ontology KG | Inference, temporal, provenance | Enterprise AI systems |

**Recommended Libraries:**
- **[Graphology](https://graphology.github.io/)** - Pure TypeScript graph library
- **[Neo4j](https://neo4j.com/)** - Graph database with Cypher queries
- **[Cytoscape.js](https://js.cytoscape.org/)** - Graph visualization

---

## Curriculum Mapping

Each app demonstrates concepts from multiple lessons:

| Lesson | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 |
|--------|----|----|----|----|----|----|----|----|----|----|
| 02: Messages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 05: System Prompts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 06: Custom Tools | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 07: Streaming | ✅ | | | | | | | | | |
| 08: Subagents | | | | ✅ | | ✅ | | | | ✅ |
| 10: Sessions | ✅ | | | | | | | | | |
| 12: Error Handling | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 13: Structured Output | | ✅ | ✅ | | | ✅ | ✅ | ✅ | ✅ | ✅ |
| 14: Cost Tracking | | ✅ | | | | | | | | ✅ |
| 17: Checkpoints | | | | | ✅ | | | | | |
| 26: Vision/Documents | | ✅ | | | | | | | | |
| Knowledge Graphs | | | | | | | | ✅ | ✅ | ✅ |

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
