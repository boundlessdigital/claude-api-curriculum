/**
 * LESSON 32: Citations
 * =====================
 *
 * WHAT YOU'LL LEARN:
 * - What citations are and why they matter
 * - How to enable citations on documents
 * - Parsing citation responses (text, PDF, custom content)
 * - Citation response structure and types
 * - Limitations and compatibility
 *
 * PREREQUISITE: Lesson 29 (Files API) or understanding of document blocks
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Citations                                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Citations enable Claude to provide source attribution for information  │
 * │ by referencing specific locations in provided documents.               │
 * │                                                                         │
 * │ Benefits:                                                               │
 * │ - Verifiable sources for each claim                                    │
 * │ - cited_text does NOT count as output tokens (cost savings!)           │
 * │ - Guaranteed valid pointers to source documents                        │
 * │ - Better quality citations vs prompt-based approaches                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Citation Types                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Different document types produce different citation formats:           │
 * │                                                                         │
 * │ Plain Text → char_location (character indices, 0-indexed)              │
 * │ PDF        → page_location (page numbers, 1-indexed)                   │
 * │ Custom     → content_block_location (block indices, 0-indexed)         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * SUPPORTED MODELS: All active models except Haiku 3
 *
 * IMPORTANT LIMITATION:
 * - Citations CANNOT be used with Structured Outputs
 * - Citations must be enabled on ALL or NONE of the documents
 */

import Anthropic from "@anthropic-ai/sdk";
import { print_header, print_section, print_footer, print_kv, log_json, c } from "./util/colors";

print_header("LESSON 32: Citations");

const anthropic = new Anthropic();

// ==================================================
// PART 1: Why Citations Matter
// ==================================================

print_section("Part 1: Why Citations Matter");

/**
 * CITATIONS SOLVE SEVERAL PROBLEMS:
 *
 * 1. Verification: Users can check Claude's sources
 * 2. Trust: Responses are backed by specific text
 * 3. Cost: cited_text doesn't count as output tokens!
 * 4. Quality: Better than asking Claude to "cite sources"
 */

console.log(`${c.label("Citation Benefits:")}\n`);
console.log(`  ${c.success("1.")} ${c.highlight("Verification")} - Users can check Claude's sources`);
console.log(`  ${c.success("2.")} ${c.highlight("Trust")} - Every claim backed by specific text`);
console.log(`  ${c.success("3.")} ${c.highlight("Cost Savings")} - cited_text is FREE (not output tokens)`);
console.log(`  ${c.success("4.")} ${c.highlight("Reliability")} - Guaranteed valid document pointers`);

console.log(`\n${c.label("How It Works:")}`);
console.log(`${c.dim(`
1. Provide documents with citations: {enabled: true}
2. Claude processes and chunks the documents
3. Response includes text blocks with citation metadata
4. Each citation points to exact location in source
`)}`);

// ==================================================
// PART 2: Basic Plain Text Citations
// ==================================================

console.log("");
print_section("Part 2: Basic Plain Text Citations");

/**
 * PLAIN TEXT CITATIONS:
 *
 * Enable citations on a text document, and Claude
 * will provide character-indexed citations.
 */

const science_document = `The Sun is a G-type main-sequence star (G2V) at the center of our solar system. It contains 99.86% of the total mass of the solar system. The Sun's core temperature reaches approximately 15 million degrees Celsius. Nuclear fusion in the core converts hydrogen into helium, releasing enormous amounts of energy. The Sun is about 4.6 billion years old and is expected to remain stable for another 5 billion years.`;

console.log(`${c.label("Document Content (truncated):")}`);
console.log(`${c.dim(science_document.slice(0, 100))}...\n`);

const response_plain = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 500,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "text",
            media_type: "text/plain",
            data: science_document,
          },
          title: "Solar Facts",
          citations: { enabled: true }, // <-- Enable citations!
        },
        {
          type: "text",
          text: "What is the temperature of the Sun's core? Cite your source.",
        },
      ],
    },
  ],
});

console.log(`${c.label("Response with Citations:")}\n`);

