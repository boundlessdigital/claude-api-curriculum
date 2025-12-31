#!/usr/bin/env bun
/**
 * APP 6: Collaborative Multi-Agent System
 * =========================================
 *
 * Multiple specialized agents (researcher, architect, coder, reviewer, tester)
 * that collaborate on complex software development tasks by negotiating,
 * delegating, and reviewing each other's work.
 *
 * COMPLEXITY: ★★★★★ (Expert)
 *
 * Architecture:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                    Collaboration Hub                        │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │                                                             │
 *   │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐│
 *   │  │Researcher │  │ Architect │  │  Coder    │  │ Reviewer  ││
 *   │  │  Agent    │◄─►│  Agent    │◄─►│  Agent    │◄─►│  Agent    ││
 *   │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘│
 *   │        │              │              │              │       │
 *   │        └──────────────┼──────────────┼──────────────┘       │
 *   │                       │              │                       │
 *   │               ┌───────▼──────────────▼───────┐              │
 *   │               │    Shared Knowledge Base     │              │
 *   │               │   (context, decisions, code) │              │
 *   │               └──────────────────────────────┘              │
 *   │                                                             │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Agent Roles:
 *   - Researcher: Gathers requirements, researches solutions
 *   - Architect: Designs system architecture, makes technical decisions
 *   - Coder: Implements the solution
 *   - Reviewer: Reviews code, suggests improvements
 *   - Tester: Writes and runs tests
 *
 * Collaboration Protocol:
 *   1. Task decomposition by Architect
 *   2. Research phase by Researcher
 *   3. Design review (all agents vote)
 *   4. Implementation by Coder
 *   5. Code review by Reviewer
 *   6. Testing by Tester
 *   7. Final approval (consensus required)
 *
 * Usage:
 *   bun run apps/06_multi_agent_collab.ts "Build a REST API for user management"
 */

import Anthropic from "@anthropic-ai/sdk";
import { EventEmitter } from "events";

// ============================================================
// Configuration
// ============================================================

const MODEL = "claude-sonnet-4-20250514";

// ============================================================
// Types
// ============================================================

type AgentRole = "researcher" | "architect" | "coder" | "reviewer" | "tester" | "coordinator";

interface Message {
  id: string;
  from: AgentRole;
  to: AgentRole | "all";
  type: "request" | "response" | "proposal" | "vote" | "artifact" | "feedback";
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

interface Vote {
  agent: AgentRole;
  decision: "approve" | "reject" | "abstain";
  reason: string;
}

interface Artifact {
  id: string;
  type: "research" | "design" | "code" | "test" | "review";
  content: string;
  created_by: AgentRole;
  version: number;
  approved: boolean;
}

interface SharedContext {
  task: string;
  messages: Message[];
  artifacts: Artifact[];
  decisions: Array<{ decision: string; votes: Vote[]; outcome: string }>;
  current_phase: "research" | "design" | "implementation" | "review" | "testing" | "complete";
}

// ============================================================
// Utilities
// ============================================================

const log = {
  agent: (role: AgentRole, msg: string) => {
    const icons: Record<AgentRole, string> = {
      researcher: "🔍",
      architect: "📐",
      coder: "💻",
      reviewer: "👀",
      tester: "🧪",
      coordinator: "🎯",
    };
    console.log(`[${ts()}] ${icons[role]} [${role.toUpperCase()}] ${msg}`);
  },
  system: (msg: string) => console.log(`[${ts()}] ⚙️  ${msg}`),
  collab: (msg: string) => console.log(`[${ts()}] 🤝 ${msg}`),
  vote: (msg: string) => console.log(`[${ts()}] 🗳️  ${msg}`),
  artifact: (msg: string) => console.log(`[${ts()}] 📄 ${msg}`),
};

function ts(): string {
  return new Date().toISOString().split("T")[1].split(".")[0];
}

function generate_id(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// ============================================================
// Agent Base Class
// ============================================================

class Agent {
  protected client: Anthropic;
  protected role: AgentRole;
  protected system_prompt: string;
  protected context: SharedContext;

  constructor(role: AgentRole, system_prompt: string, context: SharedContext) {
    this.client = new Anthropic();
    this.role = role;
    this.system_prompt = system_prompt;
    this.context = context;
  }

  async think(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: this.system_prompt,
      messages: [
        {
          role: "user",
          content: `Current Task: ${this.context.task}

Current Phase: ${this.context.current_phase}

Recent Messages:
${this.context.messages.slice(-5).map((m) => `[${m.from} → ${m.to}] ${m.content.slice(0, 200)}`).join("\n")}

Existing Artifacts:
${this.context.artifacts.map((a) => `[${a.type}] by ${a.created_by} (v${a.version}): ${a.content.slice(0, 100)}...`).join("\n") || "None yet"}

Your task: ${prompt}`,
        },
      ],
    });

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }

