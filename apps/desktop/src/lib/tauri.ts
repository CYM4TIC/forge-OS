import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

/** Whether we're running inside the Tauri runtime (vs. browser-only dev mode) */
export const isTauriRuntime = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

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
  /** Dispatch context for capability resolution (e.g., "action_palette", "gate_review"). */
  dispatch_context?: string;
  /** Explicit capability overrides — takes precedence over dispatch_context. */
  granted_capabilities?: CapabilityFamily[];
}

// ── Dispatch commands ──

export function dispatchAgent(request: DispatchRequest): Promise<string> {
  if (!isTauriRuntime) return Promise.resolve('dev-mode-stub');
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
  if (!isTauriRuntime) return Promise.resolve(() => {});
  return listen<StreamEvent>('chat:stream', (e) => callback(e.payload));
}

export function onAgentResult(
  callback: (result: AgentResult) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime) return Promise.resolve(() => {});
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
  if (!isTauriRuntime) return Promise.resolve('');
  return invoke('swarm_send', { request });
}

export function swarmGetMessages(request: {
  to_agent: string;
  unread_only?: boolean;
  limit?: number;
}): Promise<SwarmMessage[]> {
  if (!isTauriRuntime) return Promise.resolve([]);
  return invoke('swarm_get_messages', { request });
}

export function swarmMarkRead(messageId: string): Promise<void> {
  if (!isTauriRuntime) return Promise.resolve();
  return invoke('swarm_mark_read', { messageId });
}

export function swarmRespondPermission(request: {
  request_id: string;
  responder_agent: string;
  approved: boolean;
  reason?: string;
}): Promise<string> {
  if (!isTauriRuntime) return Promise.resolve('');
  return invoke('swarm_respond_permission', { request });
}

// ── Swarm event listeners ──

export function onSwarmMessage(
  callback: (event: SwarmMessageEvent) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime) return Promise.resolve(() => {});
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

// ── Build State types ──

export interface BatchRow {
  id: string;
  session_id: string | null;
  batch_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  findings_count: number;
  files_modified: string;
  handoff: string | null;
  created_at: string;
}

export interface FindingRow {
  id: string;
  session_id: string | null;
  agent_slug: string;
  severity: string;
  category: string;
  description: string;
  evidence: string | null;
  status: string;
  batch_ref: string | null;
  created_at: string;
}

