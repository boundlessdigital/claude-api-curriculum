/**
 * LESSON 33: Web Search Tool
 * ===========================
 *
 * WHAT YOU'LL LEARN:
 * - What the web search tool is and why it's useful
 * - How to enable web search in API calls
 * - Understanding the response structure
 * - Domain filtering and user location
 * - Handling search results and citations
 * - Rate limits and pricing
 *
 * PREREQUISITE: Lesson 06 (Custom Tools)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Web Search Tool                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The web search tool gives Claude access to real-time web content,      │
 * │ allowing it to answer questions with up-to-date information beyond     │
 * │ its knowledge cutoff.                                                   │
 * │                                                                         │
 * │ Claude automatically decides when to search and cites sources.         │
 * │                                                                         │
 * │ Tool type: "web_search_20250305"                                        │
 * │ Name:      "web_search"                                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Response Structure                                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Web search responses contain multiple content blocks:                  │
 * │                                                                         │
 * │ 1. text                  → Claude's reasoning about searching          │
 * │ 2. server_tool_use       → The search query being executed             │
 * │ 3. web_search_tool_result → Search results with URLs and snippets      │
 * │ 4. text (with citations) → Final answer citing sources                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * SUPPORTED MODELS:
 * - Claude Sonnet 4.5, Sonnet 4, Haiku 4.5
 * - Claude Opus 4.5, Opus 4.1, Opus 4
 *
 * PRICING:
 * - $10 per 1,000 web searches (plus standard token costs)
 * - Citation fields don't count toward token usage
 */

import Anthropic from "@anthropic-ai/sdk";
import { print_header, print_section, print_footer, print_kv, log_json, c } from "./util/colors";

print_header("LESSON 33: Web Search Tool");

const anthropic = new Anthropic();

// ==================================================
// PART 1: Why Web Search?
// ==================================================

print_section("Part 1: Why Web Search?");

/**
 * WEB SEARCH BENEFITS:
 *
 * 1. Real-time information beyond knowledge cutoff
 * 2. Current events, news, and live data
 * 3. Up-to-date documentation and references
 * 4. Automatic source citations
 */

console.log(`${c.label("Web Search Benefits:")}\n`);
console.log(`  ${c.success("1.")} ${c.highlight("Real-time data")} - Beyond knowledge cutoff`);
console.log(`  ${c.success("2.")} ${c.highlight("Current events")} - News, weather, sports`);
console.log(`  ${c.success("3.")} ${c.highlight("Live references")} - Current docs, APIs, specs`);
console.log(`  ${c.success("4.")} ${c.highlight("Auto-citations")} - Sources automatically cited`);

console.log(`\n${c.label("How It Works:")}`);
console.log(`${c.dim(`
1. You include web_search tool in your request
2. Claude decides when to search based on the prompt
3. API executes search and returns results
4. Claude provides response with cited sources
`)}`);

// ==================================================
// PART 2: Basic Web Search
// ==================================================

console.log("");
print_section("Part 2: Basic Web Search");

/**
 * ENABLING WEB SEARCH:
 *
 * Add the web_search tool to your tools array.
 * Type must be "web_search_20250305"
 * Name must be "web_search"
 */

console.log(`${c.label("Tool Definition:")}`);
console.log(`${c.dim(`
{
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5  // Optional: limit searches per request
}
`)}`);

// Demo web search (note: may require org admin to enable)
const search_prompt = "What is the current version of TypeScript?";

console.log(`${c.highlight("Prompt:")} "${search_prompt}"\n`);

