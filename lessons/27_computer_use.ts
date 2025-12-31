/**
 * LESSON 27: Computer Use Tool
 * ============================
 *
 * WHAT YOU'LL LEARN:
 * - What the computer use tool is and its capabilities
 * - How to configure and enable computer use (beta)
 * - Available actions: screenshot, click, type, key, scroll
 * - The agent loop pattern for computer use
 * - Safety considerations and best practices
 *
 * PREREQUISITE: Lesson 06 (custom tools), Lesson 02 (messages)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Computer Use Tool                                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Computer use enables Claude to interact with desktop environments by:  │
 * │                                                                         │
 * │ - Capturing screenshots to see what's displayed                        │
 * │ - Controlling mouse clicks, movement, and dragging                     │
 * │ - Typing text and pressing keyboard shortcuts                          │
 * │ - Scrolling and navigating interfaces                                  │
 * │                                                                         │
 * │ BETA STATUS: Requires beta header and special tool configuration.      │
 * │ Use in sandboxed/virtual environments for security.                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Beta Headers                                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Computer use requires a beta header in API requests:                   │
 * │                                                                         │
 * │ - Claude Opus 4.5: "computer-use-2025-11-24"                           │
 * │                    Tool version: computer_20251124                      │
 * │                                                                         │
 * │ - All other models: "computer-use-2025-01-24"                          │
 * │                     Tool version: computer_20250124                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠️ SECURITY WARNING:
 * Computer use should ONLY be run in:
 * - Virtual machines with minimal privileges
 * - Docker containers with limited access
 * - Sandboxed environments isolated from sensitive data
 *
 * NEVER give computer use access to:
 * - Login credentials or authentication sessions
 * - Financial accounts or payment systems
 * - Production systems or sensitive data
 *
 * NOTE: This lesson demonstrates the API patterns but does NOT actually
 * execute computer actions. For a complete working implementation,
 * see: https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo
 */

import Anthropic from "@anthropic-ai/sdk";
import { print_header, print_section, print_footer, print_kv, log_json, c } from "./util/colors";

print_header("LESSON 27: Computer Use Tool");

const anthropic = new Anthropic();

// ==================================================
// PART 1: Computer Use Tool Configuration
// ==================================================

print_section("Part 1: Computer Use Tool Configuration");

/**
 * COMPUTER USE TOOL DEFINITION:
 *
 * Unlike regular tools with input_schema, the computer tool
 * uses a special configuration format:
 *
 * {
 *   type: "computer_20250124",  // Tool version
 *   name: "computer",           // Must be "computer"
 *   display_width_px: 1024,     // Screen width
 *   display_height_px: 768,     // Screen height
 *   display_number: 1,          // X11 display (optional)
 * }
 */

// Define the computer use tool configuration
const computer_tool = {
  type: "computer_20250124" as const,
  name: "computer" as const,
  display_width_px: 1024,
  display_height_px: 768,
  display_number: 1,
};

console.log(`${c.label("Computer Tool Configuration:")}`);
log_json("TOOL CONFIG", computer_tool, 200);

console.log(`\n${c.highlight("Tool parameters:")}`);
print_kv("type", "computer_20250124 (or computer_20251124 for Opus 4.5)");
print_kv("name", "computer (required)");
print_kv("display_width_px", "Screen width in pixels");
print_kv("display_height_px", "Screen height in pixels");
print_kv("display_number", "X11 display number (optional)");

// ==================================================
// PART 2: Available Actions
// ==================================================

console.log("");
print_section("Part 2: Available Actions");

/**
 * COMPUTER USE ACTIONS:
 *
 * When Claude wants to interact with the computer, it returns
 * a tool_use block with an "action" field specifying what to do.
 *
 * Basic actions (all versions):
 * - screenshot: Capture current screen
 * - left_click: Click at coordinates
 * - type: Type text
 * - key: Press key combination
 * - mouse_move: Move cursor
 *
 * Enhanced actions (computer_20250124+):
 * - scroll: Scroll in direction
 * - left_click_drag: Drag between coordinates
 * - right_click, middle_click: Other mouse buttons
 * - double_click, triple_click: Multiple clicks
 * - wait: Pause between actions
 */

