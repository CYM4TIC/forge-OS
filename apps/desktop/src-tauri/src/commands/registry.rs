use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::Mutex;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentCategory {
    Persona,
    Intelligence,
    Orchestrator,
    Utility,
    SubAgent,
    Command,
}

#[derive(Debug, Clone, Serialize)]
pub struct RegistryEntry {
    pub slug: String,
    pub name: String,
    pub description: String,
    pub category: AgentCategory,
    pub tools: Vec<String>,
    pub parent_agent: Option<String>,
    pub file_path: String,
    pub user_invocable: bool,
    pub model: Option<String>,
}

#[derive(Debug, Default)]
pub struct AgentRegistry {
    pub entries: HashMap<String, RegistryEntry>,
    pub orchestrator_members: HashMap<String, Vec<String>>,
    initialized: bool,
}

// ---------------------------------------------------------------------------
// Category classification — hardcoded slug sets from entity inventory
// ---------------------------------------------------------------------------

const PERSONA_SLUGS: &[&str] = &[
    "nyx", "pierce", "mara", "riven", "kehinde",
    "tanaka", "vane", "voss", "calloway", "sable",
];

const INTELLIGENCE_SLUGS: &[&str] = &[
    "scout", "sentinel", "wraith", "meridian", "chronicle",
    "arbiter", "compass", "scribe", "kiln", "beacon",
];

const ORCHESTRATOR_SLUGS: &[&str] = &[
    "triad", "systems-triad", "strategy-triad", "gate-runner",
    "council", "decision-council", "debate", "full-audit",
    "launch-sequence", "postmortem",
];

fn classify_agent(slug: &str) -> AgentCategory {
    if PERSONA_SLUGS.contains(&slug) {
        AgentCategory::Persona
    } else if INTELLIGENCE_SLUGS.contains(&slug) {
        AgentCategory::Intelligence
    } else if ORCHESTRATOR_SLUGS.contains(&slug) {
        AgentCategory::Orchestrator
    } else {
        AgentCategory::Utility
    }
}

// ---------------------------------------------------------------------------
// Orchestrator member mapping — which agents compose each orchestrator
// ---------------------------------------------------------------------------

fn build_orchestrator_members() -> HashMap<String, Vec<String>> {
    let mut map = HashMap::new();
    map.insert("triad".into(), vec!["pierce".into(), "mara".into(), "riven".into()]);
    map.insert("systems-triad".into(), vec!["kehinde".into(), "tanaka".into(), "kiln".into()]);
    map.insert("strategy-triad".into(), vec!["calloway".into(), "vane".into(), "voss".into()]);
    map.insert("council".into(), PERSONA_SLUGS.iter().map(|s| s.to_string()).collect());
    map.insert("decision-council".into(), vec![
        "pierce".into(), "kehinde".into(), "tanaka".into(),
        "mara".into(), "arbiter".into(),
    ]);
    map.insert("full-audit".into(), vec![
        "pierce".into(), "tanaka".into(), "mara".into(),
        "riven".into(), "kehinde".into(),
    ]);
    map
}

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------

struct ParsedFrontmatter {
    name: String,
    description: String,
    model: Option<String>,
    tools: Vec<String>,
    user_invocable: bool,
}

fn parse_frontmatter(content: &str) -> Option<ParsedFrontmatter> {
    let content = content.trim();
    if !content.starts_with("---") {
        return None;
    }
    let rest = &content[3..];
    let end = rest.find("---")?;
    let fm_block = &rest[..end];

    let mut name = None;
    let mut description = None;
    let mut model = None;
    let mut tools = Vec::new();
    let mut user_invocable = false;

    for line in fm_block.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("name:") {
            name = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
        } else if let Some(val) = line.strip_prefix("description:") {
            description = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
        } else if let Some(val) = line.strip_prefix("model:") {
            let v = val.trim().trim_matches('"').trim_matches('\'').to_string();
            if !v.is_empty() {
                model = Some(v);
            }
        } else if let Some(val) = line.strip_prefix("tools:") {
            tools = val
                .trim()
                .split(',')
                .map(|t| t.trim().trim_matches('"').trim_matches('\'').to_string())
                .filter(|t| !t.is_empty())
                .collect();
        } else if let Some(val) = line.strip_prefix("user_invocable:") {
            user_invocable = val.trim() == "true";
        }
    }

    Some(ParsedFrontmatter {
        name: name.unwrap_or_default(),
        description: description.unwrap_or_default(),
        model,
        tools,
        user_invocable,
    })
}

/// Extract the markdown body (everything after frontmatter).
fn extract_body(content: &str) -> String {
    let content = content.trim();
    if !content.starts_with("---") {
        return content.to_string();
    }
    let rest = &content[3..];
    if let Some(end) = rest.find("---") {
        rest[end + 3..].trim().to_string()
    } else {
        content.to_string()
    }
}

// ---------------------------------------------------------------------------
// Directory scanning
// ---------------------------------------------------------------------------

/// Derive sub-agent parent from filename prefix convention.
/// `mara-mobile.md` → parent `mara`, `beacon-error-watch.md` → parent `beacon`.
fn derive_parent(slug: &str) -> Option<String> {
    // Try longest known parent first (e.g., "decision-council" before "decision")
    // Check persona slugs, then intelligence slugs
    let all_parents: Vec<&str> = PERSONA_SLUGS
        .iter()
        .chain(INTELLIGENCE_SLUGS.iter())
        .chain(ORCHESTRATOR_SLUGS.iter())
        .copied()
        .collect();

    // Sort by length descending to match longest prefix first
    let mut sorted = all_parents;
    sorted.sort_by(|a, b| b.len().cmp(&a.len()));

    for parent in sorted {
        if slug.starts_with(parent) && slug.len() > parent.len() {
            let remainder = &slug[parent.len()..];
            if remainder.starts_with('-') {
                return Some(parent.to_string());
            }
        }
    }
    None
}