export interface RiskRow {
  id: string;
  description: string;
  severity: string;
  batch_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface BuildStateOverview {
  batches: BatchRow[];
  open_findings: FindingRow[];
  open_risks: RiskRow[];
  severity_counts: SeverityCounts;
}

// ── Build State commands ──

export function getBuildState(): Promise<BuildStateOverview> {
  return invoke('get_build_state');
}

export function createBatch(request: {
  batch_id: string;
  session_id?: string;
}): Promise<string> {
  return invoke('create_batch', { request });
}

export function completeBatch(request: {
  id: string;
  files_modified: string;
  handoff?: string;
}): Promise<void> {
  return invoke('complete_batch', { request });
}

export function addFinding(request: {
  agent_slug: string;
  severity: string;
  category: string;
  description: string;
  evidence?: string;
  session_id?: string;
  batch_ref?: string;
}): Promise<string> {
  return invoke('add_finding', { request });
}

export function resolveFinding(id: string, status: string): Promise<void> {
  return invoke('resolve_finding', { id, status });
}

export function generateBootMd(): Promise<string> {
  return invoke('generate_boot_md');
}

// ── Team Config types ──

export type AgentType = 'persona' | 'intelligence' | 'orchestrator' | 'utility' | 'sub_agent';
export type PermissionMode = 'read-only' | 'read-write' | 'full';
export type BackendType = 'in-process' | 'subprocess' | 'remote';

export interface TeamMember {
  agent_id: string;
  name: string;
  color: string;
  agent_type: AgentType;
  model: string;
  permission_mode: PermissionMode;
  subscriptions: string[];
  backend_type: BackendType;
  is_active: boolean;
}

export interface TeamFile {
  lead_agent_id: string;
  team_allowed_paths: string[];
  members: TeamMember[];
}

export interface CheckpointRow {
  id: string;
  session_id: string;
  message_count: number;
  last_message_id: string | null;
  context_tokens: number | null;
  checkpoint_data: string;
  created_at: string;
}

export interface ResumeCandidate {
  session_id: string;
  session_title: string;
  message_count: number;
  last_message_id: string | null;
  context_tokens: number | null;
  interrupted_at: string;
}

// ── Team Config commands ──

export function getTeamConfig(): Promise<TeamFile> {
  return invoke('get_team_config');
}

export function updateTeamMember(request: {
  agent_id: string;
  model?: string;
  is_active?: boolean;
  color?: string;
  subscriptions?: string[];
  permission_mode?: PermissionMode;
}): Promise<TeamFile> {
  return invoke('update_team_member', { request });
}

// ── Session Checkpoint commands ──

export function saveCheckpoint(request: {
  session_id: string;
  message_count: number;
  last_message_id?: string;
  context_tokens?: number;
  checkpoint_data: string;
}): Promise<string> {
  return invoke('save_checkpoint', { request });
}

export function getResumeCandidate(): Promise<ResumeCandidate[]> {
  return invoke('get_resume_candidate');
}

export function getCheckpoint(sessionId: string): Promise<CheckpointRow | null> {
  return invoke('get_checkpoint', { sessionId });
}

export function clearCheckpoint(sessionId: string): Promise<void> {
  return invoke('clear_checkpoint', { sessionId });
}

// ── Search (FTS5 cross-session recall) ──

export interface SearchResult {
  content: string;
  role: string;
  session_id: string;
  session_title: string | null;
  created_at: string;
  rank: number;
}

export function searchSessions(query: string, limit?: number): Promise<SearchResult[]> {
  return invoke('search_sessions', { query, limit });
}

// ── Finding Checkout (atomic task checkout for parallel agents) ──

export function checkoutFinding(findingId: string, agentSlug: string): Promise<void> {
  return invoke('checkout_finding', { findingId, agentSlug });
}

export function releaseFinding(findingId: string): Promise<void> {
  return invoke('release_finding', { findingId });
}

// ── Layout Persistence commands ──

export interface SaveLayoutRequest {
  panels_json: string;
  tab_groups_json: string;
  active_preset_id: string | null;
}

export interface LoadLayoutResponse {
  panels_json: string;
  tab_groups_json: string;
  active_preset_id: string | null;
}

export interface PresetRow {
  id: string;
  name: string;
  description: string;
  is_built_in: number;
  panels_json: string;
  created_at: string;
}

export function savePanelLayout(request: SaveLayoutRequest): Promise<void> {
  return invoke('save_panel_layout', { request });
}

export function loadPanelLayout(): Promise<LoadLayoutResponse | null> {
  return invoke('load_panel_layout');
}

export function saveWorkspacePreset(request: {
  id: string;
  name: string;
  description: string;
  is_built_in: boolean;
  panels_json: string;
}): Promise<void> {
  return invoke('save_workspace_preset', { request });
}

export function loadWorkspacePresets(): Promise<PresetRow[]> {
  return invoke('load_workspace_presets');
}

// ── Pop-Out Window commands ──

export interface CreatePanelWindowRequest {
  panel_id: string;
  panel_type: string;
  title: string;
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export interface PanelWindowInfo {
  panel_id: string;
  label: string;
}

export function createPanelWindow(request: CreatePanelWindowRequest): Promise<PanelWindowInfo> {
  return invoke('create_panel_window', { request });
}

export function closePanelWindow(panelId: string): Promise<boolean> {
  return invoke('close_panel_window', { panelId });
}

export function listPanelWindows(): Promise<string[]> {
  return invoke('list_panel_windows');
}

// ── HUD Commands (Phase 5) ──

export interface BuildStateSnapshot {
  project: string;
  architecture: string;
  phase: string;
  current_session: string;
  current_batch: string;
  batches_done: number;
  phases_total: number;
  sessions_total: number;
  last_commit: string;
  last_updated: string;
  phase_complete: boolean;
}

export type StageStatus = 'idle' | 'active' | 'complete' | 'error';

export interface PipelineStage {
  id: string;
  label: string;
  status: StageStatus;
  agent: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export type AgentHudStatus = 'idle' | 'dispatched' | 'running' | 'complete' | 'error';

export interface AgentStatusEvent {
  agent_id: string;
  persona: string;
  status: AgentHudStatus;
  model_tier: string | null;
}

export type FlowType = 'dispatch' | 'findings_return' | 'context_transfer';

export interface DispatchFlowEvent {
  source_agent: string;
  target_agents: string[];
  flow_type: FlowType;
  severity: string | null;
  timestamp: string;
}

export interface HudFinding {
  id: string;
  session_id: string | null;
  batch_id: string | null;
  severity: string;
  persona: string;
  title: string;
  description: string;
  status: string;
  file_path: string | null;
  line_number: number | null;
  created_at: string;
  resolved_at: string | null;
}

export interface FindingResolvedEvent {
  finding_id: string;
  resolved_at: string;
}

export function getBuildStateSnapshot(bootPath: string): Promise<BuildStateSnapshot> {
  return invoke('get_build_state_snapshot', { bootPath });
}

export function getPipelineStages(): Promise<PipelineStage[]> {
  return invoke('get_pipeline_stages');
}

export function refreshBuildState(bootPath: string): Promise<BuildStateSnapshot> {
  return invoke('refresh_build_state', { bootPath });
}

export function updatePipelineStage(stage: PipelineStage): Promise<void> {
  return invoke('update_pipeline_stage', { stage });
}

// ── HUD Findings Commands ──

export interface FindingsFilter {
  session_id?: string | null;
  batch_id?: string | null;
  severity?: string | null;
  persona?: string | null;
  status?: string | null;
}

export type HudSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface HudSeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

export function listHudFindings(filter: FindingsFilter = {}): Promise<HudFinding[]> {
  if (!isTauriRuntime) return Promise.resolve([]);
  return invoke('list_hud_findings', { filter });
}

export function addHudFinding(finding: HudFinding): Promise<HudFinding> {
  if (!isTauriRuntime) return Promise.resolve(finding);
  return invoke('add_hud_finding', { finding });
}

export function resolveHudFinding(findingId: string): Promise<void> {
  if (!isTauriRuntime) return Promise.resolve();
  return invoke('resolve_hud_finding', { findingId });
}

export function getFindingCounts(sessionId?: string | null): Promise<HudSeverityCounts> {
  if (!isTauriRuntime) return Promise.resolve({ critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 });
  return invoke('get_finding_counts', { sessionId: sessionId ?? null });
}

// ── HUD Event Listeners ──

// Rust HudEvent uses #[serde(tag = "type", content = "payload")],
// so the Tauri event payload is { type: string, payload: T }.
interface HudEventEnvelope<T> { type: string; payload: T }

export function onBuildStateChanged(
  callback: (snapshot: BuildStateSnapshot) => void,
): Promise<UnlistenFn> {
  return listen<HudEventEnvelope<BuildStateSnapshot>>('hud:build-state-changed', (e) => callback(e.payload.payload));
}

export function onPipelineStageChanged(
  callback: (stage: PipelineStage) => void,
): Promise<UnlistenFn> {
  return listen<HudEventEnvelope<PipelineStage>>('hud:pipeline-stage-changed', (e) => callback(e.payload.payload));
}

export function onAgentStatusChanged(
  callback: (event: AgentStatusEvent) => void,
): Promise<UnlistenFn> {
  return listen<HudEventEnvelope<AgentStatusEvent>>('hud:agent-status-changed', (e) => callback(e.payload.payload));
}

export function onFindingAdded(
  callback: (finding: HudFinding) => void,
): Promise<UnlistenFn> {
  return listen<HudEventEnvelope<HudFinding>>('hud:finding-added', (e) => callback(e.payload.payload));
}

export function onFindingResolved(
  callback: (event: FindingResolvedEvent) => void,
): Promise<UnlistenFn> {
  return listen<HudEventEnvelope<FindingResolvedEvent>>('hud:finding-resolved', (e) => callback(e.payload.payload));
}

export function onDispatchFlow(
  callback: (event: DispatchFlowEvent) => void,
): Promise<UnlistenFn> {
  return listen<HudEventEnvelope<DispatchFlowEvent>>('hud:dispatch-flow', (e) => callback(e.payload.payload));
}

// ── Vault Browser Commands (P5-N) ──

export interface VaultTreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children: VaultTreeNode[];
}

export function listVaultTree(vaultPath: string): Promise<VaultTreeNode[]> {
  if (!isTauriRuntime) return Promise.resolve([]);
  return invoke('list_vault_tree', { vaultPath });
}

export function readVaultFile(vaultRoot: string, filePath: string): Promise<string> {
  if (!isTauriRuntime) return Promise.resolve('');
  return invoke('read_vault_file', { vaultRoot, filePath });
}

// ── Dialog (P6-D: directory picker for dev server cwd) ──

export async function openDirectoryDialog(): Promise<string | null> {
  if (!isTauriRuntime) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === 'string' ? selected : null;
}

// ── Dev Server Types (P6) ──

export type DevServerStatus = 'starting' | 'running' | 'healthy' | 'degraded' | 'stopped' | 'error';

export interface DevServerInfo {
  id: string;
  command: string;
  args: string[];
  cwd: string;
  pid: number | null;
  port: number | null;
  status: DevServerStatus;
  startedAt: string;
}

export interface LogLine {
  timestamp: string;
  stream: 'stdout' | 'stderr';
  content: string;
}

export interface StatusChangedEvent {
  serverId: string;
  status: DevServerStatus;
  port: number | null;
}

// ── Dev Server Commands (P6) ──

export function startDevServer(command: string, args: string[], cwd: string): Promise<DevServerInfo> {
  if (!isTauriRuntime) return Promise.reject('Not in Tauri runtime');
  return invoke('start_dev_server', { command, args, cwd });
}

export function stopDevServer(serverId: string): Promise<void> {
  if (!isTauriRuntime) return Promise.resolve();
  return invoke('stop_dev_server', { serverId });
}

export function restartDevServer(serverId: string): Promise<DevServerInfo> {
  if (!isTauriRuntime) return Promise.reject('Not in Tauri runtime');
  return invoke('restart_dev_server', { serverId });
}

export function removeDevServer(serverId: string): Promise<void> {
  if (!isTauriRuntime) return Promise.resolve();
  return invoke('remove_dev_server', { serverId });
}

export function listDevServers(): Promise<DevServerInfo[]> {
  if (!isTauriRuntime) return Promise.resolve([]);
  return invoke('list_dev_servers');
}

export function getServerLogs(serverId: string, tail: number): Promise<LogLine[]> {
  if (!isTauriRuntime) return Promise.resolve([]);
  return invoke('get_server_logs', { serverId, tail });
}

export function detectServerPort(serverId: string): Promise<number | null> {
  if (!isTauriRuntime) return Promise.resolve(null);
  return invoke('detect_server_port', { serverId });
}

// ── Dev Server DOM Access (P6-F) ──

export interface DomRequestPayload {
  requestId: string;
  serverId: string;
}

export interface DomResponsePayload {
  requestId: string;
  html: string | null;
  error: string | null;
}

/** Request a DOM snapshot from the preview iframe for a given server. */
export function readPreviewDom(serverId: string): Promise<string | null> {
  if (!isTauriRuntime) return Promise.resolve(null);
  return invoke('read_preview_dom', { serverId });
}

/** Listen for DOM snapshot requests from the backend. */
export function onPreviewDomRequest(
  callback: (payload: DomRequestPayload) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime) return Promise.resolve(() => {});
  return listen<DomRequestPayload>('preview:request-dom', (e) => callback(e.payload));
}

/** Send a DOM snapshot response back to the backend. */
export function respondPreviewDom(response: DomResponsePayload): Promise<void> {
  if (!isTauriRuntime) return Promise.resolve();
  return invoke('preview_dom_response', { response });
}

// ── Dev Server Event Listeners (P6) ──

export function onDevServerStatusChanged(
  callback: (event: StatusChangedEvent) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime) return Promise.resolve(() => {});
  return listen<StatusChangedEvent>('devserver:status-changed', (e) => callback(e.payload));
}

