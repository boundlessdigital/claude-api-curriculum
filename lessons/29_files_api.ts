/**
 * LESSON 29: Files API
 * =====================
 *
 * WHAT YOU'LL LEARN:
 * - What the Files API is and its purpose
 * - Uploading files (images, PDFs, documents)
 * - Referencing uploaded files in messages
 * - Managing files (list, retrieve, delete)
 * - File size limits and supported formats
 *
 * PREREQUISITE: Lesson 26 (Vision/Images)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Files API                                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The Files API provides "upload once, use many times" file storage:     │
 * │                                                                         │
 * │ - Upload files to get a unique file_id                                 │
 * │ - Reference files in messages using the file_id                        │
 * │ - Avoid re-uploading the same file with every request                  │
 * │ - Files persist until explicitly deleted                               │
 * │                                                                         │
 * │ BETA STATUS: Requires beta header: "files-api-2025-04-14"              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Content Block Types                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Files are referenced in messages using content blocks:                 │
 * │                                                                         │
 * │ - type: "document" → For PDFs and text files                           │
 * │ - type: "image"    → For images (JPEG, PNG, GIF, WebP)                 │
 * │                                                                         │
 * │ Each block uses source: { type: "file", file_id: "..." }               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * SUPPORTED FORMATS:
 * - PDFs: application/pdf
 * - Plain text: text/plain
 * - Images: image/jpeg, image/png, image/gif, image/webp
 * - Code files: .py, .js, .java, etc.
 *
 * LIMITS:
 * - Max file size: 500 MB
 * - Max organization storage: 100 GB
 * - File content is charged as input tokens in Messages
 */

import Anthropic from "@anthropic-ai/sdk";
import { print_header, print_section, print_footer, print_kv, log_json, c } from "./util/colors";

print_header("LESSON 29: Files API");

const anthropic = new Anthropic();

// ==================================================
// PART 1: Files API Overview
// ==================================================

print_section("Part 1: Files API Overview");

/**
 * FILES API BENEFITS:
 *
 * 1. Upload Once, Use Many: Upload a document once,
 *    reference it in multiple conversations
 *
 * 2. Efficient: No need to re-encode and send file
 *    data with every request
 *
 * 3. Persistent: Files remain available until deleted
 *
 * 4. Workspace-scoped: All API keys in a workspace
 *    can access the same files
 */

console.log(`${c.label("Files API Benefits:")}\n`);
console.log(`  ${c.value("1.")} Upload once, use many times`);
console.log(`  ${c.value("2.")} No re-uploading with every request`);
console.log(`  ${c.value("3.")} Files persist until deleted`);
console.log(`  ${c.value("4.")} Shared across workspace API keys`);

console.log(`\n${c.highlight("Beta Header Required:")}`);
console.log(`${c.dim("betas: ['files-api-2025-04-14']")}`);

// ==================================================
// PART 2: Uploading Files
// ==================================================

console.log("");
print_section("Part 2: Uploading Files");

/**
 * FILE UPLOAD ENDPOINT:
 *
 * POST /beta/files/upload
 *
 * The upload returns a file_id that you use to
 * reference the file in messages.
 */

console.log(`${c.label("Upload Example (TypeScript):")}`);
console.log(`${c.dim(`
import Anthropic, { toFile } from '@anthropic-ai/sdk';
import fs from 'fs';

const anthropic = new Anthropic();

// Upload a PDF
const pdf_upload = await anthropic.beta.files.upload({
  file: await toFile(
    fs.createReadStream('/path/to/document.pdf'),
    'document.pdf',
    { type: 'application/pdf' }
  )
}, {
  betas: ['files-api-2025-04-14']
});

console.log('File ID:', pdf_upload.id);
// Output: file_011CNha8iCJcU1wXNR6q4V8w
`)}`);

console.log(`\n${c.label("Upload Response Structure:")}`);
console.log(`${c.dim(`{
  "id": "file_011CNha8iCJcU1wXNR6q4V8w",
  "type": "file",
  "filename": "document.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 1024000,
  "created_at": "2025-01-01T00:00:00Z",
  "downloadable": false
}`)}`);

// ==================================================
// PART 3: Referencing Files in Messages
// ==================================================

console.log("");
print_section("Part 3: Referencing Files in Messages");

/**
 * FILE REFERENCE STRUCTURES:
 *
 * For Documents (PDFs, text files):
 * {
 *   type: "document",
 *   source: {
 *     type: "file",
 *     file_id: "file_..."
 *   }
 * }
 *
 * For Images:
 * {
 *   type: "image",
 *   source: {
 *     type: "file",
 *     file_id: "file_..."
 *   }
 * }
 */

