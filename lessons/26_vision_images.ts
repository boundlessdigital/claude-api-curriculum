/**
 * LESSON 26: Vision & Image Processing
 * =====================================
 *
 * WHAT YOU'LL LEARN:
 * - Sending images to Claude for analysis
 * - Three methods: base64, URL, and Files API
 * - Multi-image comparison and analysis
 * - Image token calculation and optimization
 * - Multi-modal conversation patterns
 *
 * PREREQUISITE: Lesson 01 (query basics), Lesson 02 (messages)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Image Content Blocks                                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Images are sent as content blocks alongside text blocks.               │
 * │                                                                         │
 * │ Structure:                                                              │
 * │ {                                                                       │
 * │   type: "image",                                                        │
 * │   source: {                                                             │
 * │     type: "base64" | "url" | "file",                                   │
 * │     ...source-specific properties                                       │
 * │   }                                                                     │
 * │ }                                                                       │
 * │                                                                         │
 * │ Three source types:                                                     │
 * │ - base64: Embed image data directly (most portable)                    │
 * │ - url: Reference publicly accessible image URLs                        │
 * │ - file: Use Files API for persistent storage (lesson 29)               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Image Token Calculation                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Images consume tokens based on dimensions:                              │
 * │                                                                         │
 * │ Formula: tokens = (width px × height px) / 750                         │
 * │                                                                         │
 * │ Recommended max: 1.15 megapixels (1568 px on longest edge)             │
 * │ This keeps images at ~1,600 tokens each.                               │
 * │                                                                         │
 * │ Limits:                                                                 │
 * │ - Max 5MB per image (API), 10MB (claude.ai)                            │
 * │ - Max 8000x8000 px (rejected above this)                               │
 * │ - Max 100 images per request                                            │
 * │ - 32MB total request size limit                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * SUPPORTED FORMATS:
 * - JPEG (image/jpeg)
 * - PNG (image/png)
 * - GIF (image/gif)
 * - WebP (image/webp)
 *
 * WHY THIS MATTERS:
 * Multi-modal AI enables powerful use cases:
 * - Document analysis and OCR
 * - Image-based Q&A
 * - Visual comparison and diff
 * - UI/design review
 * - Chart and graph interpretation
 * - Photo organization and tagging
 */

import Anthropic from "@anthropic-ai/sdk";
import { print_header, print_section, print_footer, print_kv, c } from "./util/colors";
import * as fs from "fs";
import * as path from "path";

print_header("LESSON 26: Vision & Image Processing");

const anthropic = new Anthropic();

// ==================================================
// PART 1: URL-Referenced Images
// ==================================================

print_section("Part 1: URL-Referenced Images");

/**
 * URL SOURCE STRUCTURE:
 *
 * {
 *   type: "image",
 *   source: {
 *     type: "url",
 *     url: string  // publicly accessible HTTPS URL
 *   }
 * }
 *
 * This is the simplest method - no encoding needed.
 * Best for: web images, CDN-hosted content, public resources.
 *
 * REQUIREMENTS:
 * - Must be HTTPS (HTTP not allowed)
 * - Must be publicly accessible (no auth)
 * - URL must return image content-type
 */

const image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png";

console.log(`${c.highlight("📤 Sending:")} URL-referenced image`);
console.log(`${c.dim("URL: " + image_url.substring(0, 60) + "...")}\n`);

const response1 = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 512,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "url",
            url: image_url,
          },
        },
        {
          type: "text",
          text: "Describe this image briefly. What does it demonstrate?",
        },
      ],
    },
  ],
});

const text1 = response1.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

console.log(`${c.label("💬 Claude:")} ${c.value(text1)}`);
print_kv("Input tokens", response1.usage.input_tokens);
print_kv("Output tokens", response1.usage.output_tokens);

// ==================================================
// PART 2: Base64-Encoded Images (Structure Demo)
// ==================================================

console.log("");
print_section("Part 2: Base64-Encoded Images (Structure)");

/**
 * BASE64 SOURCE STRUCTURE:
 *
 * {
 *   type: "image",
 *   source: {
 *     type: "base64",
 *     media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
 *     data: string  // base64-encoded image data
 *   }
 * }
 *
 * This is the most portable method - works offline, no URL dependencies.
 * Best for: local files, generated images, privacy-sensitive content.
 */

console.log(`${c.label("Base64 source structure:")}`);
console.log(`${c.dim(`{
  type: "image",
  source: {
    type: "base64",
    media_type: "image/png",  // or jpeg, gif, webp
    data: "iVBORw0KGgo..."    // base64-encoded image data
  }
}`)}`);

console.log(`\n${c.highlight("Helper function for loading local images:")}`);

/**
 * LOADING LOCAL IMAGES:
 *
 * For real applications, you'll typically load images from disk.
 * Convert to base64 and determine media type from extension.
 */

