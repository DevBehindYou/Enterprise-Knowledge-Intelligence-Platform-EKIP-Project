import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, HardDrive } from 'lucide-react';

function TreeNode({ node, currentPath, onNavigate, depth = 0 }) {
  const hasChildren = node.children?.length > 0;
  // Auto-expand along the path to wherever the user currently is.
  const isOnPath = currentPath === node.path || currentPath.startsWith(`${node.path}/`);
  const [isOpen, setIsOpen] = useState(isOnPath);
  const isActive = currentPath === node.path;

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-component text-[13px] cursor-pointer pr-2 py-1.5 ${
          isActive ? 'bg-accent-tint text-accent-dim font-semibold' : 'hover:bg-black/[0.03]'
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((v) => !v);
          }}
          className={`p-0.5 shrink-0 ${hasChildren ? 'text-ink-muted' : 'invisible'}`}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          tabIndex={hasChildren ? 0 : -1}
        >
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <button
          onClick={() => onNavigate(node.path)}
          className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
        >
          {isActive || isOpen ? (
            <FolderOpen size={14} className="text-accent shrink-0" />
          ) : (
            <Folder size={14} className="text-accent shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
      </div>

      {isOpen && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              currentPath={currentPath}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FolderTree({ tree, currentPath, onNavigate }) {
  return (
    <nav className="w-[220px] shrink-0 border-r border-line bg-surface-raised overflow-y-auto p-2.5 hidden lg:block">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted px-1.5 pb-2">Folders</div>

      <button
        onClick={() => onNavigate('')}
        className={`flex items-center gap-1.5 w-full rounded-component text-[13px] px-2 py-1.5 mb-0.5 ${
          currentPath === '' ? 'bg-accent-tint text-accent-dim font-semibold' : 'hover:bg-black/[0.03]'
        }`}
      >
        <HardDrive size={14} className="text-accent shrink-0" />
        All files
      </button>

      {tree?.children?.map((child) => (
        <TreeNode key={child.path} node={child} currentPath={currentPath} onNavigate={onNavigate} />
      ))}

      {tree && !tree.children?.length && (
        <div className="text-[12px] text-ink-muted px-2 py-3">No subfolders yet.</div>
      )}
    </nav>
  );
}