try {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: search_prompt }],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 3,
      },
    ],
  });

  console.log(`${c.label("Response Content Blocks:")}\n`);

  for (let i = 0; i < response.content.length; i++) {
    const block = response.content[i];
    console.log(`${c.highlight(`Block ${i + 1}:`)} ${c.dim(`type="${block.type}"`)}`);

    if (block.type === "text") {
      console.log(`  ${c.value(block.text.slice(0, 150))}${block.text.length > 150 ? "..." : ""}`);

      // Check for citations
      if ("citations" in block && Array.isArray(block.citations) && block.citations.length > 0) {
        console.log(`\n  ${c.success("📖 Citations found:")}`);
        for (const citation of block.citations.slice(0, 2)) {
          if (citation.type === "web_search_result_location") {
            console.log(`    ${c.dim("• URL:")} ${citation.url}`);
            console.log(`    ${c.dim("  Title:")} ${citation.title}`);
          }
        }
        if (block.citations.length > 2) {
          console.log(`    ${c.dim(`  ... and ${block.citations.length - 2} more`)}`);
        }
      }
    } else if (block.type === "server_tool_use") {
      console.log(`  ${c.dim("name:")} ${block.name}`);
      console.log(`  ${c.dim("query:")} "${(block.input as { query: string }).query}"`);
    } else if (block.type === "web_search_tool_result") {
      const results = block.content as Array<{ type: string; url?: string; title?: string }>;
      console.log(`  ${c.dim("Results:")} ${results.length} search results`);
      for (const result of results.slice(0, 2)) {
        if (result.type === "web_search_result") {
          console.log(`    ${c.dim("•")} ${result.title}`);
          console.log(`      ${c.dim(result.url || "")}`);
        }
      }
    }
    console.log("");
  }

  // Show usage
  if (response.usage) {
    print_kv("Input tokens", response.usage.input_tokens);
    print_kv("Output tokens", response.usage.output_tokens);
    if ("server_tool_use" in response.usage) {
      const serverToolUse = response.usage.server_tool_use as { web_search_requests?: number };
      print_kv("Web searches", serverToolUse.web_search_requests || 0);
    }
  }
} catch (error: unknown) {
  const err = error as { message?: string; status?: number };
  if (err.message?.includes("web_search") || err.message?.includes("not enabled")) {
    console.log(`${c.warning("Note:")} Web search may not be enabled for your organization.`);
    console.log(`${c.dim("Organization admins can enable it in Console settings.")}`);
  } else {
    console.log(`${c.error("Error:")} ${err.message}`);
  }
}

// ==================================================
// PART 3: Response Structure Explained
// ==================================================

console.log("\n");
print_section("Part 3: Response Structure Explained");

console.log(`${c.label("Web Search Response Flow:")}`);
console.log(`${c.dim(`
┌──────────────────────────────────────────────────────────┐
│ 1. Text Block: Claude's reasoning                        │
│    "I'll search for the current TypeScript version."    │
├──────────────────────────────────────────────────────────┤
│ 2. Server Tool Use: The search query                     │
│    name: "web_search"                                    │
│    input: { query: "typescript current version 2025" }   │
├──────────────────────────────────────────────────────────┤
│ 3. Web Search Tool Result: Search results                │
│    content: [                                            │
│      { url: "...", title: "...", encrypted_content }     │
│    ]                                                     │
├──────────────────────────────────────────────────────────┤
│ 4. Text Block with Citations: Final answer               │
│    "The current version is 5.x..."                       │
│    citations: [{ url, title, cited_text, ... }]          │
└──────────────────────────────────────────────────────────┘
`)}`);

console.log(`\n${c.label("Content Block Types:")}\n`);

const block_types = [
  {
    type: "text",
    desc: "Claude's reasoning or final answer",
    may_have: "citations array (when answering)",
  },
  {
    type: "server_tool_use",
    desc: "Search query being executed",
    may_have: "input.query (the search string)",
  },
  {
    type: "web_search_tool_result",
    desc: "Results from the search",
    may_have: "content[] with url, title, encrypted_content",
  },
];

for (const bt of block_types) {
  console.log(`  ${c.highlight(bt.type)}`);
  console.log(`    ${c.dim("Description:")} ${bt.desc}`);
  console.log(`    ${c.dim("Contains:")} ${bt.may_have}\n`);
}

// ==================================================
// PART 4: Tool Configuration Options
// ==================================================

console.log("");
print_section("Part 4: Tool Configuration Options");

console.log(`${c.label("Web Search Tool Parameters:")}\n`);

const params = [
  {
    param: "type",
    required: "Yes",
    desc: 'Must be "web_search_20250305"',
  },
  {
    param: "name",
    required: "Yes",
    desc: 'Must be "web_search"',
  },
  {
    param: "max_uses",
    required: "No",
    desc: "Limit searches per request (default: unlimited)",
  },
  {
    param: "allowed_domains",
    required: "No",
    desc: "Only search these domains (array)",
  },
  {
    param: "blocked_domains",
    required: "No",
    desc: "Never search these domains (array)",
  },
  {
    param: "user_location",
    required: "No",
    desc: "Localize results by location",
  },
];

console.log(`  ${c.dim("Parameter".padEnd(18))} ${c.dim("Required".padEnd(10))} ${c.dim("Description")}`);
console.log(`  ${c.dim("-".repeat(60))}`);
for (const p of params) {
  console.log(
    `  ${c.value(p.param.padEnd(18))} ${p.required.padEnd(10)} ${c.dim(p.desc)}`
  );
}

// ==================================================
// PART 5: Domain Filtering
// ==================================================