// Process the interleaved response
for (const block of response_plain.content) {
  if (block.type === "text") {
    console.log(`${c.value(block.text)}`);

    // Check for citations on this text block
    if ("citations" in block && Array.isArray(block.citations)) {
      for (const citation of block.citations) {
        console.log(`\n  ${c.success("📖 Citation:")}`);
        if (citation.type === "char_location") {
          print_kv("    Type", citation.type);
          print_kv("    Cited Text", `"${citation.cited_text.slice(0, 60)}..."`);
          print_kv("    Document", citation.document_title || `Document ${citation.document_index}`);
          print_kv("    Char Range", `${citation.start_char_index}-${citation.end_char_index}`);
        }
      }
    }
  }
}

// ==================================================
// PART 3: Citation Response Structure
// ==================================================

console.log("\n");
print_section("Part 3: Citation Response Structure");

/**
 * RESPONSE STRUCTURE:
 *
 * The response content is an array of text blocks.
 * Some text blocks include a "citations" array.
 *
 * {
 *   type: "text",
 *   text: "The temperature is...",
 *   citations: [
 *     {
 *       type: "char_location",
 *       cited_text: "The exact quoted text",
 *       document_index: 0,
 *       document_title: "Solar Facts",
 *       start_char_index: 100,
 *       end_char_index: 150
 *     }
 *   ]
 * }
 */

console.log(`${c.label("Response Content Structure:")}`);
console.log(`${c.dim(`
response.content = [
  {
    type: "text",
    text: "Non-cited text...",
  },
  {
    type: "text",
    text: "Cited claim...",
    citations: [
      {
        type: "char_location",        // or page_location, content_block_location
        cited_text: "Exact source text",  // FREE - not counted as output tokens!
        document_index: 0,
        document_title: "Document Name",
        start_char_index: 100,        // 0-indexed
        end_char_index: 150           // exclusive
      }
    ]
  }
]
`)}`);

// ==================================================
// PART 4: Citation Types by Document
// ==================================================

console.log("");
print_section("Part 4: Citation Types by Document");

const citation_types = [
  {
    doc_type: "Plain Text",
    citation_type: "char_location",
    indices: "start_char_index / end_char_index (0-indexed)",
    chunking: "Automatic (sentences)",
  },
  {
    doc_type: "PDF",
    citation_type: "page_location",
    indices: "start_page_number / end_page_number (1-indexed)",
    chunking: "Automatic (sentences)",
  },
  {
    doc_type: "Custom Content",
    citation_type: "content_block_location",
    indices: "start_block_index / end_block_index (0-indexed)",
    chunking: "Your blocks (no additional chunking)",
  },
];

console.log(`${c.label("Citation Types by Document Type:")}\n`);
for (const ct of citation_types) {
  console.log(`  ${c.highlight(ct.doc_type)}`);
  console.log(`    ${c.dim("Citation type:")} ${ct.citation_type}`);
  console.log(`    ${c.dim("Index fields:")} ${ct.indices}`);
  console.log(`    ${c.dim("Chunking:")} ${ct.chunking}\n`);
}

// ==================================================
// PART 5: Custom Content Citations
// ==================================================

console.log("");
print_section("Part 5: Custom Content Citations");

/**
 * CUSTOM CONTENT:
 *
 * For granular control over citation boundaries,
 * use custom content with explicit blocks.
 * Each block can be individually cited.
 */

console.log(`${c.label("Custom Content Example:")}`);
console.log(`${c.dim(`
{
  type: "document",
  source: {
    type: "content",
    content: [
      { type: "text", text: "Claim 1: The sky is blue." },
      { type: "text", text: "Claim 2: Water is H2O." },
      { type: "text", text: "Claim 3: The Earth orbits the Sun." }
    ]
  },
  title: "Facts List",
  citations: { enabled: true }
}
`)}`);

console.log(`\n${c.highlight("When to Use Custom Content:")}`);
console.log(`${c.dim("• RAG chunks where you control boundaries")}`);
console.log(`${c.dim("• Bulleted/numbered lists")}`);
console.log(`${c.dim("• Transcripts with speaker turns")}`);
console.log(`${c.dim("• Any case where sentence-chunking is insufficient")}`);