const action_examples = {
  screenshot: {
    action: "screenshot",
  },
  click: {
    action: "left_click",
    coordinate: [500, 300],
  },
  type: {
    action: "type",
    text: "Hello, world!",
  },
  key: {
    action: "key",
    key: "ctrl+s",
  },
  scroll: {
    action: "scroll",
    coordinate: [500, 300],
    direction: "down",
    amount: 3,
  },
  drag: {
    action: "left_click_drag",
    start_coordinate: [100, 100],
    end_coordinate: [300, 300],
  },
};

console.log(`${c.label("Action Examples:")}\n`);
for (const [name, example] of Object.entries(action_examples)) {
  console.log(`  ${c.highlight(name.padEnd(12))} ${c.dim(JSON.stringify(example))}`);
}

// ==================================================
// PART 3: Making a Computer Use Request
// ==================================================

console.log("");
print_section("Part 3: Making a Computer Use Request (Demo)");

/**
 * COMPUTER USE API CALL:
 *
 * Computer use requires:
 * 1. Beta header: betas=["computer-use-2025-01-24"]
 * 2. Special tool format in tools array
 * 3. Agent loop to handle tool_use/tool_result
 *
 * NOTE: This demo shows the API structure but doesn't
 * actually connect to a real desktop environment.
 */

console.log(`${c.highlight("API Request Structure:")}`);
console.log(`${c.dim(`
anthropic.beta.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  betas: ["computer-use-2025-01-24"],
  tools: [{
    type: "computer_20250124",
    name: "computer",
    display_width_px: 1024,
    display_height_px: 768,
  }],
  messages: [{
    role: "user",
    content: "Take a screenshot of the desktop"
  }]
})
`)}`);

// Simulate what Claude's response would look like
const simulated_response = {
  id: "msg_example",
  type: "message",
  role: "assistant",
  content: [
    {
      type: "tool_use",
      id: "toolu_01ABC123",
      name: "computer",
      input: {
        action: "screenshot",
      },
    },
  ],
  stop_reason: "tool_use",
};

console.log(`${c.label("Claude's Response (Simulated):")}`);
log_json("TOOL_USE RESPONSE", simulated_response, 300);

// ==================================================
// PART 4: The Agent Loop Pattern
// ==================================================

console.log("");
print_section("Part 4: The Agent Loop Pattern");

/**
 * COMPUTER USE AGENT LOOP:
 *
 * Computer use typically requires multiple turns:
 * 1. Claude requests an action (e.g., screenshot)
 * 2. You execute the action and return the result
 * 3. Claude analyzes the result and requests next action
 * 4. Repeat until task is complete
 *
 * This is called the "agent loop" or "agentic loop".
 */

console.log(`${c.highlight("Agent Loop Flow:")}`);
console.log(`${c.dim(`
┌────────────────────────────────────────────────────┐
│  1. User sends task: "Click the Start button"     │
└────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────┐
│  2. Claude requests: { action: "screenshot" }     │
│     (needs to see current screen first)           │
└────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────┐
│  3. You capture screenshot, return as tool_result │
│     { type: "image", source: { type: "base64"...}}│
└────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────┐
│  4. Claude analyzes, requests click:              │
│     { action: "left_click", coordinate: [50, 750]}│
└────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────┐
│  5. You execute click, return success result      │
└────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────┐
│  6. Claude may request another screenshot to      │
│     verify the action succeeded                   │
└────────────────────────────────────────────────────┘
`)}`);

