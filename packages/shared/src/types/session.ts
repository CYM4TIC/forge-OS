export type SessionStatus = 'active' | 'archived' | 'deleted';

export interface Session {
  id: string;
  title: string;
  agent_id: string | null;
  provider_id: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}
