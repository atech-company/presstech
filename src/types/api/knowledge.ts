export interface KnowledgeSource {
  id: string;
  workspace_id: string;
  bot_id: string | null;
  name: string;
  type: string;
  status: string;
  source_url: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
  chunks?: KnowledgeChunk[];
}

export interface KnowledgeChunk {
  id: string;
  content: string;
  position: number;
  token_count: number;
}