// ── Connectivity Types (P6-H) ──

export type ServiceType = 'github' | 'supabase' | 'cloudflare' | 'stripe' | 'typesense' | 'custom';

export type ServiceStatus = 'healthy' | 'degraded' | 'unreachable' | 'unconfigured';

export interface ServiceHealth {
  serviceName: string;
  serviceType: string;
  status: ServiceStatus;
  lastChecked: string | null;
  latencyMs: number | null;
  details: Record<string, string>;
}

export interface ConnectivityChangedEvent {
  serviceType: string;
  status: ServiceStatus;
}

// ── Connectivity Commands (P6-H) ──

/** Check a single service (live network call, 5s cooldown). */
export function checkService(serviceType: string): Promise<ServiceHealth> {
  if (!isTauriRuntime) return Promise.resolve({
    serviceName: serviceType, serviceType, status: 'unconfigured',
    lastChecked: null, latencyMs: null, details: {},
  });
  return invoke('check_service', { serviceType });
}

/** Check all enabled services (live network calls). */
export function checkAllServices(): Promise<ServiceHealth[]> {
  if (!isTauriRuntime) return Promise.resolve([]);
  return invoke('check_all_services');
}

/** Get cached service status (no network call). */
export function getServiceStatus(): Promise<ServiceHealth[]> {
  if (!isTauriRuntime) return Promise.resolve([]);
  return invoke('get_service_status');
}