console.log("\n");
print_section("Part 5: Domain Filtering");

/**
 * DOMAIN FILTERING:
 *
 * Restrict searches to specific domains or block certain sites.
 * Cannot use both allowed_domains and blocked_domains together.
 */

console.log(`${c.label("Domain Filtering Examples:")}`);
console.log(`${c.dim(`
// Only search official documentation sites
{
  type: "web_search_20250305",
  name: "web_search",
  allowed_domains: [
    "docs.python.org",
    "developer.mozilla.org",
    "typescriptlang.org"
  ]
}

// Block specific sites
{
  type: "web_search_20250305",
  name: "web_search",
  blocked_domains: [
    "reddit.com",
    "stackoverflow.com"  // Only official docs
  ]
}
`)}`);

console.log(`\n${c.warning("Domain Filtering Rules:")}`);
console.log(`${c.dim("• Don't include http:// or https://")}`);
console.log(`${c.dim("• Subdomains are automatically included")}`);
console.log(`${c.dim("• Subpaths supported: example.com/blog")}`);
console.log(`${c.dim("• Cannot use allowed_domains AND blocked_domains together")}`);

// ==================================================
// PART 6: User Location
// ==================================================

console.log("\n");
print_section("Part 6: User Location");

/**
 * USER LOCATION:
 *
 * Localize search results based on user's approximate location.
 */

console.log(`${c.label("User Location Configuration:")}`);
console.log(`${c.dim(`
{
  type: "web_search_20250305",
  name: "web_search",
  user_location: {
    type: "approximate",
    city: "San Francisco",
    region: "California",
    country: "US",
    timezone: "America/Los_Angeles"
  }
}
`)}`);

console.log(`${c.highlight("When to Use:")}`);
console.log(`${c.dim("• Local news or events")}`);
console.log(`${c.dim("• Location-specific queries (weather, businesses)")}`);
console.log(`${c.dim("• Region-appropriate search results")}`);

// ==================================================
// PART 7: Citation Structure
// ==================================================

console.log("\n");
print_section("Part 7: Citation Structure");

/**
 * WEB SEARCH CITATIONS:
 *
 * Citations are automatically included and REQUIRED
 * when displaying results to users.
 */

console.log(`${c.label("Citation Fields:")}`);
console.log(`${c.dim(`
{
  type: "web_search_result_location",
  url: "https://example.com/article",
  title: "Article Title",
  cited_text: "The exact text being cited...",
  encrypted_index: "..."  // For multi-turn conversations
}
`)}`);

console.log(`\n${c.success("✓")} ${c.highlight("Free Fields")} (don't count toward tokens):`);
console.log(`${c.dim("  • cited_text")}`);
console.log(`${c.dim("  • title")}`);
console.log(`${c.dim("  • url")}`);

console.log(`\n${c.warning("Important:")} Citations are REQUIRED when showing results to users.`);

// ==================================================
// PART 8: Extracting Citations
// ==================================================

console.log("\n");
print_section("Part 8: Extracting Citations");

interface WebCitation {
  url: string;
  title: string;
  cited_text: string;
}

function extract_web_citations(response: Anthropic.Message): WebCitation[] {
  const citations: WebCitation[] = [];

  for (const block of response.content) {
    if (block.type === "text" && "citations" in block && Array.isArray(block.citations)) {
      for (const citation of block.citations) {
        if (citation.type === "web_search_result_location") {
          citations.push({
            url: citation.url,
            title: citation.title,
            cited_text: citation.cited_text,
          });
        }
      }
    }
  }

  return citations;
}

console.log(`${c.label("Citation Extraction Helper:")}`);
console.log(`${c.dim(`
function extract_web_citations(response: Message): WebCitation[] {
  const citations: WebCitation[] = [];

  for (const block of response.content) {
    if (block.type === "text" && "citations" in block) {
      for (const citation of block.citations) {
        if (citation.type === "web_search_result_location") {
          citations.push({
            url: citation.url,
            title: citation.title,
            cited_text: citation.cited_text
          });
        }
      }
    }
  }

  return citations;
}
`)}`);

// ==================================================
// PART 9: Pricing and Rate Limits
// ==================================================

console.log("\n");
print_section("Part 9: Pricing and Rate Limits");

console.log(`${c.label("Pricing:")}\n`);
console.log(`  ${c.highlight("$10")} per 1,000 web searches`);
console.log(`  ${c.dim("+ Standard token costs for content")}`);
console.log(`  ${c.dim("• Citation fields are FREE (url, title, cited_text)")}`);
console.log(`  ${c.dim("• Errors during search are NOT billed")}`);