  async vote(proposal: string): Promise<Vote> {
    const response = await this.think(
      `Vote on this proposal: "${proposal}"

Respond with JSON: {"decision": "approve|reject|abstain", "reason": "your reasoning"}`
    );

    try {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          agent: this.role,
          decision: parsed.decision || "abstain",
          reason: parsed.reason || "No reason provided",
        };
      }
    } catch {
      // Parse failed
    }

    return {
      agent: this.role,
      decision: "abstain",
      reason: "Could not form opinion",
    };
  }

  send_message(to: AgentRole | "all", type: Message["type"], content: string, metadata?: Record<string, unknown>): Message {
    const msg: Message = {
      id: generate_id(),
      from: this.role,
      to,
      type,
      content,
      metadata,
      timestamp: new Date(),
    };
    this.context.messages.push(msg);
    log.agent(this.role, `→ ${to}: ${content.slice(0, 80)}...`);
    return msg;
  }
}

// ============================================================
// Specialized Agents
// ============================================================

class ResearcherAgent extends Agent {
  constructor(context: SharedContext) {
    super(
      "researcher",
      `You are a Research Agent specializing in gathering requirements and researching solutions.

Your responsibilities:
1. Analyze task requirements thoroughly
2. Research best practices and existing solutions
3. Identify potential challenges and risks
4. Gather relevant information for the team

Be thorough but concise. Focus on actionable insights.`,
      context
    );
  }

  async research(): Promise<Artifact> {
    log.agent(this.role, "Starting research phase...");

    const research = await this.think(
      `Research the task and provide:
1. Key requirements identified
2. Recommended technologies/approaches
3. Potential challenges
4. Best practices to follow

Format as a structured research report.`
    );

    const artifact: Artifact = {
      id: generate_id(),
      type: "research",
      content: research,
      created_by: this.role,
      version: 1,
      approved: false,
    };

    this.context.artifacts.push(artifact);
    this.send_message("all", "artifact", `Research complete: ${research.slice(0, 100)}...`, { artifact_id: artifact.id });

    return artifact;
  }
}

class ArchitectAgent extends Agent {
  constructor(context: SharedContext) {
    super(
      "architect",
      `You are an Architect Agent specializing in system design and technical decisions.

Your responsibilities:
1. Design system architecture based on requirements
2. Make key technical decisions
3. Define component interfaces
4. Ensure scalability and maintainability

Provide clear, implementable designs.`,
      context
    );
  }

  async design(): Promise<Artifact> {
    log.agent(this.role, "Creating system design...");

    const research = this.context.artifacts.find((a) => a.type === "research");

    const design = await this.think(
      `Based on the research: ${research?.content.slice(0, 500) || "No research available"}

Create a system design including:
1. Architecture overview
2. Component breakdown
3. Data models
4. API endpoints (if applicable)
5. Key technical decisions

Format as a clear design document.`
    );

    const artifact: Artifact = {
      id: generate_id(),
      type: "design",
      content: design,
      created_by: this.role,
      version: 1,
      approved: false,
    };

    this.context.artifacts.push(artifact);
    this.send_message("all", "proposal", `Design proposal ready for review`, { artifact_id: artifact.id });

    return artifact;
  }
}

class CoderAgent extends Agent {
  constructor(context: SharedContext) {
    super(
      "coder",
      `You are a Coder Agent specializing in implementing solutions.

Your responsibilities:
1. Write clean, efficient code
2. Follow the architect's design
3. Implement all specified features
4. Handle edge cases properly

Write production-quality code with proper error handling.`,
      context
    );
  }

