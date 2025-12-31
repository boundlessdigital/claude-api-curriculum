/**
 * LESSON 21: Agent Skills
 * ========================
 *
 * WHAT YOU'LL LEARN:
 * - What Agent Skills are and how they differ from custom tools
 * - How to create a Skill with SKILL.md
 * - How to enable Skills in the SDK
 * - Progressive disclosure and token efficiency
 * - When to use Skills vs custom tools
 *
 * PREREQUISITE: Lesson 06 (custom tools), Lesson 16 (MCP servers)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: What Are Agent Skills?                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Skills are FILESYSTEM-BASED capabilities that extend Claude with       │
 * │ specialized expertise. Unlike tools (specific function calls), Skills  │
 * │ provide domain knowledge that Claude applies AUTONOMOUSLY.             │
 * │                                                                         │
 * │ Location: .claude/skills/<skill-name>/SKILL.md                         │
 * │                                                                         │
 * │ KEY DIFFERENCES FROM TOOLS:                                             │
 * │ | Skills                    | Tools                      |              │
 * │ |---------------------------|----------------------------|              │
 * │ | Filesystem-based          | Code-defined functions     |              │
 * │ | Claude decides when       | Explicit tool calls        |              │
 * │ | Domain expertise          | Specific actions           |              │
 * │ | Progressive loading       | Always in context          |              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: SKILL.md Structure                                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Every Skill requires a SKILL.md file with YAML frontmatter:            │
 * │                                                                         │
 * │ ---                                                                     │
 * │ name: your-skill-name                                                   │
 * │ description: Brief description of what this Skill does                  │
 * │ ---                                                                     │
 * │                                                                         │
 * │ # Your Skill Name                                                       │
 * │                                                                         │
 * │ ## Instructions                                                         │
 * │ [Step-by-step guidance for Claude]                                      │
 * │                                                                         │
 * │ ## Examples                                                             │
 * │ [Concrete examples]                                                     │
 * │                                                                         │
 * │ REQUIREMENTS:                                                           │
 * │ - name: max 64 chars, lowercase + numbers + hyphens only               │
 * │ - description: max 1024 chars, must explain WHEN to use                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: settingSources Option                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.settingSources: ("user" | "project")[]               │
 * │                                                                         │
 * │ REQUIRED to enable Skill discovery:                                     │
 * │ - "user": Load from ~/.claude/skills/                                  │
 * │ - "project": Load from .claude/skills/ in cwd                          │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   query({                                                               │
 * │     prompt: "...",                                                      │
 * │     options: {                                                          │
 * │       settingSources: ["user", "project"],                              │
 * │       allowedTools: ["Skill", ...]  // Must include "Skill"            │
 * │     }                                                                   │
 * │   })                                                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Progressive Disclosure                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Skills use a three-level loading strategy for token efficiency:        │
 * │                                                                         │
 * │ Level 1 - Metadata (at startup):                                        │
 * │   Only name + description loaded (~100 tokens per Skill)               │
 * │                                                                         │
 * │ Level 2 - Instructions (when triggered):                                │
 * │   Full SKILL.md body loaded (<5k tokens)                               │
 * │                                                                         │
 * │ Level 3 - Resources (as needed):                                        │
 * │   Bundled files only when accessed                                     │
 * │                                                                         │
 * │ A Skill can contain 50 reference documents, but if only 1 is needed,  │
 * │ Claude loads just that one - the rest consume zero tokens.             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY USE SKILLS?
 * - Reusable domain expertise across conversations
 * - Token-efficient progressive loading
 * - Claude autonomously decides when to apply them
 * - Version-controllable (check into git)
 * - Shareable across team members
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_success, print_error, print_warning, c } from "./util/colors";
import * as fs from "fs";
import * as path from "path";

print_header("LESSON 21: Agent Skills");

// ==================================================
// PART 1: Create a Skill
// ==================================================

print_section("Part 1: Creating a Skill");

/**
 * SKILL STRUCTURE:
 *
 * Skills are defined as SKILL.md files in .claude/skills/<name>/
 * They use YAML frontmatter for metadata.
 */

// Create the skills directory structure
const skills_dir = path.join(process.cwd(), ".claude", "skills", "code-review");
fs.mkdirSync(skills_dir, { recursive: true });

// Create a sample skill
const skill_content = `---
name: code-review
description: Reviews code for bugs, security issues, and best practices. Use when the user asks for a code review, wants feedback on code quality, or mentions reviewing code.
---

# Code Review Skill

## Instructions

When reviewing code, follow this checklist:

1. **Security Issues**
   - Check for injection vulnerabilities (SQL, command, XSS)
   - Look for hardcoded secrets or credentials
   - Verify input validation

2. **Bug Patterns**
   - Null/undefined checks
   - Off-by-one errors
   - Resource leaks (unclosed handles)
   - Race conditions

3. **Best Practices**
   - DRY (Don't Repeat Yourself)
   - Single Responsibility Principle
   - Clear naming conventions
   - Appropriate error handling

4. **Performance**
   - Unnecessary loops or recursion
   - Memory-inefficient patterns
   - N+1 query patterns

## Output Format

Provide feedback in this structure:
- **Critical**: Issues that must be fixed
- **Warnings**: Issues that should be addressed
- **Suggestions**: Optional improvements
- **Positive**: What's done well

## Example

When reviewing:
\`\`\`typescript
function getUser(id) {
  const query = "SELECT * FROM users WHERE id = " + id;
  return db.query(query);
}
\`\`\`

Output:
- **Critical**: SQL injection vulnerability - use parameterized queries
- **Warning**: Function lacks TypeScript types
- **Suggestion**: Consider returning only needed fields instead of SELECT *
`;

