/**
 * ANSI Color Helpers for Lesson Output
 * =====================================
 *
 * Provides consistent, colorful console output across all lessons.
 * Import this in any lesson file to make the output more readable.
 *
 * USAGE:
 *   import { c, print_header, print_section, print_divider } from "./util/colors";
 *
 *   print_header("LESSON 01: Getting Started");
 *   print_section("📋 SESSION INFO");
 *   console.log(`${c.label("Model:")} ${c.value("claude-sonnet-4")}`);
 */

// ANSI escape codes for terminal colors
const ansi = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",

  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Bright foreground colors
  bright_red: "\x1b[91m",
  bright_green: "\x1b[92m",
  bright_yellow: "\x1b[93m",
  bright_blue: "\x1b[94m",
  bright_magenta: "\x1b[95m",
  bright_cyan: "\x1b[96m",

  // Background colors
  bg_black: "\x1b[40m",
  bg_red: "\x1b[41m",
  bg_green: "\x1b[42m",
  bg_yellow: "\x1b[43m",
  bg_blue: "\x1b[44m",
  bg_magenta: "\x1b[45m",
  bg_cyan: "\x1b[46m",
  bg_white: "\x1b[47m",
};

/**
 * Semantic color functions for consistent styling.
 *
 * COLOR SCHEME:
 * - title:     Bright cyan    - Main headers, lesson titles
 * - section:   Bright yellow  - Section headers (📋, 💬, ✅)
 * - label:     Bright white   - Labels for key-value pairs
 * - value:     Green          - Values, data, content
 * - dim:       Gray           - Separators, IDs, secondary info
 * - success:   Bright green   - Success states, completion
 * - error:     Bright red     - Errors, failures
 * - warning:   Yellow         - Warnings, cautions
 * - info:      Blue           - Informational, types
 * - highlight: Bright magenta - Emphasized items, tool names
 */
export const c = {
  // Semantic styles
  title: (s: string) => `${ansi.bright}${ansi.cyan}${s}${ansi.reset}`,
  section: (s: string) => `${ansi.bright}${ansi.yellow}${s}${ansi.reset}`,
  label: (s: string) => `${ansi.bright}${ansi.white}${s}${ansi.reset}`,
  value: (s: string) => `${ansi.green}${s}${ansi.reset}`,
  dim: (s: string) => `${ansi.dim}${s}${ansi.reset}`,
  success: (s: string) => `${ansi.bright}${ansi.green}${s}${ansi.reset}`,
  error: (s: string) => `${ansi.bright}${ansi.red}${s}${ansi.reset}`,
  warning: (s: string) => `${ansi.yellow}${s}${ansi.reset}`,
  info: (s: string) => `${ansi.blue}${s}${ansi.reset}`,
  highlight: (s: string) => `${ansi.bright}${ansi.magenta}${s}${ansi.reset}`,

  // Direct color access (for custom combinations)
  red: (s: string) => `${ansi.red}${s}${ansi.reset}`,
  green: (s: string) => `${ansi.green}${s}${ansi.reset}`,
  yellow: (s: string) => `${ansi.yellow}${s}${ansi.reset}`,
  blue: (s: string) => `${ansi.blue}${s}${ansi.reset}`,
  magenta: (s: string) => `${ansi.magenta}${s}${ansi.reset}`,
  cyan: (s: string) => `${ansi.cyan}${s}${ansi.reset}`,
  gray: (s: string) => `${ansi.gray}${s}${ansi.reset}`,

  // Formatting
  bold: (s: string) => `${ansi.bright}${s}${ansi.reset}`,
  italic: (s: string) => `${ansi.italic}${s}${ansi.reset}`,
  underline: (s: string) => `${ansi.underline}${s}${ansi.reset}`,
};

/**
 * Print a main header (lesson title).
 * Uses double-line box drawing characters.
 *
 * Example output:
 * ════════════════════════════════════════════════════════════
 *   LESSON 01: Getting Started
 * ════════════════════════════════════════════════════════════
 */
export function print_header(title: string, width = 60): void {
  console.log("");
  console.log(c.title("═".repeat(width)));
  console.log(c.title(`  ${title}`));
  console.log(c.title("═".repeat(width)));
  console.log("");
}

/**
 * Print a section header with emoji.
 *
 * Example output:
 * 📋 SESSION INFO:
 */
