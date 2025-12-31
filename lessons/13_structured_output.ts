/**
 * LESSON 13: Structured Outputs (JSON Schema)
 * ===========================================
 *
 * WHAT YOU'LL LEARN:
 * - How to get typed JSON responses instead of free text
 * - JSON Schema syntax for defining output structure
 * - How to access structured_output from the result
 * - When structured output fails and how to handle it
 *
 * PREREQUISITE: Lesson 12 (error handling, result subtypes)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: outputFormat Option                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ FROM SDK: options.outputFormat: { type: "json_schema", schema: object } │
 * │                                                                         │
 * │ Forces Claude to return valid JSON matching your schema.                │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   outputFormat: {                                                       │
 * │     type: "json_schema",                                                │
 * │     schema: {                                                           │
 * │       type: "object",                                                   │
 * │       properties: { ... },                                              │
 * │       required: ["..."]                                                 │
 * │     }                                                                   │
 * │   }                                                                     │
 * │                                                                         │
 * │ If validation fails repeatedly: error_max_structured_output_retries     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: structured_output Field                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ When using outputFormat, the parsed JSON is in:                         │
 * │   result.structured_output  ← Use this! (already parsed)                │
 * │                                                                         │
 * │ NOT in:                                                                 │
 * │   result.result  ← This is the raw string (don't use)                   │
 * │                                                                         │
 * │ EXAMPLE:                                                                │
 * │   if (message.type === "result" && message.subtype === "success") {     │
 * │     const data = message.structured_output as MyType;                   │
 * │     // data is already parsed JSON, matching your schema                │
 * │   }                                                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY THIS MATTERS:
 * Free text responses are unpredictable. In production, you need:
 * - Guaranteed JSON format
 * - Type-safe parsing
 * - Consistent structure across requests
 *
 * WITHOUT structured output:
 *   "The code has 3 issues: first..."  <- Hard to parse programmatically
 *
 * WITH structured output:
 *   { "issues": [...], "score": 7 }    <- Easy to use in code
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { print_header, print_section, print_footer, print_kv, log_json, print_result, print_success, print_error, c } from "./util/colors";

print_header("LESSON 13: Structured Outputs (JSON Schema)");

// ==================================================
// PART 1: Basic JSON Schema
// ==================================================

/**
 * JSON Schema defines the structure of the output.
 * Key properties:
 * - type: "object", "array", "string", "number", "boolean"
 * - properties: Object fields (for type: "object")
 * - items: Array element schema (for type: "array")
 * - required: Which fields are mandatory
 * - enum: Allowed values for a field
 * - description: Helps Claude understand what to put there
 */
const sentiment_schema = {
  type: "object",
  properties: {
    sentiment: {
      type: "string",
      enum: ["positive", "negative", "neutral", "mixed"],
      description: "The overall sentiment of the text",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Confidence score from 0 to 1",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "Key words that influenced the sentiment",
    },
  },
  required: ["sentiment", "confidence", "keywords"],
};

// TypeScript interface matching the schema (for type safety)
interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  confidence: number;
  keywords: string[];
}

print_section("Part 1: Basic Sentiment Analysis");

const prompt1 = "Analyze the sentiment: 'I love this product but shipping was slow'";
console.log(`📤 Prompt: ${prompt1}\n`);

const result1 = query({
  prompt: prompt1,
  options: {
    outputFormat: {
      type: "json_schema",
      schema: sentiment_schema,
    },
  },
});

for await (const message of result1) {
  // Log raw JSON to see the structure
  print_section(`--- ${message.type} ---`);
  log_json("RAW JSON", message, 800);

  if (message.type === "result") {
    const res = message as any;

    if (res.subtype === "success") {
      /**
       * STRUCTURED OUTPUT LOCATION
       * When using outputFormat, the parsed JSON is in:
       *   message.structured_output
       *
       * NOT in message.result (which contains the raw text response)
       */
      const output = res.structured_output as SentimentResult;

      print_section("📊 PARSED STRUCTURED OUTPUT");
      print_kv("Sentiment", output.sentiment);
      print_kv("Confidence", output.confidence);
      print_kv("Keywords", output.keywords.join(", "));
    } else if (res.subtype === "error_max_structured_output_retries") {
      /**
       * VALIDATION FAILED
       * Claude couldn't produce valid JSON after multiple retries.
       * This happens when:
       * - Schema is too complex
       * - Task doesn't fit the expected output
       * - Conflicting requirements
       */
      print_error("Failed to generate structured output");
      print_kv("Errors", res.errors);
    }
  }
}

// ==================================================
// PART 2: Complex Nested Schema
// ==================================================

console.log("");
print_section("Part 2: Complex Code Review Schema");

/**
 * More complex schema with nested objects and arrays.
 * This shows how to define:
 * - Nested objects
 * - Arrays of objects
 * - Optional fields (not in 'required')
 * - Enums for constrained values
 */
const code_review_schema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "One sentence summary of the code quality",
    },
    score: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Quality score from 0-100",
    },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: {
            type: "string",
            enum: ["critical", "warning", "suggestion"],
          },
          line: {
            type: "number",
            description: "Line number if applicable",
          },
          message: {
            type: "string",
            description: "Description of the issue",
          },
          fix: {
            type: "string",
            description: "Suggested fix",
          },
        },
        required: ["severity", "message"], // line and fix are optional
      },
      description: "List of issues found",
    },
    recommendation: {
      type: "string",
      enum: ["approve", "request_changes", "needs_discussion"],
      description: "Overall recommendation",
    },
  },
  required: ["summary", "score", "issues", "recommendation"],
};