// Pseudocode for agent loop
console.log(`\n${c.label("Agent Loop Pseudocode:")}`);
console.log(`${c.dim(`
async function computer_use_loop(task: string) {
  const messages = [{ role: "user", content: task }];

  while (true) {
    // Call Claude with computer tool
    const response = await anthropic.beta.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      betas: ["computer-use-2025-01-24"],
      tools: [computer_tool],
      messages
    });

    // Add Claude's response to history
    messages.push({ role: "assistant", content: response.content });

    // If no tool use, Claude is done
    if (response.stop_reason !== "tool_use") {
      return response;
    }

    // Execute each tool call
    const results = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await execute_computer_action(block.input);
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result
        });
      }
    }

    // Return results to Claude
    messages.push({ role: "user", content: results });
  }
}
`)}`);

// ==================================================
// PART 5: Handling Tool Results
// ==================================================

console.log("");
print_section("Part 5: Handling Tool Results");

/**
 * TOOL RESULT FORMATS:
 *
 * Different actions return different result types:
 *
 * - screenshot: Return image as base64
 * - click/type/key: Return success message or error
 * - Errors: Set is_error: true with error message
 */

console.log(`${c.label("Screenshot Result Format:")}`);
console.log(`${c.dim(`
{
  type: "tool_result",
  tool_use_id: "toolu_01ABC123",
  content: [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: "iVBORw0KGgo..."  // base64-encoded screenshot
      }
    }
  ]
}
`)}`);

console.log(`\n${c.label("Action Success Result:")}`);
console.log(`${c.dim(`
{
  type: "tool_result",
  tool_use_id: "toolu_01ABC123",
  content: "Successfully clicked at (500, 300)"
}
`)}`);

console.log(`\n${c.label("Error Result Format:")}`);
console.log(`${c.dim(`
{
  type: "tool_result",
  tool_use_id: "toolu_01ABC123",
  content: "Error: Failed to capture screenshot. Display may be locked.",
  is_error: true
}
`)}`);

// ==================================================
// PART 6: Coordinate Scaling
// ==================================================

console.log("");
print_section("Part 6: Coordinate Scaling");

/**
 * COORDINATE SCALING:
 *
 * Claude's vision model downsamples large screenshots.
 * When Claude returns coordinates, you must scale them
 * back up to the actual screen resolution.
 *
 * Scaling rules:
 * - Max long edge: 1568 pixels
 * - Max total pixels: 1,150,000
 * - Use the more restrictive scale factor
 */

function calculate_scale_factor(width: number, height: number): number {
  const long_edge = Math.max(width, height);
  const total_pixels = width * height;

  const long_edge_scale = 1568 / long_edge;
  const total_pixels_scale = Math.sqrt(1_150_000 / total_pixels);

  return Math.min(1.0, long_edge_scale, total_pixels_scale);
}

console.log(`${c.label("Scale Factor Examples:")}\n`);

const screen_sizes = [
  { width: 1024, height: 768, name: "Standard" },
  { width: 1920, height: 1080, name: "Full HD" },
  { width: 2560, height: 1440, name: "2K" },
  { width: 3840, height: 2160, name: "4K" },
];

for (const screen of screen_sizes) {
  const scale = calculate_scale_factor(screen.width, screen.height);
  console.log(`  ${c.value(screen.name.padEnd(10))} ${screen.width}×${screen.height} → scale factor: ${c.highlight(scale.toFixed(3))}`);
}

console.log(`\n${c.dim("When Claude returns coordinate [500, 300] and scale is 0.5:")}`);
console.log(`${c.dim("Actual click position = [1000, 600]")}`);

// ==================================================
// PART 7: Safety Considerations
// ==================================================

console.log("");
print_section("Part 7: Safety Considerations");

/**
 * SECURITY BEST PRACTICES:
 *
 * Computer use is powerful but risky. Follow these guidelines:
 */