// Demo custom content
const custom_response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 300,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "content",
            content: [
              { type: "text", text: "Fact A: Python was created by Guido van Rossum in 1991." },
              { type: "text", text: "Fact B: JavaScript was created by Brendan Eich in 1995." },
              { type: "text", text: "Fact C: TypeScript was created by Microsoft in 2012." },
            ],
          },
          title: "Programming Language Facts",
          citations: { enabled: true },
        },
        {
          type: "text",
          text: "Who created Python and when? Cite your source.",
        },
      ],
    },
  ],
});

console.log(`\n${c.label("Custom Content Citation Response:")}\n`);

for (const block of custom_response.content) {
  if (block.type === "text") {
    console.log(`${c.value(block.text)}`);

    if ("citations" in block && Array.isArray(block.citations)) {
      for (const citation of block.citations) {
        if (citation.type === "content_block_location") {
          console.log(`\n  ${c.success("📖 Citation (content_block_location):")}`);
          print_kv("    Cited Text", `"${citation.cited_text}"`);
          print_kv("    Block Index", `${citation.start_block_index}-${citation.end_block_index}`);
        }
      }
    }
  }
}

// ==================================================
// PART 6: Multiple Documents
// ==================================================

console.log("\n");
print_section("Part 6: Multiple Documents");

/**
 * MULTIPLE DOCUMENTS:
 *
 * You can provide multiple documents, each with citations.
 * Citations include document_index to identify the source.
 */

const multi_doc_response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 400,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "text",
            media_type: "text/plain",
            data: "Albert Einstein developed the theory of relativity. He was born in 1879 in Germany.",
          },
          title: "Einstein Biography",
          citations: { enabled: true },
        },
        {
          type: "document",
          source: {
            type: "text",
            media_type: "text/plain",
            data: "Marie Curie discovered radioactivity. She won two Nobel Prizes in Physics and Chemistry.",
          },
          title: "Curie Biography",
          citations: { enabled: true },
        },
        {
          type: "text",
          text: "What did Einstein develop and what did Curie discover? Cite both sources.",
        },
      ],
    },
  ],
});

console.log(`${c.label("Multi-Document Response:")}\n`);

for (const block of multi_doc_response.content) {
  if (block.type === "text") {
    console.log(`${c.value(block.text)}`);

    if ("citations" in block && Array.isArray(block.citations)) {
      for (const citation of block.citations) {
        if (citation.type === "char_location") {
          console.log(`\n  ${c.success("📖 Citation:")}`);
          print_kv("    Document", citation.document_title || `Document ${citation.document_index}`);
          print_kv("    Doc Index", citation.document_index);
          print_kv("    Cited Text", `"${citation.cited_text.slice(0, 50)}..."`);
        }
      }
    }
  }
}

// ==================================================
// PART 7: Limitations and Compatibility
// ==================================================

console.log("\n");
print_section("Part 7: Limitations and Compatibility");

console.log(`${c.warning("IMPORTANT LIMITATIONS:")}\n`);

console.log(`${c.error("✗")} ${c.highlight("Cannot use with Structured Outputs")}`);
console.log(`  ${c.dim("Citations and output_format (JSON schema) are incompatible")}\n`);

console.log(`${c.error("✗")} ${c.highlight("All-or-none requirement")}`);
console.log(`  ${c.dim("Citations must be enabled on ALL or NONE of the documents")}\n`);

console.log(`${c.error("✗")} ${c.highlight("No image citations")}`);
console.log(`  ${c.dim("Only text content can be cited (image citations coming soon)")}\n`);

console.log(`${c.error("✗")} ${c.highlight("Haiku 3 not supported")}`);
console.log(`  ${c.dim("All other active models support citations")}\n`);

console.log(`${c.error("✗")} ${c.highlight("Unsupported file formats")}`);
console.log(`  ${c.dim(".csv, .xlsx, .docx, .md → Convert to plain text first")}\n`);

console.log(`${c.success("✓")} ${c.highlight("Compatible features:")}`);
console.log(`  ${c.dim("• Prompt caching (cache_control on documents)")}`);
console.log(`  ${c.dim("• Token counting")}`);
console.log(`  ${c.dim("• Batch processing")}`);
console.log(`  ${c.dim("• Streaming (citations_delta events)")}`);