interface CodeReview {
  summary: string;
  score: number;
  issues: Array<{
    severity: "critical" | "warning" | "suggestion";
    line?: number;
    message: string;
    fix?: string;
  }>;
  recommendation: "approve" | "request_changes" | "needs_discussion";
}

const code_to_review = `
function fetchUser(id) {
  return fetch('/api/users/' + id)
    .then(r => r.json())
}
`;

const prompt2 = `Review this JavaScript code:\n\`\`\`javascript\n${code_to_review}\n\`\`\``;
console.log(`📤 Prompt: ${prompt2}\n`);

const result2 = query({
  prompt: prompt2,
  options: {
    outputFormat: {
      type: "json_schema",
      schema: code_review_schema,
    },
  },
});

for await (const message of result2) {
  if (message.type === "result" && message.subtype === "success") {
    const review = (message as any).structured_output as CodeReview;

    print_section("📋 CODE REVIEW RESULT");
    print_kv("Summary", review.summary);
    print_kv("Score", `${review.score}/100`);
    print_kv("Recommendation", review.recommendation);

    if (review.issues.length > 0) {
      console.log(c.label("\n  → Issues:"));
      for (const issue of review.issues) {
        const line_info = issue.line ? ` (line ${issue.line})` : "";
        const severity_color = issue.severity === "critical" ? c.error : issue.severity === "warning" ? c.warning : c.info;
        console.log(`    ${severity_color(`[${issue.severity.toUpperCase()}]`)}${c.dim(line_info)}`);
        console.log(`      ${c.value(issue.message)}`);
        if (issue.fix) {
          console.log(`      ${c.label("Fix:")} ${c.dim(issue.fix)}`);
        }
      }
    } else {
      print_success("No issues found!");
    }

    // Raw JSON for reference
    log_json("\n  RAW structured_output", review);
  }
}

// ==================================================
// PART 3: Using with Tools
// ==================================================

console.log("");
print_section("Part 3: Structured Output with Tools");

/**
 * IMPORTANT: Structured output works WITH tools.
 * Claude can use tools to gather information, then format the
 * final response according to your schema.
 */

const file_analysis_schema = {
  type: "object",
  properties: {
    files_analyzed: {
      type: "number",
      description: "Number of files analyzed",
    },
    total_lines: {
      type: "number",
      description: "Total lines of code",
    },
    languages: {
      type: "array",
      items: { type: "string" },
      description: "Programming languages detected",
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          file: { type: "string" },
          observation: { type: "string" },
        },
        required: ["file", "observation"],
      },
    },
  },
  required: ["files_analyzed", "total_lines", "languages", "findings"],
};

const prompt3 = "Analyze the TypeScript files in the current directory. Count lines and note any patterns.";
console.log(`📤 Prompt: ${prompt3}\n`);

const result3 = query({
  prompt: prompt3,
  options: {
    allowedTools: ["Glob", "Read"],
    permissionMode: "acceptEdits",
    outputFormat: {
      type: "json_schema",
      schema: file_analysis_schema,
    },
  },
});

for await (const message of result3) {
  // Show tool usage - tool_use is in content blocks
  if (message.type === "assistant") {
    const content = (message as any).message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use") {
          print_kv("Using tool", block.name);
        }
      }
    }
  }

  if (message.type === "result" && message.subtype === "success") {
    const analysis = (message as any).structured_output;
    print_section("\n📊 FILE ANALYSIS (structured)");
    log_json("Result", analysis);
  }
}

print_footer("END OF LESSON");

/**
 * RESULT MESSAGE WITH STRUCTURED OUTPUT (raw JSON):
 *
 * {
 *   "type": "result",
 *   "subtype": "success",
 *   "result": "{\"sentiment\":\"mixed\",...}",   // Raw JSON string
 *   "structured_output": {                       // Parsed object!
 *     "sentiment": "mixed",
 *     "confidence": 0.8,
 *     "keywords": ["love", "slow"]
 *   },
 *   "total_cost_usd": 0.002,
 *   ...
 * }
 *
 *
 * SCHEMA TIPS:
 *
 * 1. Use 'description' fields liberally
 *    They help Claude understand what you want.
 *
 * 2. Use 'enum' for constrained values
 *    Ensures consistent, predictable values.
 *
 * 3. Keep schemas as simple as possible
 *    Complex schemas increase failure risk.
 *
 * 4. Make optional fields actually optional
 *    Don't put everything in 'required'.
 *
 * 5. Test with edge cases
 *    "What if there are no issues?" "What if text is empty?"
 *
 *
 * COMMON MISTAKES:
 *
 * ❌ Accessing message.result (raw string)
 * ✅ Accessing message.structured_output (parsed object)
 *
 * ❌ Not handling error_max_structured_output_retries
 * ✅ Having a fallback when structured output fails
 *
 * ❌ Very deeply nested schemas
 * ✅ Flatter structures that are easier to validate
 *
 *
 * KEY TAKEAWAYS:
 * 1. Use outputFormat: { type: "json_schema", schema: {...} }
 * 2. Access the result via message.structured_output (parsed)
 * 3. Create matching TypeScript interfaces for type safety
 * 4. Handle error_max_structured_output_retries as a failure mode
 * 5. Structured output works alongside tools - Claude gathers info then formats
 * 6. Use 'description' in schema to guide Claude
 * 7. Use 'enum' for constrained values
 */