const safety_rules = [
  {
    rule: "Use virtual environments",
    desc: "Run in Docker containers or VMs with minimal privileges",
  },
  {
    rule: "Protect sensitive data",
    desc: "Never give access to login credentials or auth sessions",
  },
  {
    rule: "Limit network access",
    desc: "Use domain allowlists to restrict malicious content exposure",
  },
  {
    rule: "Require human confirmation",
    desc: "For financial transactions, agreements, or destructive actions",
  },
  {
    rule: "Monitor for prompt injection",
    desc: "Screen content may contain adversarial instructions",
  },
  {
    rule: "Set action limits",
    desc: "Cap the number of actions before requiring human review",
  },
];

console.log(`${c.label("Security Best Practices:")}\n`);
for (const { rule, desc } of safety_rules) {
  console.log(`  ${c.warning("⚠️")} ${c.highlight(rule)}`);
  console.log(`     ${c.dim(desc)}\n`);
}

// ==================================================
// PART 8: Known Limitations
// ==================================================

console.log("");
print_section("Part 8: Known Limitations");

const limitations = [
  "Latency: May be too slow for time-critical tasks",
  "Accuracy: May make mistakes with coordinate placement",
  "Complex tasks: May select wrong tools or take unexpected paths",
  "Scrolling: Works better in newer versions but still has limits",
  "Spreadsheets: Mouse clicks work better than drag selection",
  "Social media: Limited ability to create accounts or post content",
  "Prompt injection: Susceptible to adversarial content in screenshots",
];

console.log(`${c.label("Known Limitations:")}\n`);
for (const limit of limitations) {
  console.log(`  ${c.dim("•")} ${limit}`);
}

// ==================================================
// PART 9: Reference Implementation
// ==================================================

console.log("");
print_section("Part 9: Reference Implementation");

console.log(`${c.highlight("Official Reference Implementation:")}`);
console.log(`${c.value("https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo")}\n`);

console.log(`${c.label("What the reference includes:")}`);
console.log(`${c.dim("• Docker-based sandboxed environment")}`);
console.log(`${c.dim("• Complete agent loop implementation")}`);
console.log(`${c.dim("• Web interface for testing")}`);
console.log(`${c.dim("• Screenshot capture and coordinate scaling")}`);
console.log(`${c.dim("• All computer use actions implemented")}`);

print_footer("END OF LESSON");

/**
 * COMPUTER USE TOOL SUMMARY:
 *
 * TOOL CONFIGURATION:
 * {
 *   type: "computer_20250124",  // or computer_20251124 for Opus 4.5
 *   name: "computer",
 *   display_width_px: 1024,
 *   display_height_px: 768,
 *   display_number: 1  // optional, for X11
 * }
 *
 * BETA HEADERS:
 * - Opus 4.5: "computer-use-2025-11-24"
 * - Others: "computer-use-2025-01-24"
 *
 * AVAILABLE ACTIONS:
 * - screenshot: Capture current screen
 * - left_click, right_click, middle_click: Mouse clicks
 * - double_click, triple_click: Multiple clicks
 * - left_click_drag: Drag between coordinates
 * - type: Type text
 * - key: Press key combinations
 * - scroll: Scroll in direction
 * - mouse_move: Move cursor
 * - wait: Pause between actions
 *
 * AGENT LOOP PATTERN:
 * 1. Send task to Claude with computer tool
 * 2. Claude returns tool_use with action
 * 3. Execute action, capture result
 * 4. Return tool_result to Claude
 * 5. Repeat until stop_reason !== "tool_use"
 *
 * SECURITY:
 * - ALWAYS run in sandboxed environments
 * - NEVER expose sensitive credentials
 * - Require human confirmation for critical actions
 * - Monitor for prompt injection attacks
 *
 * KEY TAKEAWAYS:
 * 1. Computer use enables Claude to control desktop environments
 * 2. Requires beta headers and special tool configuration
 * 3. Works through an agent loop of action/result cycles
 * 4. Must scale coordinates for high-resolution displays
 * 5. Security is critical - always use sandboxed environments
 * 6. Use the reference implementation as a starting point
 *
 * NEXT: Lesson 28 covers Embeddings for semantic search
 */