// ==================================================
// PART 8: Cost Savings
// ==================================================

console.log("\n");
print_section("Part 8: Cost Savings");

/**
 * COST BENEFITS:
 *
 * 1. cited_text does NOT count as output tokens
 * 2. cited_text does NOT count as input tokens
 *    when passed in subsequent conversation turns
 */

console.log(`${c.label("Token Cost Benefits:")}\n`);

console.log(`  ${c.success("✓")} ${c.highlight("cited_text is FREE for output")}`);
console.log(`    ${c.dim("The quoted source text doesn't count as output tokens")}\n`);

console.log(`  ${c.success("✓")} ${c.highlight("cited_text is FREE for future turns")}`);
console.log(`    ${c.dim("When passed in subsequent messages, cited_text is free input")}\n`);

console.log(`  ${c.warning("Note:")} ${c.dim("Small increase in input tokens due to")}`);
console.log(`    ${c.dim("document chunking and system prompt additions")}`);

// ==================================================
// PART 9: Parsing Helper Function
// ==================================================

console.log("\n");
print_section("Part 9: Parsing Citations");

/**
 * HELPER FUNCTION:
 *
 * Extract all citations from a response.
 */

interface Citation {
  text: string;
  cited_text: string;
  document_title: string | null;
  document_index: number;
  type: string;
}

function extract_citations(response: Anthropic.Message): Citation[] {
  const citations: Citation[] = [];

  for (const block of response.content) {
    if (block.type === "text" && "citations" in block && Array.isArray(block.citations)) {
      for (const citation of block.citations) {
        citations.push({
          text: block.text,
          cited_text: citation.cited_text,
          document_title: citation.document_title || null,
          document_index: citation.document_index,
          type: citation.type,
        });
      }
    }
  }

  return citations;
}

console.log(`${c.label("Citation Extraction Helper:")}`);
console.log(`${c.dim(`
function extract_citations(response: Anthropic.Message): Citation[] {
  const citations: Citation[] = [];

  for (const block of response.content) {
    if (block.type === "text" && "citations" in block) {
      for (const citation of block.citations) {
        citations.push({
          text: block.text,
          cited_text: citation.cited_text,
          document_title: citation.document_title,
          document_index: citation.document_index,
          type: citation.type
        });
      }
    }
  }

  return citations;
}
`)}`);

// Demo the helper
const extracted = extract_citations(response_plain);
console.log(`\n${c.label("Extracted from earlier response:")}`);
console.log(`${c.dim("Found")} ${c.highlight(String(extracted.length))} ${c.dim("citation(s)")}`);

print_footer("END OF LESSON");

/**
 * CITATIONS SUMMARY:
 *
 * WHAT CITATIONS DO:
 * - Enable source attribution in Claude's responses
 * - Point to exact locations in provided documents
 * - Provide verifiable quotes for each claim
 *
 * HOW TO ENABLE:
 * {
 *   type: "document",
 *   source: { ... },
 *   citations: { enabled: true }  // <-- Add this
 * }
 *
 * CITATION TYPES:
 * - char_location: Plain text (character indices)
 * - page_location: PDFs (page numbers)
 * - content_block_location: Custom content (block indices)
 *
 * RESPONSE STRUCTURE:
 * response.content = [
 *   { type: "text", text: "...", citations: [...] },
 *   ...
 * ]
 *
 * COST BENEFITS:
 * - cited_text is FREE (not counted as output tokens)
 * - cited_text in future turns is FREE input
 *
 * LIMITATIONS:
 * - Cannot use with Structured Outputs
 * - Must enable on ALL or NONE of documents
 * - No image citations yet
 * - Haiku 3 not supported
 * - Convert unsupported formats to plain text
 *
 * COMPATIBLE WITH:
 * - Prompt caching
 * - Token counting
 * - Batch processing
 * - Streaming
 *
 * KEY TAKEAWAYS:
 * 1. Enable citations with citations: {enabled: true}
 * 2. Different doc types produce different citation formats
 * 3. Citations are interleaved with text blocks in response
 * 4. cited_text is free for output and subsequent turns
 * 5. Cannot combine with Structured Outputs
 *
 * NEXT: Lesson 33 covers Web Search Tool
 */
