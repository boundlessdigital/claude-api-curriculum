/**
 * LESSON 28: Embeddings & Semantic Search
 * ========================================
 *
 * WHAT YOU'LL LEARN:
 * - What embeddings are and why they matter
 * - Using Voyage AI (Anthropic's recommended embedding provider)
 * - The RAG (Retrieval-Augmented Generation) pattern
 * - Semantic search implementation
 * - Best practices for embedding-based retrieval
 *
 * PREREQUISITE: Lesson 01 (query basics)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Embeddings                                                 │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Embeddings are vector representations of text that capture semantic    │
 * │ meaning. Similar texts have similar embeddings, enabling:              │
 * │                                                                         │
 * │ - Semantic search (find related content by meaning)                    │
 * │ - Document retrieval (RAG)                                              │
 * │ - Clustering and classification                                         │
 * │ - Anomaly detection                                                     │
 * │                                                                         │
 * │ NOTE: Anthropic does NOT offer an embeddings API.                      │
 * │ They officially recommend Voyage AI for embeddings with Claude.        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: Voyage AI Models                                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Voyage AI is Anthropic's recommended embeddings provider:              │
 * │                                                                         │
 * │ voyage-3-large    - Best general-purpose quality (32K context)         │
 * │ voyage-3.5        - Balanced quality & cost (32K context)              │
 * │ voyage-3.5-lite   - Low latency & cost (32K context)                   │
 * │ voyage-code-3     - Optimized for code retrieval (32K context)         │
 * │ voyage-finance-2  - Financial documents (32K context)                  │
 * │ voyage-law-2      - Legal documents (16K context)                      │
 * │ voyage-multimodal-3 - Images + text (32K context)                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: RAG (Retrieval-Augmented Generation)                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ RAG is a pattern that enhances Claude's responses with external data:  │
 * │                                                                         │
 * │ 1. Embed your documents and store vectors                              │
 * │ 2. When user asks a question, embed the query                          │
 * │ 3. Find documents most similar to the query                            │
 * │ 4. Send relevant documents + query to Claude                           │
 * │ 5. Claude answers using the retrieved context                          │
 * │                                                                         │
 * │ This allows Claude to "know" about your specific data.                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * REQUIREMENTS:
 * To run this lesson with real embeddings, you need:
 * - Voyage AI API key (https://www.voyageai.com/)
 * - Set VOYAGE_API_KEY environment variable
 *
 * This lesson demonstrates patterns without requiring the Voyage API.
 */

import Anthropic from "@anthropic-ai/sdk";
import { print_header, print_section, print_footer, print_kv, log_json, c } from "./util/colors";

print_header("LESSON 28: Embeddings & Semantic Search");

const anthropic = new Anthropic();

// ==================================================
// PART 1: Understanding Embeddings
// ==================================================

print_section("Part 1: Understanding Embeddings");

/**
 * WHAT IS AN EMBEDDING?
 *
 * An embedding is a vector (array of numbers) that represents text.
 * The key property: similar texts have similar vectors.
 *
 * Example:
 * "The cat sat on the mat" → [0.1, 0.3, -0.2, 0.8, ...]
 * "A dog lies on the rug" → [0.12, 0.28, -0.15, 0.75, ...]  (similar!)
 * "Quantum physics explains" → [-0.5, 0.9, 0.1, -0.3, ...] (different!)
 *
 * Embeddings typically have 1024 dimensions (Voyage AI default).
 */

console.log(`${c.label("How Embeddings Work:")}`);
console.log(`${c.dim(`
Text → Embedding Model → Vector (1024 numbers)

"The cat sat on the mat"  →  [0.10, 0.30, -0.20, 0.80, ...]
"A dog lies on the rug"   →  [0.12, 0.28, -0.15, 0.75, ...]  ← Similar!
"Quantum physics"         →  [-0.50, 0.90, 0.10, -0.30, ...] ← Different!

Similarity is measured by dot product or cosine similarity.
`)}`);

// ==================================================
// PART 2: Voyage AI Setup
// ==================================================

console.log("");
print_section("Part 2: Voyage AI Setup");

/**
 * VOYAGE AI SETUP:
 *
 * 1. Get API key from https://www.voyageai.com/
 * 2. Install: npm install voyageai (or bun add voyageai)
 * 3. Set VOYAGE_API_KEY environment variable
 */