console.log(`\n${c.label("Rate Limits:")}\n`);
console.log(`  ${c.warning("too_many_requests")} - Hit rate limit, retry later`);
console.log(`  ${c.warning("max_uses_exceeded")} - Exceeded max_uses parameter`);

console.log(`\n${c.label("Usage Tracking:")}`);
console.log(`${c.dim(`
// Check how many searches were performed
const searches = response.usage.server_tool_use?.web_search_requests;
console.log("Searches performed:", searches);
`)}`);

// ==================================================
// PART 10: Error Handling
// ==================================================

console.log("\n");
print_section("Part 10: Error Handling");

const errors = [
  {
    error: "query_too_long",
    cause: "Search query exceeds maximum length",
    action: "Shorten the query",
  },
  {
    error: "invalid_input",
    cause: "Invalid search query format",
    action: "Check query content",
  },
  {
    error: "unavailable",
    cause: "Internal search error",
    action: "Retry the request",
  },
  {
    error: "too_many_requests",
    cause: "Rate limit exceeded",
    action: "Wait and retry",
  },
  {
    error: "max_uses_exceeded",
    cause: "Exceeded max_uses limit",
    action: "Increase limit or restructure",
  },
];

console.log(`${c.label("Possible Errors:")}\n`);
for (const e of errors) {
  console.log(`  ${c.error(e.error)}`);
  console.log(`    ${c.dim("Cause:")} ${e.cause}`);
  console.log(`    ${c.dim("Action:")} ${e.action}\n`);
}

// ==================================================
// PART 11: Best Practices
// ==================================================

console.log("");
print_section("Part 11: Best Practices");

const practices = [
  {
    practice: "Set max_uses",
    reason: "Control costs and prevent runaway searches",
  },
  {
    practice: "Use domain filtering",
    reason: "Ensure results come from trusted sources",
  },
  {
    practice: "Always show citations",
    reason: "Required for compliance and trust",
  },
  {
    practice: "Handle errors gracefully",
    reason: "Search may be unavailable temporarily",
  },
  {
    practice: "Track usage",
    reason: "Monitor costs via server_tool_use metrics",
  },
];

console.log(`${c.label("Best Practices:")}\n`);
for (const bp of practices) {
  console.log(`  ${c.success("✓")} ${c.highlight(bp.practice)}`);
  console.log(`    ${c.dim(bp.reason)}\n`);
}

print_footer("END OF LESSON");

/**
 * WEB SEARCH TOOL SUMMARY:
 *
 * WHAT IT DOES:
 * - Gives Claude access to real-time web content
 * - Claude decides when to search based on prompt
 * - Automatically includes source citations
 *
 * TOOL DEFINITION:
 * {
 *   type: "web_search_20250305",
 *   name: "web_search",
 *   max_uses: 5,               // Optional
 *   allowed_domains: [...],    // Optional
 *   blocked_domains: [...],    // Optional
 *   user_location: {...}       // Optional
 * }
 *
 * RESPONSE STRUCTURE:
 * 1. text            → Claude's reasoning
 * 2. server_tool_use → Search query
 * 3. web_search_tool_result → Search results
 * 4. text + citations → Final answer with sources
 *
 * CITATION FORMAT:
 * {
 *   type: "web_search_result_location",
 *   url: "...",
 *   title: "...",
 *   cited_text: "..."  // FREE - doesn't count as tokens
 * }
 *
 * PRICING:
 * - $10 per 1,000 searches
 * - Citation fields are FREE
 * - Errors are not billed
 *
 * SUPPORTED MODELS:
 * - Sonnet 4.5, Sonnet 4, Haiku 4.5
 * - Opus 4.5, Opus 4.1, Opus 4
 *
 * KEY TAKEAWAYS:
 * 1. Enable with type: "web_search_20250305"
 * 2. Set max_uses to control costs
 * 3. Use domain filtering for trusted sources
 * 4. Always display citations to users
 * 5. Citation text is free (not counted as tokens)
 *
 * CONGRATULATIONS! You've completed all 33 lessons of the
 * Claude API curriculum. You now have comprehensive
 * knowledge of:
 *
 * - Basic queries and message handling
 * - Tools (built-in, custom, MCP)
 * - Sessions and multi-turn conversations
 * - Streaming and observation
 * - Subagents and hooks
 * - Error handling and production patterns
 * - Vision, files, embeddings
 * - Advanced features (caching, batching, thinking)
 * - Model configuration and prefilling
 * - Citations and web search
 *
 * Keep building with Claude!
 */