console.log(`${c.label("Document Block (PDFs, text):")}`);
console.log(`${c.dim(`{
  type: "document",
  source: {
    type: "file",
    file_id: "file_011CNha8iCJcU1wXNR6q4V8w"
  },
  title: "My Document",      // Optional
  context: "Context info",   // Optional
  citations: { enabled: true } // Optional
}`)}`);

console.log(`\n${c.label("Image Block (JPEG, PNG, GIF, WebP):")}`);
console.log(`${c.dim(`{
  type: "image",
  source: {
    type: "file",
    file_id: "file_011CPMxVD3fHLUhvTqtsQA5w"
  }
}`)}`);

// ==================================================
// PART 4: Complete Usage Example
// ==================================================

console.log("");
print_section("Part 4: Complete Usage Example");

console.log(`${c.label("Full Workflow Example:")}`);
console.log(`${c.dim(`
import Anthropic, { toFile } from '@anthropic-ai/sdk';
import fs from 'fs';

const anthropic = new Anthropic();
const BETA = ['files-api-2025-04-14'];

async function analyzeDocument(filePath: string, question: string) {
  // Step 1: Upload the file
  const upload = await anthropic.beta.files.upload({
    file: await toFile(
      fs.createReadStream(filePath),
      'document.pdf',
      { type: 'application/pdf' }
    )
  }, { betas: BETA });

  console.log('Uploaded file:', upload.id);

  // Step 2: Use the file in a message
  const response = await anthropic.beta.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: question
        },
        {
          type: 'document',
          source: {
            type: 'file',
            file_id: upload.id
          }
        }
      ]
    }],
    betas: BETA
  });

  return response;
}

// Use the function
const result = await analyzeDocument(
  './report.pdf',
  'Summarize the key findings in this document.'
);
`)}`);

// ==================================================
// PART 5: Managing Files
// ==================================================

console.log("");
print_section("Part 5: Managing Files");

/**
 * FILE OPERATIONS:
 *
 * - List: Get all files in your workspace
 * - Retrieve: Get metadata for a specific file
 * - Delete: Remove a file (permanent!)
 * - Download: Get content (only for tool-created files)
 */

