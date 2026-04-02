use serde::Serialize;
use std::path::PathBuf;

/// A node in the vault file tree.
#[derive(Debug, Clone, Serialize)]
pub struct VaultTreeNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<VaultTreeNode>,
}

/// Recursively list the vault directory tree.
/// Returns a tree structure with nested children.
/// Canonicalizes root and rejects symlinks that escape (P-2).
#[tauri::command]
pub fn list_vault_tree(vault_path: String) -> Result<Vec<VaultTreeNode>, String> {
    let root = PathBuf::from(&vault_path)
        .canonicalize()
        .map_err(|e| format!("Invalid vault path {}: {}", vault_path, e))?;
    if !root.is_dir() {
        return Err(format!("Vault path is not a directory: {}", vault_path));
    }
    read_dir_recursive(&root, &root)
}

/// Maximum file size for vault preview (2MB). Files larger than this
/// are rejected to prevent OOM/UI freeze (P-3).
const MAX_VAULT_FILE_SIZE: u64 = 2 * 1024 * 1024;

/// Read file content from the vault.
/// Requires both vault_root and relative file_path. The resolved path
/// is canonicalized and verified to be inside the vault root (P-1: path traversal defense).
#[tauri::command]
pub fn read_vault_file(vault_root: String, file_path: String) -> Result<String, String> {
    let root = PathBuf::from(&vault_root)
        .canonicalize()
        .map_err(|e| format!("Invalid vault root {}: {}", vault_root, e))?;

    let resolved = root.join(&file_path)
        .canonicalize()
        .map_err(|e| format!("File not found {}: {}", file_path, e))?;

    // P-1: Containment check — resolved path must be inside vault root
    if !resolved.starts_with(&root) {
        return Err("Access denied: path escapes vault directory".to_string());
    }

    if !resolved.is_file() {
        return Err(format!("Path is not a file: {}", file_path));
    }

    // P-3: File size guard
    let metadata = std::fs::metadata(&resolved)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    if metadata.len() > MAX_VAULT_FILE_SIZE {
        return Err(format!(
            "File too large for preview ({:.1} MB). Max: {} MB",
            metadata.len() as f64 / 1024.0 / 1024.0,
            MAX_VAULT_FILE_SIZE / 1024 / 1024,
        ));
    }

    std::fs::read_to_string(&resolved)
        .map_err(|e| format!("Failed to read file {}: {}", file_path, e))
}

/// Recursively read a directory, building VaultTreeNode children.
/// Sorts: directories first, then files, both alphabetical.
fn read_dir_recursive(dir: &PathBuf, root: &PathBuf) -> Result<Vec<VaultTreeNode>, String> {
    let mut entries: Vec<VaultTreeNode> = Vec::new();

    let read_dir = std::fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory {:?}: {}", dir, e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/dirs and common non-content directories
        if name.starts_with('.') || name == "node_modules" || name == "target" {
            continue;
        }

        // P-2: Symlink containment — canonicalize and verify inside root
        let canonical = match path.canonicalize() {
            Ok(p) => p,
            Err(_) => continue, // Skip unresolvable entries
        };
        if !canonical.starts_with(root) {
            continue; // Symlink escapes vault — skip silently
        }

        let is_dir = canonical.is_dir();
        let rel_path = path.strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string()
            .replace('\\', "/");

        let children = if is_dir {
            read_dir_recursive(&path, root)?
        } else {
            Vec::new()
        };

        entries.push(VaultTreeNode {
            name,
            path: rel_path,
            is_dir,
            children,
        });
    }

    // Sort: directories first, then alphabetical
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}
