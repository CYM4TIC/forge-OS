import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// ── Types matching Rust structs ──

export interface SessionRow {
  id: string;
  title: string;
  agent_id: string | null;
  provider_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string | null;
  provider: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  status: string;
  created_at: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  supports_streaming: boolean;
  max_context: number;
  is_default: boolean;
}

export interface AgentInfo {
  slug: string;
  name: string;
  description: string;
  file_path: string;
}

export interface StreamEvent {
  session_id: string;
  message_id: string;
  delta: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  done: boolean;
}

export type CapabilityTier = 'high' | 'medium' | 'fast';

// ── Session commands ──

export function listSessions(): Promise<SessionRow[]> {
  return invoke('list_sessions');
}

export function getSession(id: string): Promise<SessionRow | null> {
  return invoke('get_session', { id });
}

export function createSession(title?: string): Promise<SessionRow> {
  return invoke('create_session', { title });
}

export function deleteSession(id: string): Promise<void> {
  return invoke('delete_session', { id });
}

// ── Chat commands ──

export function listMessages(sessionId: string): Promise<MessageRow[]> {
  return invoke('list_messages', { sessionId });
}

export function sendMessage(request: {
  session_id: string;
  content: string;
  provider_id?: string;
  tier?: CapabilityTier;
}): Promise<void> {
  return invoke('send_message', { request });
}

// ── Provider commands ──

export function listProviders(): Promise<ProviderInfo[]> {
  return invoke('list_providers');
}

export function setDefaultProvider(providerId: string): Promise<boolean> {
  return invoke('set_default_provider', { providerId });
}

// ── Agent commands ──

export function listAgents(agentsDir?: string): Promise<AgentInfo[]> {
  return invoke('list_agents', { agentsDir });
}

// ── Event listeners ──

export function onChatStream(
  callback: (event: StreamEvent) => void,
): Promise<UnlistenFn> {
  return listen<StreamEvent>('chat:stream', (e) => callback(e.payload));
}
