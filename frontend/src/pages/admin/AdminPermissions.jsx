import { useState } from 'react';
import { useDocumentLibraryViewModel } from '../../viewmodels/useDocumentLibraryViewModel.js';
import { usePermissionsViewModel } from '../../viewmodels/usePermissionsViewModel.js';
import PermissionMatrixCell from '../../components/composite/PermissionMatrixCell.jsx';
import Button from '../../components/foundations/Button.jsx';

const ROLES = ['employee', 'manager', 'admin'];

/**
 * Simplified matrix: shows the explicit role-level overrides per document.
 * A real implementation would also blend in the *default* (department + role)
 * visibility from permissionService so the matrix reflects the full picture,
 * not just overrides — left as a clear next step for whoever picks this up,
 * flagged directly rather than silently approximated.
 */
export default function AdminPermissions() {
  const { documents } = useDocumentLibraryViewModel();
  const [selectedDocId, setSelectedDocId] = useState(null);
  const { grants, grant, revoke } = usePermissionsViewModel(selectedDocId);

  function levelFor(role) {
    const found = grants.find((g) => g.grantType === 'role' && g.role === role);
    return found ? found.accessLevel : 'none';
  }

  async function cycle(role) {
    const current = levelFor(role);
    const next = current === 'none' ? 'view' : current === 'view' ? 'cite' : 'none';
    const existing = grants.find((g) => g.grantType === 'role' && g.role === role);
    if (existing) await revoke(existing._id);
    if (next !== 'none') await grant({ grantType: 'role', role, accessLevel: next });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Permissions matrix</h1>
        <p className="text-ink-muted text-[13.5px] mt-1.5">
          Select a document, then click a role's cell to cycle: none → view → view + cite.
        </p>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        <div className="flex flex-col gap-1">
          {documents.map((doc) => (
            <Button
              key={doc._id}
              variant={selectedDocId === doc._id ? 'primary' : 'secondary'}
              className="justify-start !text-left"
              onClick={() => setSelectedDocId(doc._id)}
            >
              {doc.originalName}
            </Button>
          ))}
        </div>

        <div>
          {!selectedDocId ? (
            <div className="border border-dashed border-line rounded-component p-10 text-center text-ink-muted text-sm">
              Select a document on the left to view and edit its permissions.
            </div>
          ) : (
            <div className="border border-line rounded-component overflow-hidden grid" style={{ gridTemplateColumns: `repeat(${ROLES.length}, 1fr)` }}>
              {ROLES.map((role) => (
                <div key={role} className="bg-surface font-bold text-xs p-2.5 text-center border-r border-b border-line capitalize">
                  {role}
                </div>
              ))}
              {ROLES.map((role) => (
                <PermissionMatrixCell key={role} accessLevel={levelFor(role)} onChange={() => cycle(role)} isOverride={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