/** Update the background polling interval (10-3600 seconds). */
export function setCheckInterval(seconds: number): Promise<void> {
  if (!isTauriRuntime) return Promise.resolve();
  return invoke('set_check_interval', { seconds });
}

// ── Connectivity Event Listeners (P6-H) ──

export function onConnectivityChanged(
  callback: (event: ConnectivityChangedEvent) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime) return Promise.resolve(() => {});
  return listen<ConnectivityChangedEvent>('connectivity:status-changed', (e) => callback(e.payload));
}

// ── Agent Registry Types (P7-E) ──

export type AgentCategory = 'persona' | 'intelligence' | 'orchestrator' | 'utility' | 'sub_agent' | 'command';

export type ReasoningEffort = 'low' | 'medium' | 'high';

export type ModelClass = 'frontier' | 'standard' | 'fast';

export type RoutingRole = 'leader' | 'specialist' | 'executor';

export interface RegistryEntry {
  slug: string;
  name: string;
  description: string;
  category: AgentCategory;
  tools: string[];
  parent_agent: string | null;
  file_path: string;
  user_invocable: boolean;
  model: string | null;
  reasoning_effort: ReasoningEffort;
  model_class: ModelClass;
  routing_role: RoutingRole;
}

export type CommandCategory = 'build' | 'persona' | 'quality' | 'analysis' | 'reporting' | 'operations';