fn scan_directory(
    dir: &Path,
    category: AgentCategory,
    cwd: &Path,
) -> Vec<RegistryEntry> {
    let mut entries = Vec::new();

    let read_dir = match fs::read_dir(dir) {
        Ok(rd) => rd,
        Err(_) => return entries,
    };

    for entry in read_dir.flatten() {
        let path = entry.path();

        // Skip directories
        if path.is_dir() {
            continue;
        }

        // Only .md files
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }

        // Path traversal guard
        let canonical = match path.canonicalize() {
            Ok(c) => c,
            Err(_) => continue,
        };
        let canonical_cwd = match cwd.canonicalize() {
            Ok(c) => c,
            Err(_) => continue,
        };
        if !canonical.starts_with(&canonical_cwd) {
            continue;
        }

        let slug = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        let content = match fs::read_to_string(&canonical) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let fm = parse_frontmatter(&content);

        // Determine actual category for agents/ entries
        let resolved_category = match &category {
            AgentCategory::SubAgent => AgentCategory::SubAgent,
            AgentCategory::Command => AgentCategory::Command,
            _ => classify_agent(&slug),
        };

        // Parent derivation for sub-agents
        let parent_agent = if resolved_category == AgentCategory::SubAgent {
            derive_parent(&slug)
        } else {
            None
        };

        let entry = RegistryEntry {
            name: fm.as_ref()
                .map(|f| f.name.clone())
                .filter(|n| !n.is_empty())
                .unwrap_or_else(|| slug.clone()),
            description: fm.as_ref()
                .map(|f| f.description.clone())
                .unwrap_or_default(),
            model: fm.as_ref().and_then(|f| f.model.clone()),
            tools: fm.as_ref()
                .map(|f| f.tools.clone())
                .unwrap_or_default(),
            user_invocable: fm.as_ref()
                .map(|f| f.user_invocable)
                .unwrap_or(false),
            category: resolved_category,
            parent_agent,
            file_path: canonical.to_string_lossy().to_string(),
            slug,
        };

        entries.push(entry);
    }

    entries
}

/// Full scan of all agent directories. Returns populated AgentRegistry.
pub fn scan_agents(base_path: &Path) -> AgentRegistry {
    let agents_dir = base_path.join("agents");
    let sub_agents_dir = agents_dir.join("sub-agents");
    let commands_dir = base_path.join("commands");

    let mut all_entries = Vec::new();

    // Scan agents/ (Persona/Intelligence/Orchestrator/Utility — classified per slug)
    all_entries.extend(scan_directory(&agents_dir, AgentCategory::Utility, base_path));

    // Scan agents/sub-agents/
    all_entries.extend(scan_directory(&sub_agents_dir, AgentCategory::SubAgent, base_path));

    // Scan commands/
    all_entries.extend(scan_directory(&commands_dir, AgentCategory::Command, base_path));

    let mut entries = HashMap::new();
    for entry in all_entries {
        entries.insert(entry.slug.clone(), entry);
    }

    AgentRegistry {
        entries,
        orchestrator_members: build_orchestrator_members(),
        initialized: true,
    }
}

// ---------------------------------------------------------------------------
// Managed state wrapper
// ---------------------------------------------------------------------------

pub type RegistryState = Arc<Mutex<AgentRegistry>>;

/// Resolve the repo base path from CWD.
fn repo_base_path() -> PathBuf {
    std::env::current_dir().unwrap_or_default()
}

/// Lazy-init: if registry is empty, run a full scan.
async fn ensure_initialized(registry: &Mutex<AgentRegistry>) {
    let mut reg = registry.lock().await;
    if !reg.initialized {
        let base = repo_base_path();
        *reg = scan_agents(&base);
    }
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// Returns the full agent registry. Lazy-initializes on first call.
#[tauri::command]
pub async fn get_agent_registry(
    registry: tauri::State<'_, RegistryState>,
) -> Result<Vec<RegistryEntry>, String> {
    ensure_initialized(&registry).await;
    let reg = registry.lock().await;
    let mut entries: Vec<RegistryEntry> = reg.entries.values().cloned().collect();
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(entries)
}

/// Returns the full markdown body (after frontmatter) for a given agent slug.
/// Used for system prompt construction.
#[tauri::command]
pub async fn get_agent_content(
    slug: String,
    registry: tauri::State<'_, RegistryState>,
) -> Result<String, String> {
    ensure_initialized(&registry).await;
    let reg = registry.lock().await;

    let entry = reg.entries.get(&slug)
        .ok_or_else(|| format!("Agent '{}' not found in registry", slug))?;

    let content = fs::read_to_string(&entry.file_path)
        .map_err(|e| format!("Failed to read agent file: {}", e))?;

    Ok(extract_body(&content))
}

/// Force a full rescan of the registry. Called when agent files change
/// or connectivity status changes.
#[tauri::command]
pub async fn refresh_registry(
    registry: tauri::State<'_, RegistryState>,
) -> Result<usize, String> {
    let base = repo_base_path();
    let new_reg = scan_agents(&base);
    let count = new_reg.entries.len();
    let mut reg = registry.lock().await;
    *reg = new_reg;
    Ok(count)
}
