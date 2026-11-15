export const EMBEDDING_MODEL_ALLOWLIST = ["text-embedding-3-small"] as const;
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_BATCH_SIZE = 64;
export const EMBEDDING_TIMEOUT_MS = 15_000;
export const EMBEDDING_MAX_RETRIES = 2;
export const MAX_CHUNKS_PER_INDEX_BUILD = 1_000;
export const INDEX_TOKEN_CONFIRMATION_THRESHOLD = 50_000;
export const RAG_MAX_CANDIDATES = 10;
export const RAG_MAX_SNIPPETS = 5;
export const RAG_MAX_RETRIEVAL_HITS = 100;

export const SUPPORTED_NODE_MINIMUM = "24.15.0";
