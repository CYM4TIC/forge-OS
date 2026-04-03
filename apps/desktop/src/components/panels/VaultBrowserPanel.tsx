/**
 * VaultBrowserPanel — File tree + content preview for vault navigation.
 * Left: DOM tree view (collapsible folders, file icons, search filter).
 * Right: Content preview (monospace text with syntax-aware rendering).
 *
 * OS-ADL-002: DOM for interaction (tree), presentation for content preview.
 * Uses ResizeObserver for responsive split ratio.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { listVaultTree, readVaultFile } from '../../lib/tauri';
import type { VaultTreeNode } from '../../lib/tauri';
import { CANVAS, STATUS, RADIUS, FONT } from '@forge-os/canvas-components';

// ─── Styles (canvas-tokens, no Tailwind — RIVEN-HIGH-1 pattern) ────────────

const PANEL_SHELL: React.CSSProperties = {
  display: 'flex',
  height: '100%',
  background: CANVAS.bg,
  borderRadius: RADIUS.card,
  border: `1px solid ${CANVAS.border}`,
  overflow: 'hidden',
};

const TREE_PANE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  borderRight: `1px solid ${CANVAS.border}`,
  overflow: 'hidden',
};

const PREVIEW_PANE: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minWidth: 0,
};

const SEARCH_INPUT: React.CSSProperties = {
  background: CANVAS.bgElevated,
  border: `1px solid ${CANVAS.border}`,
  borderRadius: RADIUS.pill,
  color: CANVAS.text,
  fontSize: 12,
  padding: '4px 8px',
  margin: 8,
  outline: 'none',
  width: 'calc(100% - 16px)',
};

const TREE_SCROLL: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '0 4px 8px',
};

const PREVIEW_HEADER: React.CSSProperties = {
  padding: '6px 12px',
  borderBottom: `1px solid ${CANVAS.border}`,
  fontSize: 11,
  color: CANVAS.label,
  fontFamily: FONT.mono,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const PREVIEW_CONTENT: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 12,
  fontFamily: FONT.mono,
  fontSize: 12,
  lineHeight: 1.5,
  color: CANVAS.text,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  tabSize: 2,
};

const CENTER_STATE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: CANVAS.muted,
  fontSize: 12,
};

// R-3: Static base styles extracted from per-render nodeStyle
const TREE_ITEM_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 4px',
  cursor: 'pointer',
  borderRadius: 3,
  fontSize: 12,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  outline: 'none',
};

const NARROW_THRESHOLD = 500;

// ─── File Icons ─────────────────────────────────────────────────────────────

function fileIcon(name: string, isDir: boolean): string {
  if (isDir) return '📁';
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md': return '📄';
    case 'json': return '⚙️';
    case 'ts': case 'tsx': return '🔷';
    case 'rs': return '🦀';
    case 'toml': case 'yaml': case 'yml': return '📋';
    case 'css': return '🎨';
    case 'sql': return '🗃️';
    default: return '📄';
  }
}

// ─── Tree Node Component ────────────────────────────────────────────────────

interface TreeNodeProps {
  node: VaultTreeNode;
  depth: number;
  selectedPath: string | null;
  focusedPath: string | null;
  expandedPaths: Set<string>;
  filter: string;
  vaultRoot: string;
  firstVisiblePath: string | null;
  onSelect: (node: VaultTreeNode) => void;
  onToggleExpand: (path: string) => void;
}

function TreeNode({ node, depth, selectedPath, focusedPath, firstVisiblePath, expandedPaths, filter, vaultRoot, onSelect, onToggleExpand }: TreeNodeProps) {
  const expanded = expandedPaths.has(node.path);
  const itemRef = useRef<HTMLDivElement>(null);

  // Filter: show node if name matches or any descendant matches
  const matchesFilter = useMemo(() => {
    if (!filter) return true;
    const lower = filter.toLowerCase();
    if (node.name.toLowerCase().includes(lower)) return true;
    if (node.is_dir) return hasMatchingDescendant(node, lower);
    return false;
  }, [node, filter]);

  // Roving tabIndex: focused node gets 0, first visible gets 0 as fallback, rest get -1
  const isFocused = focusedPath === node.path || (!focusedPath && firstVisiblePath === node.path);
  useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.focus({ preventScroll: false });
    }
  }, [isFocused]);

  if (!matchesFilter) return null;

  const isSelected = selectedPath === node.path;
  const icon = fileIcon(node.name, node.is_dir);

  const nodeStyle: React.CSSProperties = {
    ...TREE_ITEM_BASE,
    paddingLeft: depth * 16 + 4,
    color: isSelected ? CANVAS.text : CANVAS.label,
    background: isSelected ? `${STATUS.accent}20` : 'transparent',
  };

  const handleClick = () => {
    if (node.is_dir) {
      onToggleExpand(node.path);
    } else {
      onSelect(node);
    }
  };

  return (
    <>
      <div
        ref={itemRef}
        role="treeitem"
        aria-expanded={node.is_dir ? expanded : undefined}
        aria-selected={isSelected}
        tabIndex={isFocused ? 0 : -1}
        data-path={node.path}
        style={nodeStyle}
        onClick={handleClick}
      >
        {node.is_dir && (
          <span style={{ fontSize: 10, color: CANVAS.muted, width: 12, textAlign: 'center' }} aria-hidden="true">
            {expanded ? '\u25BC' : '\u25B6'}
          </span>
        )}
        {!node.is_dir && <span style={{ width: 12 }} />}
        <span aria-hidden="true">{icon}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
      </div>
      {node.is_dir && expanded && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              focusedPath={focusedPath}
              firstVisiblePath={firstVisiblePath}
              expandedPaths={expandedPaths}
              filter={filter}
              vaultRoot={vaultRoot}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </>
  );
}

function hasMatchingDescendant(node: VaultTreeNode, filter: string): boolean {
  for (const child of node.children) {
    if (child.name.toLowerCase().includes(filter)) return true;
    if (child.is_dir && hasMatchingDescendant(child, filter)) return true;
  }
  return false;
}

/** Flatten visible nodes in DOM order for roving tabIndex navigation (M-1 HIGH).
 * Only includes nodes whose ancestors are expanded and that match the filter. */
