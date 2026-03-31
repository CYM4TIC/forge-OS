export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  model: string | null;
  provider: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  status: MessageStatus;
  created_at: string;
}