fs.writeFileSync(path.join(skills_dir, "SKILL.md"), skill_content);

print_success("Created skill: code-review");
print_kv("Location", path.join(skills_dir, "SKILL.md"));
console.log(`\n${c.dim("SKILL.md content:")}`);
console.log(c.value(skill_content.substring(0, 500) + "...\n"));

// ==================================================
// PART 2: Enable Skills in SDK
// ==================================================

console.log("");
print_section("Part 2: Using Skills in the SDK");

/**
 * TO ENABLE SKILLS:
 *
 * 1. Set settingSources to load Skills from filesystem
 * 2. Include "Skill" in allowedTools
 * 3. Set cwd to directory containing .claude/skills/
 */

const sample_code = `
function processData(input) {
  const result = eval(input);
  console.log(result);
  return result;
}
`;

const prompt1 = `Review this code for issues:\n\`\`\`typescript\n${sample_code}\n\`\`\``;
console.log(`📤 Prompt: ${prompt1.substring(0, 100)}...\n`);

const result1 = query({
  prompt: prompt1,
  options: {
    /**
     * SETTINGS SOURCES:
     * Required to discover Skills from the filesystem.
     * - "user": ~/.claude/skills/
     * - "project": .claude/skills/ in cwd
     */
    settingSources: ["project"],

    /**
     * CWD:
     * Skills are discovered relative to this directory.
     */
    cwd: process.cwd(),

    /**
     * ALLOWED TOOLS:
     * Must include "Skill" to enable Skill usage.
     */
    allowedTools: ["Skill", "Read"],

    permissionMode: "acceptEdits",
  },
});

for await (const message of result1) {
  print_section(`--- ${message.type} ---`);
  log_json("RAW JSON", message, 500);

  if (message.type === "system" && message.subtype === "init") {
    const init = message as any;
    print_kv("Session", init.session_id);

    // Check if Skills were discovered
    if (init.skills) {
      print_section("📚 DISCOVERED SKILLS");
      for (const skill of init.skills) {
        console.log(`   ${c.highlight(skill.name)}: ${c.value(skill.description?.substring(0, 60))}...`);
      }
    }
  }

  // Check for Skill tool usage in content blocks
  if (message.type === "assistant") {
    const content = (message as any).message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use" && block.name === "Skill") {
          print_section("🎯 SKILL INVOKED");
          print_kv("Skill", block.input?.skill);
          print_kv("Args", JSON.stringify(block.input?.args));
        } else if (block.type === "text" && block.text) {
          console.log(`\n${c.label("💬 Claude:")} ${c.value(block.text.substring(0, 300))}...`);
        }
      }
    }
  }

  if (message.type === "result") {
    print_success("Query complete");
  }
}

// ==================================================
// PART 3: Skills vs Custom Tools Comparison
// ==================================================

console.log("");
print_section("Part 3: When to Use Skills vs Tools");

/**
 * DECISION GUIDE:
 *
 * USE SKILLS WHEN:
 * - You have domain expertise to share (coding standards, processes)
 * - You want Claude to decide when to apply knowledge
 * - Content is reusable across many conversations
 * - You need token-efficient progressive loading
 * - You want to version-control expertise in git
 *
 * USE CUSTOM TOOLS WHEN:
 * - You need to execute specific functions (API calls, file ops)
 * - You want explicit control over when tools are called
 * - You need to return structured data from external systems
 * - You're integrating with external services
 */

console.log(`${c.label("USE SKILLS FOR:")}`);
console.log(`   ${c.dim("-")} Domain expertise (coding standards, review processes)`);
console.log(`   ${c.dim("-")} Best practices and guidelines`);
console.log(`   ${c.dim("-")} Reusable knowledge across conversations`);
console.log(`   ${c.dim("-")} Documentation that Claude should reference`);

console.log(`\n${c.label("USE TOOLS FOR:")}`);
console.log(`   ${c.dim("-")} API calls and external integrations`);
console.log(`   ${c.dim("-")} File operations (Read, Write, Edit)`);
console.log(`   ${c.dim("-")} Database queries`);
console.log(`   ${c.dim("-")} Specific function execution`);

// ==================================================
// PART 4: Advanced Skill Structure
// ==================================================

console.log("");
print_section("Part 4: Advanced Skill Patterns");