export function print_section(title: string): void {
  console.log(c.section(title));
}

/**
 * Print a thin divider line.
 *
 * Example output:
 * ────────────────────────────────────────────────────────────
 */
export function print_divider(width = 60): void {
  console.log(c.dim("─".repeat(width)));
}

/**
 * Print a message type header (for streaming messages).
 *
 * Example output:
 * ────────────────────────────────────────────────────────────
 * MESSAGE TYPE: assistant
 * SUBTYPE: tool_use
 * ────────────────────────────────────────────────────────────
 */
export function print_message_header(type: string, subtype?: string): void {
  print_divider();
  console.log(`${c.label("MESSAGE TYPE:")} ${c.highlight(type)}`);
  if (subtype) {
    console.log(`${c.label("SUBTYPE:")} ${c.info(subtype)}`);
  }
  print_divider();
  console.log("");
}

/**
 * Print a key-value pair with consistent formatting.
 *
 * Example output:
 *   → Model: claude-sonnet-4
 */
export function print_kv(key: string, value: string | number, indent = 2): void {
  const spaces = " ".repeat(indent);
  console.log(`${spaces}${c.label(`→ ${key}:`)} ${c.value(String(value))}`);
}

/**
 * Print a success message.
 *
 * Example output:
 * ✅ Operation completed successfully
 */
export function print_success(message: string): void {
  console.log(`${c.success("✅")} ${c.success(message)}`);
}

/**
 * Print an error message.
 *
 * Example output:
 * ❌ Something went wrong
 */
export function print_error(message: string): void {
  console.log(`${c.error("❌")} ${c.error(message)}`);
}

/**
 * Print a warning message.
 *
 * Example output:
 * ⚠️  Caution advised
 */
export function print_warning(message: string): void {
  console.log(`${c.warning("⚠️ ")} ${c.warning(message)}`);
}

/**
 * Print an info message.
 *
 * Example output:
 * ℹ️  For your information
 */
export function print_info(message: string): void {
  console.log(`${c.info("ℹ️ ")} ${c.info(message)}`);
}

/**
 * Print the end of stream footer.
 *
 * Example output:
 * ════════════════════════════════════════════════════════════
 *   END OF STREAM
 * ════════════════════════════════════════════════════════════
 */
export function print_footer(text = "END OF STREAM", width = 60): void {
  console.log("");
  console.log(c.title("═".repeat(width)));
  console.log(c.title(`  ${text}`));
  console.log(c.title("═".repeat(width)));
}

/**
 * Format a cost value as USD.
 */
export function format_cost(cost: number | undefined): string {
  return "$" + (cost?.toFixed(4) ?? "0.0000");
}

/**
 * Format a duration in milliseconds.
 */
export function format_duration(ms: number | undefined): string {
  if (!ms) return "0ms";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Log JSON in dimmed style (for raw message output).
 */
export function log_json(label: string, obj: unknown, max_len?: number): void {
  console.log(c.dim(`${label}:`));
  const json = JSON.stringify(obj, null, 2);
  console.log(c.dim(max_len ? json.substring(0, max_len) + "..." : json));
  console.log("");
}

/**
 * Log Claude's response text with proper styling.
 */
export function log_response(label: string, content: string | { type: string; text?: string }[]): void {
  console.log(c.section(label));
  if (typeof content === "string") {
    console.log(c.value(content));
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === "text" && block.text) {
        console.log(c.value(block.text));
      }
    }
  }
}

/**
 * Log a tool request with parsed info.
 */
export function log_tool_request(tool_name: string, input: Record<string, unknown>): void {
  print_kv("Tool requested", tool_name);
  for (const [key, val] of Object.entries(input)) {
    console.log(`    ${c.dim(key + ":")} ${c.dim(String(val))}`);
  }
}

/**
 * Print completion stats from a result message.
 */
export function print_result(res: { subtype?: string; total_cost_usd?: number; num_turns?: number; duration_ms?: number }): void {
  console.log("");
  print_success("Complete");
  if (res.total_cost_usd !== undefined) print_kv("Cost", format_cost(res.total_cost_usd));
  if (res.num_turns !== undefined) print_kv("Turns", res.num_turns);
  if (res.duration_ms !== undefined) print_kv("Duration", format_duration(res.duration_ms));
}

// Export raw ANSI codes for advanced use cases
export { ansi };
