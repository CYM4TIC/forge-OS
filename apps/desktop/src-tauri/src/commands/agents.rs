use serde::Serialize;
use std::fs;

#[derive(Debug, Serialize)]
pub struct AgentInfo {
    pub slug: String,
    pub name: String,
    pub description: String,
    pub file_path: String,
}

/// Parse frontmatter from a markdown agent file.
/// Expects YAML frontmatter delimited by `---`.
fn parse_agent_frontmatter(content: &str) -> Option<(String, String)> {
    let content = content.trim();
    if !content.starts_with("---") {
        return None;
    }
    let rest = &content[3..];
    let end = rest.find("---")?;
    let frontmatter = &rest[..end];

    let mut name = None;
    let mut description = None;

    for line in frontmatter.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("name:") {
            name = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
        } else if let Some(val) = line.strip_prefix("description:") {
            description = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
        }
    }

    Some((
        name.unwrap_or_default(),
        description.unwrap_or_default(),
    ))
}

#[tauri::command]
pub fn list_agents(agents_dir: Option<String>) -> Result<Vec<AgentInfo>, String> {
    // Default to .claude/agents/ relative to current dir, or accept explicit path
    let dir = agents_dir
        .map(|d| std::path::PathBuf::from(d))
        .unwrap_or_else(|| {
            let mut p = std::env::current_dir().unwrap_or_default();
            p.push(".claude");
            p.push("agents");
            p
        });

    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut agents = Vec::new();

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }

        let slug = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let (name, description) = parse_agent_frontmatter(&content)
            .unwrap_or_else(|| (slug.clone(), String::new()));

        agents.push(AgentInfo {
            slug,
            name: if name.is_empty() {
                path.file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("unknown")
                    .to_string()
            } else {
                name
            },
            description,
            file_path: path.to_string_lossy().to_string(),
        });
    }

    agents.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(agents)
}