console.log(`${c.highlight("Installation:")}`);
console.log(`${c.dim("bun add voyageai")}\n`);

console.log(`${c.highlight("Environment Setup:")}`);
console.log(`${c.dim("export VOYAGE_API_KEY='your-api-key-here'")}\n`);

console.log(`${c.highlight("Basic Usage:")}`);
console.log(`${c.dim(`
import voyageai from 'voyageai';

const vo = new voyageai.Client();

// Embed documents
const doc_result = await vo.embed({
  input: ["Document 1", "Document 2"],
  model: "voyage-3.5",
  inputType: "document"
});

// Embed a query
const query_result = await vo.embed({
  input: ["What is this about?"],
  model: "voyage-3.5",
  inputType: "query"
});
`)}`);

// ==================================================
// PART 3: Simulated Embedding Functions
// ==================================================

console.log("");
print_section("Part 3: Simulated Embeddings (Demo)");

/**
 * SIMULATED EMBEDDINGS:
 *
 * For demonstration, we'll create simple mock embeddings.
 * In production, you'd use Voyage AI or another provider.
 */

// Simple hash-based mock embedding for demonstration
function mock_embedding(text: string, dimensions: number = 8): number[] {
  // This is NOT a real embedding - just for demonstration!
  const embedding: number[] = [];
  for (let i = 0; i < dimensions; i++) {
    let hash = 0;
    for (let j = 0; j < text.length; j++) {
      hash = text.charCodeAt(j) + ((hash << 5) - hash) + i;
      hash = hash & hash;
    }
    embedding.push((Math.sin(hash) + 1) / 2); // Normalize to [0, 1]
  }
  // Normalize to unit length
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}

