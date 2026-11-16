export const EMBEDDING_MODEL_ALLOWLIST = ["text-embedding-3-small"] as const;
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_BATCH_SIZE = 64;
export const EMBEDDING_TIMEOUT_MS = 15_000;
export const EMBEDDING_MAX_RETRIES = 2;
export const MAX_CHUNKS_PER_INDEX_BUILD = 1_000;
export const INDEX_TOKEN_CONFIRMATION_THRESHOLD = 50_000;
export const INDEX_TOKEN_ESTIMATE_CALIBRATION_SAMPLE = {
  rawEstimatedTokens: 192,
  providerReportedTokens: 290,
} as const;
export const INDEX_TOKEN_ESTIMATE_CALIBRATION_FACTOR =
  INDEX_TOKEN_ESTIMATE_CALIBRATION_SAMPLE.providerReportedTokens /
  INDEX_TOKEN_ESTIMATE_CALIBRATION_SAMPLE.rawEstimatedTokens;
export const RAG_MAX_CANDIDATES = 10;
export const RAG_MAX_SNIPPETS = 5;
export const RAG_MAX_RETRIEVAL_HITS = 100;
export const RAG_MAX_RERANK_CANDIDATES = 20;
export const RAG_MAX_VECTOR_DISTANCE = 1.1;
export const RAG_MIN_LEXICAL_SCORE = 0.05;

export const SUPPORTED_NODE_MINIMUM = "24.15.0";