function load_image_as_base64(file_path: string): {
  data: string;
  media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
} {
  const extension = path.extname(file_path).toLowerCase();

  const media_type_map: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };

  const media_type = media_type_map[extension];
  if (!media_type) {
    throw new Error(`Unsupported image format: ${extension}`);
  }

  const buffer = fs.readFileSync(file_path);
  const data = buffer.toString("base64");

  return { data, media_type };
}

console.log(`${c.success("✓")} Helper function defined: load_image_as_base64()`);
console.log(`${c.dim("Usage: const img = load_image_as_base64('./photo.jpg')")}`);

console.log(`\n${c.dim("Example usage with base64:")}`);
console.log(`${c.dim(`const image = load_image_as_base64("./screenshot.png");
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: image.media_type,
          data: image.data,
        },
      },
      { type: "text", text: "Describe this screenshot." },
    ],
  }],
});`)}`);

// ==================================================
// PART 3: Multiple Images - Comparison
// ==================================================

console.log("");
print_section("Part 3: Multiple Images - Comparison");

/**
 * MULTI-IMAGE PATTERNS:
 *
 * You can include up to 100 images in a single request.
 * Label images with text blocks for clarity.
 *
 * Common patterns:
 * 1. Before/After comparison
 * 2. Side-by-side analysis
 * 3. Sequential frames
 * 4. Document pages
 *
 * BEST PRACTICE: Place images BEFORE text instructions.
 * This improves Claude's understanding of context.
 */

// Use the same working image URL for the comparison demo
// (In production, you would have different images)
const first_image_url = image_url; // The dice image from Part 1
const second_image_url = image_url; // Same image for demo purposes

console.log(`${c.highlight("📤 Sending:")} Two images for comparison`);
console.log(`${c.dim("Image A and B: Both are the same dice image (demo)")}\n`);

const response3 = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 256,
  messages: [
    {
      role: "user",
      content: [
        // Label first image
        { type: "text", text: "Image A:" },
        {
          type: "image",
          source: {
            type: "url",
            url: first_image_url,
          },
        },
        // Label second image
        { type: "text", text: "Image B:" },
        {
          type: "image",
          source: {
            type: "url",
            url: second_image_url,
          },
        },
        // Ask for comparison
        {
          type: "text",
          text: "Are Image A and Image B the same or different? What do they show? Answer briefly.",
        },
      ],
    },
  ],
});

const text3 = response3.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

console.log(`${c.label("💬 Claude:")} ${c.value(text3)}`);

// ==================================================
// PART 4: Multi-Turn Vision Conversations
// ==================================================

console.log("");
print_section("Part 4: Multi-Turn Vision Conversations");

/**
 * VISION IN CONVERSATIONS:
 *
 * Images can be included in multi-turn conversations.
 * Claude maintains context about previously seen images.
 *
 * Pattern:
 * Turn 1: Show image, ask question
 * Turn 2: Follow-up questions about same image
 * Turn 3: Add new images for comparison
 */

console.log(`${c.highlight("📤 Turn 1:")} Describe the image`);

const turn1 = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 256,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "url",
            url: first_image_url,
          },
        },
        { type: "text", text: "What do you see in this image? Be brief." },
      ],
    },
  ],
});

const turn1_text = turn1.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

console.log(`${c.label("💬 Turn 1 Response:")} ${c.value(turn1_text)}\n`);

// Continue conversation
console.log(`${c.highlight("📤 Turn 2:")} Follow-up question (no new image)`);

const turn2 = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 256,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "url",
            url: first_image_url,
          },
        },
        { type: "text", text: "What do you see in this image? Be brief." },
      ],
    },
    {
      role: "assistant",
      content: turn1_text,
    },
    {
      role: "user",
      content: "What hex color code would you estimate for it?",
    },
  ],
});

const turn2_text = turn2.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

console.log(`${c.label("💬 Turn 2 Response:")} ${c.value(turn2_text)}`);

// ==================================================
// PART 5: Vision with System Prompts
// ==================================================

console.log("");
print_section("Part 5: Vision with System Prompts");

/**
 * SPECIALIZED ANALYSIS:
 *
 * Combine system prompts with vision for domain-specific analysis.
 *
 * Use cases:
 * - Art criticism: Focus on composition, technique, style
 * - Medical: Describe findings (not diagnose)
 * - Technical: UI review, diagram analysis
 * - Accessibility: Alt-text generation
 */

const system_prompt = `You are an expert color analyst. When analyzing images:
1. Identify the dominant colors using professional terminology
2. Provide approximate RGB or hex values
3. Suggest color palette names if applicable
Keep responses concise and technical.`;

console.log(`${c.highlight("📤 Sending:")} Image with expert system prompt`);
console.log(`${c.dim("System: Color analyst persona")}\n`);

const response5 = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 256,
  system: system_prompt,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "url",
            url: first_image_url,
          },
        },
        { type: "text", text: "Analyze this image's color." },
      ],
    },
  ],
});

