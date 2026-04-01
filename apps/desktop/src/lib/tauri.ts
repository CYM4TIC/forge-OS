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

// ── Dispatch types ──

export type AgentStatus = 'queued' | 'running' | 'complete' | 'error' | 'timeout' | 'cancelled';

export interface AgentSummary {
  dispatch_id: string;
  agent_slug: string;
  status: AgentStatus;
  elapsed_ms: number;
}

export interface AgentResult {
  dispatch_id: string;
  agent_slug: string;
  content: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  duration_ms: number;
  status: AgentStatus;
  error: string | null;
}

export interface DispatchRequest {
  agent_slug: string;
  system_prompt: string;
  dynamic_context?: string;
  messages?: { role: string; content: string }[];
  tier?: string;
  provider_id?: string;
  timeout_ms?: number;
}

// ── Dispatch commands ──

export function dispatchAgent(request: DispatchRequest): Promise<string> {
  return invoke('dispatch_agent', { request });
}

export function getAgentStatus(dispatchId: string): Promise<AgentStatus | null> {
  return invoke('get_agent_status', { dispatchId });
}

export function listActiveAgents(): Promise<AgentSummary[]> {
  return invoke('list_active_agents');
}

export function cancelAgent(dispatchId: string): Promise<boolean> {
  return invoke('cancel_agent', { dispatchId });
}

// ── Event listeners ──

export function onChatStream(
  callback: (event: StreamEvent) => void,
): Promise<UnlistenFn> {
  return listen<StreamEvent>('chat:stream', (e) => callback(e.payload));
}

export function onAgentResult(
  callback: (result: AgentResult) => void,
): Promise<UnlistenFn> {
  return listen<AgentResult>('agent:result', (e) => callback(e.payload));
}

// ── Swarm types ──

export interface SwarmMessage {
  id: string;
  from_agent: string;
  to_agent: string;
  msg_type: 'permission_request' | 'permission_response' | 'idle_notification' | 'shutdown_signal' | 'direct_message';
  payload: string;
  is_read: boolean;
  created_at: string;
}

export interface SwarmMessageEvent {
  message: SwarmMessage;
}

export interface PermissionRequestPayload {
  action: string;
  target: string;
  reason: string;
  is_destructive: boolean;
}

export interface PermissionResponsePayload {
  request_id: string;
  approved: boolean;
  reason: string | null;
}

// ── Swarm commands ──

export function swarmSend(request: {
  from_agent: string;
  to_agent: string;
  msg_type: string;
  payload?: string;
}): Promise<string> {
  return invoke('swarm_send', { request });
}

export function swarmGetMessages(request: {
  to_agent: string;
  unread_only?: boolean;
  limit?: number;
}): Promise<SwarmMessage[]> {
  return invoke('swarm_get_messages', { request });
}

export function swarmMarkRead(messageId: string): Promise<void> {
  return invoke('swarm_mark_read', { messageId });
}

export function swarmRespondPermission(request: {
  request_id: string;
  responder_agent: string;
  approved: boolean;
  reason?: string;
}): Promise<string> {
  return invoke('swarm_respond_permission', { request });
}

// ── Swarm event listeners ──

export function onSwarmMessage(
  callback: (event: SwarmMessageEvent) => void,
): Promise<UnlistenFn> {
  return listen<SwarmMessageEvent>('swarm-message', (e) => callback(e.payload));
}

// ── Memory types ──

export interface MemoryLogEntry {
  id: string;
  persona_id: string;
  memory_type: string;
  content: string;
  log_date: string;
  created_at: string;
}

export interface DreamStatus {
  is_running: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  sessions_since_last: number;
  can_trigger: boolean;
  cooldown_remaining_hours: number | null;
}

export interface DreamResult {
  run_id: string;
  topics_created: number;
  topics_updated: number;
  topics_pruned: number;
  logs_processed: number;
  memory_index: string;
}

// ── Memory commands ──

export function appendMemory(request: {
  persona_id: string;
  memory_type: string;
  content: string;
  log_date?: string;
}): Promise<string> {
  return invoke('append_memory', { request });
}

export function queryMemory(request: {
  persona_id?: string;
  memory_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}): Promise<MemoryLogEntry[]> {
  return invoke('query_memory', { request });
}

export function getMemoryIndex(): Promise<string> {
  return invoke('get_memory_index');
}

export function getDailyLog(logDate: string): Promise<MemoryLogEntry[]> {
  return invoke('get_daily_log', { logDate });
}

export function triggerDream(): Promise<DreamResult> {
  return invoke('trigger_dream');
}

export function getDreamStatus(): Promise<DreamStatus> {
  return invoke('get_dream_status');
}

// ── Compact types ──

export type UsageZone = 'comfortable' | 'warning' | 'critical' | 'compacting';

export interface ThresholdStatus {
  current_tokens: number;
  context_window_size: number;
  usage_fraction: number;
  should_compact: boolean;
  threshold: number;
  zone: UsageZone;
}

export type CompactionVariant = 'base' | 'partial' | 'partial_up_to';

export interface CompactionSummary {
  id: string;
  session_id: string;
  variant: CompactionVariant;
  prompt: string;
  content: string;
  token_count: number | null;
}

export interface TriggerCompactResponse {
  summary_id: string;
  summary_prompt: string;
  conversation_tokens: number;
}

// ── Compact commands ──

export function getContextUsage(request: {
  content: string;
  context_window_size?: number;
}): Promise<ThresholdStatus> {
  return invoke('get_context_usage', { request });
}

export function triggerCompact(request: {
  session_id: string;
  messages: { role: string; content: string }[];
  variant?: string;
  context_window_size?: number;
}): Promise<TriggerCompactResponse> {
  return invoke('trigger_compact', { request });
}

export function storeCompactResult(request: {
  summary_id: string;
  session_id: string;
  content: string;
  variant?: string;
}): Promise<void> {
  return invoke('store_compact_result', { request });
}

export function getLastSummary(sessionId: string): Promise<CompactionSummary | null> {
  return invoke('get_last_summary', { sessionId });
}