/**
 * ADVANCED SKILLS:
 *
 * Skills can include additional files for progressive loading:
 * - SKILL.md (required): Main instructions
 * - REFERENCE.md: Additional reference documentation
 * - FORMS.md: Form templates or structured data
 * - scripts/: Helper scripts
 *
 * Claude loads these on-demand, saving tokens.
 */

// Create an advanced skill with multiple files
const advanced_skill_dir = path.join(process.cwd(), ".claude", "skills", "api-design");
fs.mkdirSync(advanced_skill_dir, { recursive: true });

const api_skill = `---
name: api-design
description: Designs RESTful APIs following best practices. Use when creating new endpoints, reviewing API designs, or discussing REST patterns.
---

# API Design Skill

## Core Principles

1. Use nouns for resources, not verbs
2. Use HTTP methods correctly (GET, POST, PUT, DELETE)
3. Return appropriate status codes
4. Version your APIs
5. Use consistent naming conventions

## Resource Naming

- Collection: /users (plural)
- Single item: /users/{id}
- Nested: /users/{id}/orders

For detailed patterns, see [REFERENCE.md](REFERENCE.md)
`;

const api_reference = `# API Design Reference

## Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Not allowed |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable | Validation failed |
| 500 | Server Error | Internal error |

## Pagination

Use cursor-based pagination for large datasets:
\`\`\`json
{
  "data": [...],
  "next_cursor": "abc123",
  "has_more": true
}
\`\`\`
`;

fs.writeFileSync(path.join(advanced_skill_dir, "SKILL.md"), api_skill);
fs.writeFileSync(path.join(advanced_skill_dir, "REFERENCE.md"), api_reference);

print_success("Created advanced skill: api-design");
print_kv("Main file", "SKILL.md");
print_kv("Reference", "REFERENCE.md (loaded on-demand)");

console.log(`\n${c.label("Progressive Loading Benefit:")}`);
console.log(`   ${c.dim("At startup:")} Only name + description loaded (~100 tokens)`);
console.log(`   ${c.dim("When needed:")} SKILL.md body loaded`);
console.log(`   ${c.dim("On demand:")} REFERENCE.md loaded only if API details needed`);

// ==================================================
// Cleanup
// ==================================================

console.log("");
print_section("Cleanup");

// Clean up the created skills
fs.rmSync(path.join(process.cwd(), ".claude"), { recursive: true, force: true });
print_success("Cleaned up demo skills");

print_footer("END OF LESSON");

/**
 * SKILL.md TEMPLATE:
 *
 * ---
 * name: skill-name
 * description: What this skill does AND when Claude should use it
 * ---
 *
 * # Skill Name
 *
 * ## Instructions
 * [Step-by-step guidance]
 *
 * ## Examples
 * [Concrete examples]
 *
 * ## Reference
 * For more details, see [REFERENCE.md](REFERENCE.md)
 *
 *
 * SKILL LOCATIONS:
 *
 * 1. Project Skills (shared via git):
 *    .claude/skills/<name>/SKILL.md
 *
 * 2. User Skills (personal, all projects):
 *    ~/.claude/skills/<name>/SKILL.md
 *
 *
 * SDK OPTIONS FOR SKILLS:
 *
 * {
 *   settingSources: ["user", "project"],  // REQUIRED for discovery
 *   cwd: "/path/to/project",              // Where to look for .claude/
 *   allowedTools: ["Skill", ...]          // MUST include "Skill"
 * }
 *
 *
 * PROGRESSIVE DISCLOSURE LEVELS:
 *
 * Level 1 - Metadata (startup):
 *   - name + description from YAML
 *   - ~100 tokens per Skill
 *
 * Level 2 - Instructions (when triggered):
 *   - Full SKILL.md body
 *   - <5k tokens
 *
 * Level 3 - Resources (on-demand):
 *   - REFERENCE.md, scripts/, etc.
 *   - Only when specifically accessed
 *
 *
 * WHEN TO USE SKILLS:
 *
 * ✅ Domain expertise (coding standards, processes)
 * ✅ Reusable knowledge across conversations
 * ✅ Best practices and guidelines
 * ✅ Token-efficient large documentation
 * ✅ Team-shareable via version control
 *
 * ❌ NOT for: API calls, file operations, external integrations
 *    (Use custom tools for those - see Lesson 06)
 *
 *
 * KEY TAKEAWAYS:
 * 1. Skills are filesystem-based (.claude/skills/<name>/SKILL.md)
 * 2. Use settingSources: ["user", "project"] to enable discovery
 * 3. Include "Skill" in allowedTools
 * 4. Skills provide domain expertise; Tools execute functions
 * 5. Progressive disclosure saves tokens on large Skills
 * 6. Can include REFERENCE.md and other files for on-demand loading
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - Skills vs custom tools distinction
 * - SKILL.md structure (YAML frontmatter + markdown)
 * - settingSources option
 * - Progressive disclosure (3-level loading)
 * - Skill locations (project vs user)
 *
 * NEXT: Lesson 22 explores fine-grained tool streaming
 */