// Cosine similarity (dot product for normalized vectors)
function cosine_similarity(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

const texts = [
  "The quick brown fox jumps over the lazy dog",
  "A fast reddish fox leaps above a sleepy hound",
  "Quantum computing uses qubits for calculations",
];

console.log(`${c.label("Sample Texts:")}\n`);
for (let i = 0; i < texts.length; i++) {
  console.log(`  ${c.value((i + 1) + ".")} "${texts[i]}"`);
}

console.log(`\n${c.label("Mock Embeddings (8 dimensions):")}\n`);
const embeddings = texts.map((t) => mock_embedding(t));
for (let i = 0; i < texts.length; i++) {
  const vec = embeddings[i].map((v) => v.toFixed(3)).join(", ");
  console.log(`  ${c.dim("Text " + (i + 1) + ":")} [${vec}]`);
}

console.log(`\n${c.label("Similarity Matrix:")}\n`);
console.log(`  ${c.dim("          Text 1    Text 2    Text 3")}`);
for (let i = 0; i < texts.length; i++) {
  const row = texts.map((_, j) => {
    const sim = cosine_similarity(embeddings[i], embeddings[j]);
    return sim.toFixed(3).padStart(8);
  });
  console.log(`  ${c.dim("Text " + (i + 1) + ":")} ${row.join("  ")}`);
}

console.log(`\n${c.dim("(Higher values = more similar)")}`);

// ==================================================
// PART 4: The RAG Pattern
// ==================================================

console.log("");
print_section("Part 4: The RAG Pattern");

/**
 * RAG (RETRIEVAL-AUGMENTED GENERATION):
 *
 * The most common use case for embeddings with Claude.
 * It lets Claude answer questions about YOUR specific data.
 */

console.log(`${c.label("RAG Workflow:")}`);
console.log(`${c.dim(`
┌─────────────────────────────────────────────────────────────┐
│  1. INDEXING PHASE (done once)                              │
│                                                             │
│     Your Documents → Embedding Model → Vector Database      │
│     (PDFs, docs, etc.)  (Voyage AI)     (Pinecone, etc.)   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. QUERY PHASE (each user question)                        │
│                                                             │
│     User Query → Embed Query → Find Similar Docs → Claude   │
│     "What is X?"    [vector]    Top K matches     + context │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. GENERATION PHASE                                        │
│                                                             │
│     Claude receives: User question + Retrieved documents    │
│     Claude responds: Answer based on the context            │
└─────────────────────────────────────────────────────────────┘
`)}`);

// ==================================================
// PART 5: Semantic Search Implementation
// ==================================================

console.log("");
print_section("Part 5: Semantic Search Implementation");

/**
 * SEMANTIC SEARCH:
 *
 * Given a query, find the most relevant documents
 * from a collection using embedding similarity.
 */

// Simulated document database
const documents = [
  { id: 1, text: "Claude is an AI assistant made by Anthropic." },
  { id: 2, text: "Python is a popular programming language." },
  { id: 3, text: "Machine learning models learn from data." },
  { id: 4, text: "Anthropic focuses on AI safety research." },
  { id: 5, text: "JavaScript runs in web browsers." },
];

// Pre-compute embeddings (in production, do this once and store)
const doc_embeddings = documents.map((doc) => ({
  ...doc,
  embedding: mock_embedding(doc.text),
}));

function semantic_search(query: string, top_k: number = 3): typeof documents {
  const query_embedding = mock_embedding(query);

  // Calculate similarities
  const scored = doc_embeddings.map((doc) => ({
    ...doc,
    score: cosine_similarity(query_embedding, doc.embedding),
  }));

  // Sort by similarity and return top K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, top_k);
}

const query = "Tell me about AI and Anthropic";
console.log(`${c.highlight("Query:")} "${query}"\n`);

const results = semantic_search(query, 3);
console.log(`${c.label("Top 3 Results:")}\n`);
for (const result of results) {
  console.log(`  ${c.value("ID " + result.id)} (score: ${(result as any).score.toFixed(3)})`);
  console.log(`  ${c.dim('"' + result.text + '"')}\n`);
}

// ==================================================
// PART 6: RAG with Claude
// ==================================================

console.log("");
print_section("Part 6: RAG with Claude (Live Demo)");

/**
 * COMPLETE RAG EXAMPLE:
 *
 * Combine semantic search with Claude to answer
 * questions based on retrieved context.
 */

async function rag_query(user_question: string): Promise<string> {
  // Step 1: Find relevant documents
  const relevant_docs = semantic_search(user_question, 2);

  // Step 2: Format context for Claude
  const context = relevant_docs.map((doc) => `- ${doc.text}`).join("\n");

  // Step 3: Send to Claude with context
  const prompt = `Based on the following information:
${context}

Answer this question: ${user_question}

If the information doesn't contain the answer, say so.`;

  console.log(`${c.highlight("📤 Prompt to Claude:")}`);
  console.log(`${c.dim(prompt)}\n`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return text;
}

const rag_question = "What does Anthropic do?";
console.log(`${c.label("RAG Question:")} "${rag_question}"\n`);

const rag_answer = await rag_query(rag_question);
console.log(`${c.label("💬 Claude's Answer:")}`);
console.log(`${c.value(rag_answer)}`);

// ==================================================
// PART 7: Input Type Best Practices
// ==================================================

console.log("");
print_section("Part 7: Input Type Best Practices");

/**
 * INPUT TYPE SPECIFICATION:
 *
 * Voyage AI optimizes embeddings based on whether the input
 * is a search query or a document. ALWAYS specify this!
 *
 * - input_type: "query"    → For search queries
 * - input_type: "document" → For documents being indexed
 *
 * This significantly improves retrieval quality.
 */

console.log(`${c.label("Voyage AI input_type Parameter:")}\n`);

console.log(`${c.highlight("For Queries (searching):")}`);
console.log(`${c.dim(`vo.embed({
  input: ["What is machine learning?"],
  model: "voyage-3.5",
  inputType: "query"  // ✅ Optimized for search
})`)}\n`);

console.log(`${c.highlight("For Documents (indexing):")}`);
console.log(`${c.dim(`vo.embed({
  input: ["Machine learning is a subset of AI..."],
  model: "voyage-3.5",
  inputType: "document"  // ✅ Optimized for retrieval
})`)}\n`);

console.log(`${c.warning("⚠️")} ${c.highlight("Important:")} Always specify input_type!`);
console.log(`${c.dim("Queries and documents are embedded differently for optimal retrieval.")}`);

// ==================================================
// PART 8: Vector Database Options
// ==================================================

console.log("");
print_section("Part 8: Vector Database Options");

/**
 * VECTOR DATABASES:
 *
 * For production systems, store embeddings in a vector database:
 */

const vector_dbs = [
  { name: "Pinecone", desc: "Fully managed, easy to use, scales well" },
  { name: "Weaviate", desc: "Open-source, supports hybrid search" },
  { name: "Milvus", desc: "Open-source, highly scalable" },
  { name: "Qdrant", desc: "Open-source, Rust-based, fast" },
  { name: "ChromaDB", desc: "Open-source, Python-native, good for prototyping" },
  { name: "pgvector", desc: "PostgreSQL extension, SQL + vectors" },
];

console.log(`${c.label("Popular Vector Databases:")}\n`);
for (const db of vector_dbs) {
  console.log(`  ${c.highlight(db.name.padEnd(12))} ${c.dim(db.desc)}`);
}

console.log(`\n${c.dim("For prototyping: ChromaDB or simple numpy")}`);
console.log(`${c.dim("For production: Pinecone, Weaviate, or pgvector")}`);

// ==================================================
// PART 9: Full RAG Pipeline Example
// ==================================================

console.log("");
print_section("Part 9: Full RAG Pipeline (Pseudocode)");

console.log(`${c.label("Complete Production RAG Implementation:")}`);
console.log(`${c.dim(`
import voyageai from 'voyageai';
import { Pinecone } from '@pinecone-database/pinecone';
import Anthropic from '@anthropic-ai/sdk';

const vo = new voyageai.Client();
const pinecone = new Pinecone();
const anthropic = new Anthropic();

// Index a document
async function indexDocument(id: string, text: string) {
  const result = await vo.embed({
    input: [text],
    model: "voyage-3.5",
    inputType: "document"
  });

  await pinecone.index("my-index").upsert([{
    id,
    values: result.embeddings[0],
    metadata: { text }
  }]);
}

// Search and answer
async function askQuestion(question: string): Promise<string> {
  // 1. Embed the query
  const queryResult = await vo.embed({
    input: [question],
    model: "voyage-3.5",
    inputType: "query"
  });

  // 2. Search vector database
  const matches = await pinecone.index("my-index").query({
    vector: queryResult.embeddings[0],
    topK: 5,
    includeMetadata: true
  });

  // 3. Format context
  const context = matches.matches
    .map(m => m.metadata?.text)
    .join("\\n\\n");

  // 4. Ask Claude
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: "Answer based on the provided context.",
    messages: [{
      role: "user",
      content: \`Context:\\n\${context}\\n\\nQuestion: \${question}\`
    }]
  });

  return response.content[0].text;
}
`)}`);

print_footer("END OF LESSON");

/**
 * EMBEDDINGS SUMMARY:
 *
 * WHAT ARE EMBEDDINGS:
 * - Vector representations of text
 * - Similar texts have similar vectors
 * - Enable semantic search and retrieval
 *
 * PROVIDER OPTIONS:
 * - Voyage AI (Anthropic recommended)
 * - OpenAI embeddings
 * - Cohere embeddings
 * - Open-source models (sentence-transformers)
 *
 * VOYAGE AI MODELS:
 * - voyage-3-large: Best quality
 * - voyage-3.5: Balanced
 * - voyage-code-3: Code-specific
 * - voyage-law-2, voyage-finance-2: Domain-specific
 *
 * RAG PATTERN:
 * 1. Index: Embed documents → Store in vector DB
 * 2. Query: Embed question → Find similar docs
 * 3. Generate: Send docs + question to Claude
 *
 * BEST PRACTICES:
 * - Always specify input_type ("query" or "document")
 * - Use domain-specific models when available
 * - Chunk long documents appropriately
 * - Use a vector database for production scale
 * - Include metadata for filtering
 *
 * VECTOR DATABASES:
 * - Pinecone: Managed, easy, scalable
 * - Weaviate: Open-source, hybrid search
 * - pgvector: PostgreSQL extension
 * - ChromaDB: Good for prototyping
 *
 * KEY TAKEAWAYS:
 * 1. Anthropic doesn't have embeddings - use Voyage AI
 * 2. Embeddings enable semantic search over your data
 * 3. RAG combines retrieval with Claude for knowledge-grounded answers
 * 4. Always use input_type for queries vs documents
 * 5. Choose vector DB based on scale and requirements
 *
 * NEXT: Lesson 29 covers the Files API for persistent file storage
 */