  async implement(): Promise<Artifact> {
    log.agent(this.role, "Implementing solution...");

    const design = this.context.artifacts.find((a) => a.type === "design");

    const code = await this.think(
      `Based on the design: ${design?.content.slice(0, 1000) || "No design available"}

Implement the solution:
1. Write the main code
2. Include proper error handling
3. Add comments for complex logic
4. Follow best practices

Provide complete, runnable TypeScript code.`
    );

    const artifact: Artifact = {
      id: generate_id(),
      type: "code",
      content: code,
      created_by: this.role,
      version: 1,
      approved: false,
    };

    this.context.artifacts.push(artifact);
    this.send_message("reviewer", "request", `Code ready for review`, { artifact_id: artifact.id });

    return artifact;
  }
}

class ReviewerAgent extends Agent {
  constructor(context: SharedContext) {
    super(
      "reviewer",
      `You are a Reviewer Agent specializing in code quality and best practices.

Your responsibilities:
1. Review code for bugs and issues
2. Check for security vulnerabilities
3. Ensure code follows best practices
4. Suggest improvements

Be constructive and specific in feedback.`,
      context
    );
  }

  async review(): Promise<Artifact> {
    log.agent(this.role, "Reviewing code...");

    const code = this.context.artifacts.find((a) => a.type === "code");

    const review = await this.think(
      `Review this code: ${code?.content.slice(0, 2000) || "No code available"}

Provide:
1. Issues found (bugs, security, performance)
2. Code quality assessment
3. Suggestions for improvement
4. Overall verdict (approve/request changes)

Format as a structured code review.`
    );

    const artifact: Artifact = {
      id: generate_id(),
      type: "review",
      content: review,
      created_by: this.role,
      version: 1,
      approved: false,
    };

    this.context.artifacts.push(artifact);
    this.send_message("coder", "feedback", `Review complete`, { artifact_id: artifact.id });

    return artifact;
  }
}

class TesterAgent extends Agent {
  constructor(context: SharedContext) {
    super(
      "tester",
      `You are a Tester Agent specializing in quality assurance.

Your responsibilities:
1. Write comprehensive test cases
2. Test edge cases and error conditions
3. Verify all requirements are met
4. Report any issues found

Be thorough in testing coverage.`,
      context
    );
  }

  async test(): Promise<Artifact> {
    log.agent(this.role, "Writing and running tests...");

    const code = this.context.artifacts.find((a) => a.type === "code");

    const tests = await this.think(
      `For this code: ${code?.content.slice(0, 1500) || "No code available"}

Create:
1. Unit tests for key functions
2. Integration tests
3. Edge case tests
4. Test results summary

Format as test code with expected results.`
    );

    const artifact: Artifact = {
      id: generate_id(),
      type: "test",
      content: tests,
      created_by: this.role,
      version: 1,
      approved: false,
    };

    this.context.artifacts.push(artifact);
    this.send_message("all", "artifact", `Tests complete`, { artifact_id: artifact.id });

    return artifact;
  }
}

// ============================================================
// Collaboration Hub
// ============================================================

class CollaborationHub extends EventEmitter {
  private context: SharedContext;
  private agents: Map<AgentRole, Agent>;

  constructor(task: string) {
    super();
    this.context = {
      task,
      messages: [],
      artifacts: [],
      decisions: [],
      current_phase: "research",
    };

    this.agents = new Map([
      ["researcher", new ResearcherAgent(this.context)],
      ["architect", new ArchitectAgent(this.context)],
      ["coder", new CoderAgent(this.context)],
      ["reviewer", new ReviewerAgent(this.context)],
      ["tester", new TesterAgent(this.context)],
    ]);
  }

  async hold_vote(proposal: string): Promise<{ passed: boolean; votes: Vote[] }> {
    log.vote(`Voting on: ${proposal.slice(0, 50)}...`);

    const votes: Vote[] = [];
    for (const [role, agent] of this.agents) {
      if (role !== "coordinator") {
        const vote = await agent.vote(proposal);
        votes.push(vote);
        log.vote(`${role}: ${vote.decision} - ${vote.reason.slice(0, 50)}`);
      }
    }

    const approvals = votes.filter((v) => v.decision === "approve").length;
    const rejections = votes.filter((v) => v.decision === "reject").length;
    const passed = approvals > rejections && approvals >= 2;

    const outcome = passed ? "APPROVED" : "REJECTED";
    log.vote(`Result: ${outcome} (${approvals} approve, ${rejections} reject)`);

    this.context.decisions.push({ decision: proposal, votes, outcome });

    return { passed, votes };
  }