export type AvailabilityCheck =
  | 'git_changes'
  | { mcp_connected: string }
  | { env_var_set: string }
  | 'server_running'
  | 'always';

export interface CommandDef {
  slug: string;
  name: string;
  description: string;
  category: CommandCategory;
  aliases: string[];
  dispatch_target: string;
  available_when: AvailabilityCheck | null;
  keyboard_shortcut: string | null;
}

export type PaletteActionType = 'command' | 'sub_agent' | 'orchestrator';

export interface PaletteAction {
  slug: string;
  name: string;
  description: string;
  action_type: PaletteActionType;
  dispatch_target_slug: string;
}

export interface PaletteResponse {
  individual_actions: PaletteAction[];
  orchestrator_actions: PaletteAction[];
}

export type CapabilityFamily = 'read_only' | 'write_code' | 'write_vault' | 'database' | 'external' | 'destructive';

// ── Agent Registry Commands (P7-E) ──

/** Get all registered agents (cached — fast, no scan). */
export function getAgentRegistry(): Promise<RegistryEntry[]> {
  if (!isTauriRuntime) return Promise.resolve([]);
  return invoke('get_agent_registry');
}

/** Get the markdown body of an agent definition file. */
export function getAgentContent(slug: string): Promise<string> {
  if (!isTauriRuntime) return Promise.resolve('');
  return invoke('get_agent_content', { slug });
}

/** Get all registered slash commands. */
export function getCommandRegistry(): Promise<CommandDef[]> {
  if (!isTauriRuntime) return Promise.resolve([]);
  return invoke('get_command_registry');
}

/** Get palette actions for the given persona selection. */
export function getPaletteActions(selectedSlugs: string[]): Promise<PaletteResponse> {
  if (!isTauriRuntime) return Promise.resolve({ individual_actions: [], orchestrator_actions: [] });
  return invoke('get_palette_actions', { selectedSlugs });
}