console.log(`${c.label("List All Files:")}`);
console.log(`${c.dim(`
const files = await anthropic.beta.files.list({
  betas: ['files-api-2025-04-14']
});

for (const file of files.data) {
  console.log(\`\${file.id}: \${file.filename} (\${file.size_bytes} bytes)\`);
}
`)}`);

console.log(`\n${c.label("Get File Metadata:")}`);
console.log(`${c.dim(`
const file = await anthropic.beta.files.retrieveMetadata(
  'file_011CNha8iCJcU1wXNR6q4V8w',
  { betas: ['files-api-2025-04-14'] }
);

console.log('Filename:', file.filename);
console.log('Size:', file.size_bytes);
console.log('Created:', file.created_at);
`)}`);

console.log(`\n${c.label("Delete a File:")}`);
console.log(`${c.dim(`
await anthropic.beta.files.delete(
  'file_011CNha8iCJcU1wXNR6q4V8w',
  { betas: ['files-api-2025-04-14'] }
);
// ⚠️ Cannot be recovered!
`)}`);

console.log(`\n${c.warning("⚠️")} ${c.highlight("Delete is permanent!")} Files cannot be recovered.`);

// ==================================================
// PART 6: Downloading Files
// ==================================================

console.log("");
print_section("Part 6: Downloading Files");

/**
 * FILE DOWNLOADS:
 *
 * IMPORTANT: You can ONLY download files created by
 * skills or the code execution tool.
 *
 * Files you uploaded yourself CANNOT be downloaded
 * (you already have the source).
 */

console.log(`${c.label("Download Tool-Created Files:")}`);
console.log(`${c.dim(`
// Only works for files created by tools/skills!
const content = await anthropic.beta.files.download(
  'file_011CNha8iCJcU1wXNR6q4V8w',
  { betas: ['files-api-2025-04-14'] }
);

fs.writeFileSync('downloaded_file.txt', content);
`)}`);

console.log(`\n${c.warning("Note:")} You can only download files created by`);
console.log(`${c.dim("tools or skills, not files you uploaded.")}`);

// ==================================================
// PART 7: File Limits and Billing
// ==================================================

console.log("");
print_section("Part 7: Limits and Billing");

const limits = [
  { item: "Max file size", value: "500 MB" },
  { item: "Max org storage", value: "100 GB" },
  { item: "API rate limit (beta)", value: "~100 req/min" },
];

console.log(`${c.label("File Limits:")}\n`);
for (const { item, value } of limits) {
  console.log(`  ${c.dim("•")} ${item}: ${c.highlight(value)}`);
}

console.log(`\n${c.label("Billing:")}\n`);
console.log(`  ${c.success("✓")} File operations (upload, delete, list) are ${c.highlight("FREE")}`);
console.log(`  ${c.dim("•")} File content in Messages is charged as ${c.highlight("input tokens")}`);
console.log(`  ${c.dim("•")} Same file used multiple times = charged each time`);

// ==================================================
// PART 8: Supported Formats
// ==================================================

console.log("");
print_section("Part 8: Supported Formats");

const formats = [
  { format: "PDF", mime: "application/pdf", block: "document" },
  { format: "Plain text", mime: "text/plain", block: "document" },
  { format: "JPEG", mime: "image/jpeg", block: "image" },
  { format: "PNG", mime: "image/png", block: "image" },
  { format: "GIF", mime: "image/gif", block: "image" },
  { format: "WebP", mime: "image/webp", block: "image" },
];

console.log(`${c.label("Supported File Formats:")}\n`);
console.log(`  ${c.dim("Format".padEnd(12))} ${c.dim("MIME Type".padEnd(20))} ${c.dim("Block Type")}`);
console.log(`  ${c.dim("-".repeat(50))}`);
for (const { format, mime, block } of formats) {
  console.log(`  ${c.value(format.padEnd(12))} ${c.dim(mime.padEnd(20))} ${block}`);
}

console.log(`\n${c.highlight("Unsupported Formats:")}`);
console.log(`${c.dim("For CSV, Excel, DOCX: Convert to text and include directly in message.")}`);

// ==================================================
// PART 9: Working with Unsupported Formats
// ==================================================

console.log("");
print_section("Part 9: Working with Unsupported Formats");

console.log(`${c.label("Handling CSV Files:")}`);
console.log(`${c.dim(`
import fs from 'fs';

// Read CSV as text
const csvContent = fs.readFileSync('data.csv', 'utf-8');

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: \`Here's the CSV data:

\${csvContent}

Please analyze this data and identify trends.\`
  }]
});
`)}`);

console.log(`\n${c.label("Handling DOCX Files:")}`);
console.log(`${c.dim("Use a library like 'mammoth' to extract text, then include in message.")}`);

// ==================================================
// PART 10: Best Practices
// ==================================================

console.log("");
print_section("Part 10: Best Practices");

const best_practices = [
  {
    practice: "Reuse file IDs",
    desc: "Upload once, reference many times to avoid redundant uploads",
  },
  {
    practice: "Delete unused files",
    desc: "Clean up files you no longer need to free storage",
  },
  {
    practice: "Use appropriate block types",
    desc: "document for PDFs/text, image for images",
  },
  {
    practice: "Include context",
    desc: "Add title and context to document blocks for better results",
  },
  {
    practice: "Handle errors",
    desc: "Check for upload failures and file size limits",
  },
  {
    practice: "Track file IDs",
    desc: "Store file_ids in your database for later reference",
  },
];

console.log(`${c.label("Best Practices:")}\n`);
for (const { practice, desc } of best_practices) {
  console.log(`  ${c.success("✓")} ${c.highlight(practice)}`);
  console.log(`     ${c.dim(desc)}\n`);
}

print_footer("END OF LESSON");

/**
 * FILES API SUMMARY:
 *
 * WHAT IT IS:
 * - Upload-once, use-many-times file storage
 * - Files persist until explicitly deleted
 * - Shared across workspace API keys
 *
 * BETA HEADER:
 * betas: ['files-api-2025-04-14']
 *
 * FILE OPERATIONS:
 * - upload(): Upload a new file → returns file_id
 * - list(): List all files in workspace
 * - retrieveMetadata(): Get file details
 * - delete(): Permanently remove file
 * - download(): Get content (tool-created files only)
 *
 * CONTENT BLOCK TYPES:
 * - document: For PDFs and text files
 * - image: For JPEG, PNG, GIF, WebP
 *
 * SOURCE STRUCTURE:
 * {
 *   type: "file",
 *   file_id: "file_..."
 * }
 *
 * LIMITS:
 * - Max file: 500 MB
 * - Max org storage: 100 GB
 * - Rate limit: ~100 req/min (beta)
 *
 * BILLING:
 * - File operations: FREE
 * - Content in messages: Charged as input tokens
 *
 * KEY TAKEAWAYS:
 * 1. Upload files once, reference by file_id
 * 2. Use "document" block for PDFs, "image" for images
 * 3. Beta header required for all Files API operations
 * 4. Files persist until deleted (delete is permanent!)
 * 5. Only tool-created files can be downloaded
 * 6. Unsupported formats: convert to text first
 *
 * CONGRATULATIONS! You've completed all 29 lessons of the
 * Claude Agent SDK curriculum. You now have a comprehensive
 * understanding of:
 *
 * - Basic queries and message handling
 * - Tools (built-in, custom, MCP)
 * - Sessions and multi-turn conversations
 * - Streaming and observation
 * - Subagents and hooks
 * - Error handling and production patterns
 * - Vision, files, embeddings
 * - Advanced features (caching, batching, thinking)
 *
 * Keep building with Claude! 🚀
 */