  async execute(): Promise<{
    success: boolean;
    artifacts: Artifact[];
    summary: string;
  }> {
    log.system(`Starting collaborative development: "${this.context.task}"`);

    try {
      // Phase 1: Research
      this.context.current_phase = "research";
      log.collab("=== PHASE 1: RESEARCH ===");
      const researcher = this.agents.get("researcher") as ResearcherAgent;
      await researcher.research();

      // Phase 2: Design
      this.context.current_phase = "design";
      log.collab("=== PHASE 2: DESIGN ===");
      const architect = this.agents.get("architect") as ArchitectAgent;
      const design = await architect.design();

      // Vote on design
      const design_vote = await this.hold_vote(`Approve design: ${design.content.slice(0, 200)}...`);
      if (!design_vote.passed) {
        log.system("Design rejected, would iterate in full implementation");
      }
      design.approved = design_vote.passed;

      // Phase 3: Implementation
      this.context.current_phase = "implementation";
      log.collab("=== PHASE 3: IMPLEMENTATION ===");
      const coder = this.agents.get("coder") as CoderAgent;
      await coder.implement();

      // Phase 4: Review
      this.context.current_phase = "review";
      log.collab("=== PHASE 4: CODE REVIEW ===");
      const reviewer = this.agents.get("reviewer") as ReviewerAgent;
      const review = await reviewer.review();

      // Vote on code
      const code = this.context.artifacts.find((a) => a.type === "code");
      const code_vote = await this.hold_vote(`Approve code after review: ${review.content.slice(0, 200)}...`);
      if (code) code.approved = code_vote.passed;

      // Phase 5: Testing
      this.context.current_phase = "testing";
      log.collab("=== PHASE 5: TESTING ===");
      const tester = this.agents.get("tester") as TesterAgent;
      await tester.test();

      // Final approval
      this.context.current_phase = "complete";
      log.collab("=== FINAL APPROVAL ===");
      const final_vote = await this.hold_vote("Approve final deliverable for release");

      const summary = this.generate_summary(final_vote.passed);

      return {
        success: final_vote.passed,
        artifacts: this.context.artifacts,
        summary,
      };
    } catch (error) {
      log.system(`Error: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        artifacts: this.context.artifacts,
        summary: `Failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private generate_summary(approved: boolean): string {
    const research = this.context.artifacts.find((a) => a.type === "research");
    const design = this.context.artifacts.find((a) => a.type === "design");
    const code = this.context.artifacts.find((a) => a.type === "code");
    const review = this.context.artifacts.find((a) => a.type === "review");
    const tests = this.context.artifacts.find((a) => a.type === "test");

    return `
## Collaborative Development Summary

**Task:** ${this.context.task}
**Status:** ${approved ? "✅ APPROVED" : "❌ NOT APPROVED"}

### Phases Completed

1. **Research** by Researcher Agent
${research ? research.content.slice(0, 300) + "..." : "Not completed"}

2. **Design** by Architect Agent (${design?.approved ? "Approved" : "Pending"})
${design ? design.content.slice(0, 300) + "..." : "Not completed"}

3. **Implementation** by Coder Agent
${code ? "```\n" + code.content.slice(0, 500) + "\n```" : "Not completed"}

4. **Review** by Reviewer Agent
${review ? review.content.slice(0, 300) + "..." : "Not completed"}

5. **Testing** by Tester Agent
${tests ? tests.content.slice(0, 300) + "..." : "Not completed"}

### Decisions Made
${this.context.decisions.map((d) => `- ${d.decision.slice(0, 50)}... → ${d.outcome}`).join("\n")}

### Messages Exchanged: ${this.context.messages.length}
### Total Artifacts: ${this.context.artifacts.length}
`;
  }
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         Collaborative Multi-Agent Development System          ║
╠═══════════════════════════════════════════════════════════════╣
║  Agents: Researcher, Architect, Coder, Reviewer, Tester       ║
║  Protocol: Research → Design → Implement → Review → Test      ║
║  Governance: Democratic voting on key decisions               ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const task = process.argv.slice(2).join(" ") ||
    "Build a simple REST API for managing a todo list with CRUD operations";

  log.system(`Task: ${task}\n`);

  const hub = new CollaborationHub(task);
  const result = await hub.execute();

  console.log("\n" + "=".repeat(60));
  console.log(result.summary);

  if (result.success) {
    console.log("\n✅ Project completed successfully with team consensus!");
  } else {
    console.log("\n⚠️ Project needs more iteration before approval.");
  }
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
