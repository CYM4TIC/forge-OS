use serde::Serialize;
use std::fs;

#[derive(Debug, Serialize)]
pub struct AgentInfo {
    pub slug: String,
    pub name: String,
    pub description: String,
    pub model: Option<String>,
    pub file_path: String,
}

/// Parsed frontmatter fields from an agent markdown file.
struct AgentFrontmatter {
    name: String,
    description: String,
    model: Option<String>,
}

fn parse_agent_frontmatter(content: &str) -> Option<AgentFrontmatter> {
    let content = content.trim();
    if !content.starts_with("---") {
        return None;
    }
    let rest = &content[3..];
    let end = rest.find("---")?;
    let frontmatter = &rest[..end];

    let mut name = None;
    let mut description = None;
    let mut model = None;

    for line in frontmatter.lines() {
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
        }
    }

    Some(AgentFrontmatter {
        name: name.unwrap_or_default(),
        description: description.unwrap_or_default(),
        model,
    })
}

/// Known agent directories relative to the app's working directory.
/// The frontend cannot specify arbitrary filesystem paths.
const AGENT_SUBDIRS: &[&str] = &[".claude/agents", "agents"];

#[tauri::command]
pub fn list_agents() -> Result<Vec<AgentInfo>, String> {
    let cwd = std::env::current_dir().unwrap_or_default();
    let mut agents = Vec::new();

    for subdir in AGENT_SUBDIRS {
        let dir = cwd.join(subdir);
        if !dir.exists() {
            continue;
        }

        // Canonicalize and verify the resolved path is under cwd
        let canonical_dir = dir.canonicalize().map_err(|e| e.to_string())?;
        let canonical_cwd = cwd.canonicalize().map_err(|e| e.to_string())?;
        if !canonical_dir.starts_with(&canonical_cwd) {
            continue; // Symlink escape — skip
        }

        let entries = fs::read_dir(&canonical_dir).map_err(|e| e.to_string())?;
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
            let fm = parse_agent_frontmatter(&content);

            agents.push(AgentInfo {
                slug: slug.clone(),
                name: fm.as_ref()
                    .map(|f| f.name.clone())
                    .filter(|n| !n.is_empty())
                    .unwrap_or_else(|| slug.clone()),
                description: fm.as_ref()
                    .map(|f| f.description.clone())
                    .unwrap_or_default(),
                model: fm.as_ref().and_then(|f| f.model.clone()),
                file_path: path.to_string_lossy().to_string(),
            });
        }
    }

    agents.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(agents)
}
