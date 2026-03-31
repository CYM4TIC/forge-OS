export type AgentRole =
  | 'orchestrator'
  | 'reviewer'
  | 'intelligence'
  | 'utility'
  | 'sub-agent';

export type AgentStatus = 'idle' | 'active' | 'dispatched' | 'error';

export type CapabilityTier = 'high' | 'medium' | 'fast';

export interface Agent {
  id: string;
  slug: string;
  name: string;
  role: AgentRole;
  description: string;
  model_tier: CapabilityTier;
  status: AgentStatus;
  last_active: string | null;
  metadata: Record<string, unknown>;
}
