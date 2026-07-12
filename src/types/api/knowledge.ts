export interface KnowledgeSource {
  id: string;
  workspace_id: string;
  bot_id: string | null;
  name: string;
  type: string;
  status: string;
  source_url: string | null;
  chunk_count: number;
  metadata?: KnowledgeSourceMetadata | null;
  created_at: string;
  updated_at: string;
  chunks?: KnowledgeChunk[];
}

export interface KnowledgeSourceMetadata {
  error?: string;
  failed_at?: string;
  indexed_at?: string;
  content_length?: number;
  pages_found?: number;
  pages_indexed?: number;
  crawl_errors?: string[];
}

export interface KnowledgeChunk {
  id: string;
  content: string;
  position: number;
  token_count: number;
}