function flattenVisible(
  nodes: VaultTreeNode[],
  expandedPaths: Set<string>,
  filter: string,
): VaultTreeNode[] {
  const result: VaultTreeNode[] = [];
  const lower = filter.toLowerCase();

  function walk(list: VaultTreeNode[]) {
    for (const node of list) {
      // Check filter match
      if (lower) {
        const nameMatch = node.name.toLowerCase().includes(lower);
        const descendantMatch = node.is_dir && hasMatchingDescendant(node, lower);
        if (!nameMatch && !descendantMatch) continue;
      }
      result.push(node);
      if (node.is_dir && expandedPaths.has(node.path)) {
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return result;
}

/** Find the parent path of a node in the tree. */
function findParentPath(nodes: VaultTreeNode[], targetPath: string): string | null {
  function search(list: VaultTreeNode[], parentPath: string | null): string | null {
    for (const node of list) {
      if (node.path === targetPath) return parentPath;
      if (node.is_dir) {
        const found = search(node.children, node.path);
        if (found !== undefined && found !== null) return found;
      }
    }
    return null;
  }
  return search(nodes, null);
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface VaultBrowserPanelProps {
  /** Path to the vault directory. Defaults to current project vault. */
  vaultPath?: string;
}

export default function VaultBrowserPanel({ vaultPath }: VaultBrowserPanelProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tree, setTree] = useState<VaultTreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<VaultTreeNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [contentLoading, setContentLoading] = useState(false);

  // M-1 HIGH: Roving tabIndex state — lifted to parent for flat navigation
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const typeAheadRef = useRef('');
  const typeAheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load vault tree
  useEffect(() => {
    if (!vaultPath) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listVaultTree(vaultPath)
      .then((nodes) => { setTree(nodes); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [vaultPath]);

  // Load file content when selection changes
  const handleSelect = useCallback((node: VaultTreeNode) => {
    if (node.is_dir) return;
    setSelectedFile(node);
    setContentLoading(true);
    // Pass vault root + relative path — Rust canonicalizes and verifies containment (P-1)
    readVaultFile(vaultPath ?? '', node.path)
      .then((content) => { setFileContent(content); setContentLoading(false); })
      .catch((e) => { setFileContent(`Error: ${e}`); setContentLoading(false); });
  }, [vaultPath]);

  // M-1 HIGH: Auto-expand root-level dirs on initial load
  useEffect(() => {
    if (tree.length > 0 && expandedPaths.size === 0) {
      const rootDirs = tree.filter((n) => n.is_dir).map((n) => n.path);
      setExpandedPaths(new Set(rootDirs));
    }
  }, [tree]);

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

  // Flat visible nodes for keyboard navigation
  const visibleNodes = useMemo(() => flattenVisible(tree, expandedPaths, filter), [tree, expandedPaths, filter]);

  // M-1 HIGH: Roving tabIndex keyboard handler for tree navigation
  const handleTreeKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (visibleNodes.length === 0) return;

    const currentIndex = focusedPath ? visibleNodes.findIndex((n) => n.path === focusedPath) : -1;
    const current = currentIndex >= 0 ? visibleNodes[currentIndex] : null;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = Math.min(currentIndex + 1, visibleNodes.length - 1);
        setFocusedPath(visibleNodes[next].path);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = Math.max(currentIndex - 1, 0);
        setFocusedPath(visibleNodes[prev].path);
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        if (current?.is_dir) {
          if (!expandedPaths.has(current.path)) {
            // Expand closed directory
            toggleExpand(current.path);
          } else if (current.children.length > 0) {
            // Move to first child
            const firstChild = visibleNodes[currentIndex + 1];
            if (firstChild) setFocusedPath(firstChild.path);
          }
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (current?.is_dir && expandedPaths.has(current.path)) {
          // Collapse open directory
          toggleExpand(current.path);
        } else if (current) {
          // Move to parent
          const parentPath = findParentPath(tree, current.path);
          if (parentPath) setFocusedPath(parentPath);
        }
        break;
      }
      case 'Home': {
        e.preventDefault();
        if (visibleNodes.length > 0) setFocusedPath(visibleNodes[0].path);
        break;
      }
      case 'End': {
        e.preventDefault();
        if (visibleNodes.length > 0) setFocusedPath(visibleNodes[visibleNodes.length - 1].path);
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (current) {
          if (current.is_dir) toggleExpand(current.path);
          else handleSelect(current);
        }
        break;
      }
      default: {
        // Type-ahead: printable single characters focus first matching node
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (typeAheadTimerRef.current) clearTimeout(typeAheadTimerRef.current);
          typeAheadRef.current += e.key.toLowerCase();
          const search = typeAheadRef.current;
          const match = visibleNodes.find((n) => n.name.toLowerCase().startsWith(search));
          if (match) setFocusedPath(match.path);
          typeAheadTimerRef.current = setTimeout(() => { typeAheadRef.current = ''; }, 500);
        }
        break;
      }
    }
  }, [visibleNodes, focusedPath, expandedPaths, tree, toggleExpand, handleSelect]);

  // Tree pane width: 35% of container, min 180px, max 320px
  const isNarrow = dimensions.width > 0 && dimensions.width < NARROW_THRESHOLD;
  const treePaneWidth = isNarrow
    ? Math.max(140, Math.floor(dimensions.width * 0.4))
    : Math.min(320, Math.max(180, Math.floor(dimensions.width * 0.35)));

  if (loading) {
    return (
      <div ref={containerRef} style={{ ...PANEL_SHELL, ...CENTER_STATE }}>
        <span>Loading vault...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div ref={containerRef} style={{ ...PANEL_SHELL, ...CENTER_STATE }}>
        <div style={{ textAlign: 'center', padding: 16 }}>
          <span style={{ color: STATUS.danger, display: 'block', marginBottom: 4 }}>Vault Error</span>
          <span style={{ color: CANVAS.muted, fontSize: 11 }}>{error}</span>
        </div>
      </div>
    );
  }

  if (!vaultPath) {
    return (
      <div ref={containerRef} style={{ ...PANEL_SHELL, ...CENTER_STATE }}>
        <span>No vault path configured</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Vault browser"
      style={PANEL_SHELL}
    >
      {/* Tree Pane */}
      <div style={{ ...TREE_PANE, width: treePaneWidth }}>
        <input
          type="search"
          placeholder="Filter files..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={SEARCH_INPUT}
          aria-label="Filter vault files"
        />
        <div
          style={TREE_SCROLL}
          role="tree"
          aria-label="Vault file tree"
          onKeyDown={handleTreeKeyDown}
          onFocus={(e) => {
            // On focus into tree, sync focusedPath from the focused treeitem
            const path = (e.target as HTMLElement).dataset?.path;
            if (path) {
              setFocusedPath(path);
            } else if (!focusedPath && visibleNodes.length > 0) {
              setFocusedPath(visibleNodes[0].path);
            }
          }}
        >
          {tree.length === 0 ? (
            <div style={{ ...CENTER_STATE, height: 'auto', padding: 16 }}>Empty vault</div>
          ) : (
            tree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                selectedPath={selectedFile?.path ?? null}
                focusedPath={focusedPath}
                firstVisiblePath={visibleNodes[0]?.path ?? null}
                expandedPaths={expandedPaths}
                filter={filter}
                vaultRoot={vaultPath}
                onSelect={handleSelect}
                onToggleExpand={toggleExpand}
              />
            ))
          )}
        </div>
      </div>

      {/* Preview Pane */}
      <div style={PREVIEW_PANE}>
        {selectedFile ? (
          <>
            <div style={PREVIEW_HEADER}>
              {fileIcon(selectedFile.name, false)} {selectedFile.path}
            </div>
            <div style={PREVIEW_CONTENT}>
              {contentLoading ? (
                <span style={{ color: CANVAS.muted }}>Loading...</span>
              ) : (
                fileContent
              )}
            </div>
          </>
        ) : (
          <div style={CENTER_STATE}>
            Select a file to preview
          </div>
        )}
      </div>
    </div>
  );
}