const text5 = response5.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map((b) => b.text)
  .join("");

console.log(`${c.label("💬 Claude:")} ${c.value(text5)}`);

// ==================================================
// PART 6: Token Calculation Helper
// ==================================================

console.log("");
print_section("Part 6: Image Token Estimation");

/**
 * CALCULATING IMAGE TOKENS:
 *
 * Before sending large images, estimate token usage:
 * tokens = (width × height) / 750
 *
 * Cost optimization tips:
 * - Resize images to 1568px max on longest edge
 * - Crop to relevant areas when possible
 * - Use JPEG for photos (smaller than PNG)
 */

function estimate_image_tokens(width: number, height: number): number {
  return Math.ceil((width * height) / 750);
}

// Example calculations
const examples = [
  { width: 100, height: 100, desc: "Thumbnail" },
  { width: 800, height: 600, desc: "Web image" },
  { width: 1920, height: 1080, desc: "Full HD" },
  { width: 1092, height: 1092, desc: "Optimal square" },
  { width: 4000, height: 3000, desc: "High-res photo" },
];

console.log(`${c.label("Image Token Estimates:")}\n`);
for (const ex of examples) {
  const tokens = estimate_image_tokens(ex.width, ex.height);
  console.log(`  ${c.value(ex.desc.padEnd(16))} ${ex.width}×${ex.height} → ${c.highlight(tokens.toLocaleString())} tokens`);
}

console.log(`\n${c.dim("Recommended max: 1568×1568 (~3,277 tokens)")}`);
console.log(`${c.dim("Optimal size: ~1092×1092 (~1,590 tokens)")}`);

// ==================================================
// PART 7: Files API Source (Preview)
// ==================================================

console.log("");
print_section("Part 7: Files API Source (Preview)");

/**
 * FILE SOURCE STRUCTURE:
 *
 * {
 *   type: "image",
 *   source: {
 *     type: "file",
 *     file_id: string  // file_id from Files API upload
 *   }
 * }
 *
 * Best for: Images used repeatedly, large files, persistent storage.
 * Covered in detail in Lesson 29: Files API
 */

console.log(`${c.label("Files API source structure:")}`);
console.log(`${c.dim(`{
  type: "image",
  source: {
    type: "file",
    file_id: "file_abc123..."  // from Files API upload
  }
}`)}`);

console.log(`\n${c.dim("Files API workflow:")}`);
console.log(`${c.dim("1. Upload image: anthropic.beta.files.upload({ file: ... })")}`);
console.log(`${c.dim("2. Get file_id from response")}`);
console.log(`${c.dim("3. Use file_id in messages (can reuse many times)")}`);
console.log(`\n${c.highlight("See Lesson 29 for full Files API coverage.")}`);

print_footer("END OF LESSON");

/**
 * VISION LIMITATIONS TO KNOW:
 *
 * Claude's vision CANNOT:
 * - Identify (name) specific people
 * - Precisely locate objects in pixel coordinates
 * - Accurately count large numbers of small objects
 * - Detect if an image is AI-generated
 * - Parse EXIF or other metadata
 * - Generate, edit, or manipulate images
 *
 * Claude's vision CAN:
 * - Describe image content in detail
 * - Read text in images (OCR)
 * - Analyze charts, graphs, diagrams
 * - Compare multiple images
 * - Identify objects, scenes, activities
 * - Provide accessibility descriptions
 *
 *
 * IMAGE SOURCE COMPARISON:
 *
 * | Method  | Best For                    | Pros                      | Cons                    |
 * |---------|-----------------------------|---------------------------|-------------------------|
 * | base64  | Local files, privacy        | No network dependency     | Larger request size     |
 * | url     | Web images, CDN content     | Simple, no encoding       | Must be public HTTPS    |
 * | file    | Repeated use, large files   | Upload once, use many     | Requires Files API      |
 *
 *
 * OPTIMAL DIMENSIONS BY ASPECT RATIO:
 *
 * | Ratio | Dimensions   | ~Tokens |
 * |-------|-------------|---------|
 * | 1:1   | 1092×1092   | 1,590   |
 * | 4:3   | 1268×951    | 1,600   |
 * | 16:9  | 1456×819    | 1,600   |
 * | 2:1   | 1568×784    | 1,600   |
 *
 *
 * KEY TAKEAWAYS:
 * 1. Images are content blocks with type: "image" and source configuration
 * 2. Three source types: base64 (portable), url (simple), file (persistent)
 * 3. Token cost = (width × height) / 750
 * 4. Place images BEFORE text instructions for best results
 * 5. Label multiple images with text blocks for clarity
 * 6. Use system prompts for specialized analysis
 * 7. Max 100 images per request, 5MB each, 32MB total
 *
 * NEXT: Lesson 27 covers the Computer Use tool for controlling desktop environments
 */