/** Route a diff summary to the best review agents. */
export function smartReviewRouting(diffSummary: string): Promise<string[]> {
  if (!isTauriRuntime) return Promise.resolve([]);
  return invoke('smart_review_routing', { diffSummary });
}

/** Specification check result — well-specified or underspecified with suggestion. */
export type SpecificationResult =
  | { status: 'specified' }
  | { status: 'underspecified'; suggestion: string };

/** Check if a dispatch input is well-specified enough to proceed (P7-G underspecification gating). */
export function checkSpecification(input: string): Promise<SpecificationResult> {
  if (!isTauriRuntime) return Promise.resolve({ status: 'specified' });
  return invoke('check_specification', { input });
}

/** Force-rescan the agent registry (triggers file walk), then return fresh entries. */
export async function refreshAgentRegistry(): Promise<RegistryEntry[]> {
  if (!isTauriRuntime) return [];
  await invoke('refresh_registry');
  return invoke('get_agent_registry');
}

/** Listen for agent working state changes (dispatch lifecycle). */
export interface AgentWorkingStateEvent {
  agent_slug: string;
  state: 'idle' | 'streaming' | 'waiting_for_confirmation' | 'executing_tool' | 'compacting';
  dispatch_id: string | null;
}

export function onAgentWorkingStateChanged(
  callback: (event: AgentWorkingStateEvent) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime) return Promise.resolve(() => {});
  return listen<AgentWorkingStateEvent>('agent:working-state-changed', (e) => callback(e.payload));
}

// ── Tool Confirmation Router (P7-H) ──

/** The 9-action confirmation taxonomy (Factory-AI). Tagged union keyed on `type`. */
export type ConfirmationType =
  | { type: 'file_edit'; path: string; diff: string }
  | { type: 'file_create'; path: string }
  | { type: 'shell_exec'; command: string }
  | { type: 'apply_patch'; file_count: number; summary: string }
  | { type: 'mcp_tool'; server: string; tool_name: string }
  | { type: 'ask_user'; question: string }
  | { type: 'exit_spec_mode' }
  | { type: 'propose_mission'; title: string }
  | { type: 'start_mission_run'; mission_id: string };

/** The 7-response outcome taxonomy (Factory-AI). */
export type ConfirmationOutcome =
  | 'proceed_once'
  | 'proceed_always'
  | 'proceed_auto_low'
  | 'proceed_auto_medium'
  | 'proceed_auto_high'
  | 'proceed_edit'
  | 'cancel';

/** A pending confirmation request emitted via dispatch:confirmation-requested. */
export interface ConfirmationRequest {
  id: string;
  confirmation_type: ConfirmationType;
  arguments_summary: string;
  capability_required: CapabilityFamily;
  requesting_persona: string | null;
}

/** Result from check_confirmation_required when confirmation IS needed. */
export interface ConfirmationRequirement {
  capability_required: CapabilityFamily;
  reason: string;
  canonical_key: string;
}

/** Respond to a pending confirmation request. */
export function respondToConfirmation(
  requestId: string,
  outcome: ConfirmationOutcome,
): Promise<boolean> {
  if (!isTauriRuntime) return Promise.resolve(false);
  return invoke('respond_to_confirmation', { requestId, outcome });
}

/** Check if an action requires confirmation. Returns null if no confirmation needed. */
export function checkConfirmationRequired(
  confirmationType: ConfirmationType,
  grantedCapabilities: CapabilityFamily[],
): Promise<ConfirmationRequirement | null> {
  if (!isTauriRuntime) return Promise.resolve(null);
  return invoke('check_confirmation_required', {
    confirmationType,
    grantedCapabilities,
  });
}

/** Listen for confirmation requests from the dispatch pipeline. */
export function onConfirmationRequested(
  callback: (request: ConfirmationRequest) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime) return Promise.resolve(() => {});
  return listen<ConfirmationRequest>('dispatch:confirmation-requested', (e) => callback(e.payload));
}

/** Get the count of pending confirmations. */
export function getPendingConfirmationCount(): Promise<number> {
  if (!isTauriRuntime) return Promise.resolve(0);
  return invoke('get_pending_confirmation_count');
}
