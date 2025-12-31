/**
 * LESSON 05: System Prompts
 * =========================
 *
 * WHAT YOU'LL LEARN:
 * - How to customize Claude's behavior with system prompts
 * - When and why to use system prompts
 * - Best practices for effective system prompts
 *
 * PREREQUISITE: Lesson 03-04 (allowedTools, permissionMode, file tools)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: systemPrompt Option                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.systemPrompt: string                                  │
 * │                                                                         │
 * │ Custom instructions that define Claude's persona and rules for the      │
 * │ entire conversation. This shapes HOW Claude behaves and responds.       │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   systemPrompt: `You are a security expert. Be concise. Focus on        │
 * │                  vulnerabilities. Output only JSON.`                    │
 * │                                                                         │
 * │ WHAT IT CONTROLS:                                                       │
 * │   - Role/persona: "You are a code reviewer..."                          │
 * │   - Output format: "Always respond in JSON..."                          │
 * │   - Constraints: "Never modify files outside /src..."                   │
 * │   - Tone/style: "Be concise. No pleasantries..."                        │
 * │   - Priorities: "CRITICAL: Never expose API keys..."                    │
 * │                                                                         │
 * │ WITHOUT systemPrompt: Claude uses its default general assistant role.   │
 * │ WITH systemPrompt: Claude adopts your specified persona and rules.      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * COMMON USE CASES:
 * 1. Define expertise: "You are a security expert..."
 * 2. Set constraints: "Never modify files outside /src..."
 * 3. Define output format: "Always respond in JSON..."
 * 4. Set tone: "Be concise. No pleasantries..."
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { c, print_header, print_section, print_footer, log_json, log_response, print_result, print_success, print_warning } from "./util/colors";

print_header("LESSON 05: System Prompts");

// Example 1: Code reviewer persona
print_section("EXAMPLE 1: Code Reviewer Persona");

const code = `
function fetchUser(id) {
  return fetch('/api/users/' + id)
    .then(r => r.json())
}
`;

const result1 = query({
  prompt: `Review this code:\n${code}`,
  options: {
    systemPrompt: `You are a senior code reviewer specializing in security and best practices.

Your review style:
- Be direct and concise
- Focus on issues, not praise
- Categorize issues as: CRITICAL, WARNING, or SUGGESTION
- If no issues, just say "No issues found"

Do NOT explain what the code does - only point out problems.`,
  },
});

for await (const message of result1) {
  if (message.type === "system" && (message as any).subtype === "init") {
    log_json("RAW JSON (init)", message, 400);
  }

  if (message.type === "assistant" && message.message?.content) {
    log_json("RAW JSON (response)", message);
    log_response("PARSED (Claude's review):", message.message.content as any);
  }

  if (message.type === "result") {
    print_result(message as any);
  }
}

// Example 2: JSON-only responses
console.log("\n");
print_section("EXAMPLE 2: JSON Output Format");

const result2 = query({
  prompt: "Analyze the sentiment of: 'I love this product but the shipping was slow'",
  options: {
    systemPrompt: `You are a sentiment analysis API.

RULES:
1. ONLY output valid JSON - no markdown, no explanation
2. Use this exact format:
   {
     "overall": "positive" | "negative" | "mixed",
     "score": <number from -1 to 1>,
     "aspects": [{"topic": string, "sentiment": string}]
   }
3. Never include any text outside the JSON object`,
  },
});

for await (const message of result2) {
  if (message.type === "assistant" && message.message?.content) {
    log_json("RAW JSON (response)", message);

    print_section("PARSED (attempting to parse as JSON):");
    const content = message.message.content;
    const text = typeof content === "string" ? content : (content as any)[0]?.text;

    try {
      const parsed = JSON.parse(text);
      print_success("Successfully parsed:");
      console.log(c.value(JSON.stringify(parsed, null, 2)));
    } catch {
      print_warning("Raw text (not valid JSON): " + text);
    }
  }

  if (message.type === "result") {
    print_result(message as any);
  }
}

// Example 3: Constrained behavior
console.log("\n");
print_section("EXAMPLE 3: Constrained Agent with Tools");

const result3 = query({
  prompt: "What TypeScript files are in this directory?",
  options: {
    allowedTools: ["Glob"],
    permissionMode: "acceptEdits",
    systemPrompt: `You are a codebase explorer assistant.

CONSTRAINTS:
- You can ONLY read and search files
- You cannot modify, create, or delete anything
- Focus on answering questions about the code structure
- If asked to make changes, explain that you're in read-only mode

BEHAVIOR:
- Use Glob to find files
- Be concise in responses
- List findings clearly`,
  },
});

for await (const message of result3) {
  if (message.type === "assistant") {
    const msg = message as any;

    if (msg.subtype === "tool_use") {
      log_json("RAW JSON (tool request)", message);
    } else if (message.message?.content) {
      log_json("RAW JSON (response)", message, 500);
      log_response("PARSED:", message.message.content as any);
    }
  }

  if (message.type === "result") {
    print_result(message as any);
    break;
  }
}

print_footer("END OF LESSON");

/**
 * SYSTEM PROMPT BEST PRACTICES:
 *
 * 1. Be specific about the role
 *    Bad:  "Be helpful"
 *    Good: "You are a TypeScript expert who reviews code for type safety issues"
 *
 * 2. Define output format explicitly
 *    Bad:  "Respond in JSON"
 *    Good: "Output ONLY valid JSON with this schema: {status: string, items: string[]}"
 *
 * 3. Set clear constraints
 *    Bad:  "Be careful"
 *    Good: "Never execute commands that modify files outside the /tmp directory"
 *
 * 4. Include examples if format matters
 *    "Example output: { 'status': 'ok', 'count': 5 }"
 *
 * 5. Prioritize instructions
 *    "CRITICAL: Never expose API keys in responses"
 *
 *
 * WHEN TO USE SYSTEM PROMPTS:
 * ✅ You need consistent behavior across many queries
 * ✅ You want specific output format
 * ✅ You're building a specialized tool
 * ✅ You need to set safety constraints
 *
 * WHEN NOT TO USE:
 * ❌ One-off questions (just put it in the prompt)
 * ❌ Simple tasks that don't need persona
 *
 *
 * KEY TAKEAWAYS:
 * 1. System prompts define Claude's persona and rules
 * 2. Be specific - vague prompts get inconsistent results
 * 3. Combine with tool restrictions for defense in depth
 * 4. Test your system prompt with edge cases
 * 5. For JSON output, use outputFormat (lesson 13) for guaranteed structure
 *
 * DOCUMENTED CONCEPTS INTRODUCED:
 * - systemPrompt option (string)
 * - Persona definition patterns
 * - Output format specification
 * - Constraint definition
 * - Defense in depth (systemPrompt + allowedTools)
 *
 * NEXT: Lesson 06 explores custom tools via MCP servers
 */
