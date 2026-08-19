import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Mongoose models before importing the service that uses them.
vi.mock('../../src/models/DocumentPermission.js', () => ({
  default: { findOne: vi.fn() },
}));
vi.mock('../../src/models/Document.js', () => ({
  default: { findOne: vi.fn() },
}));

const { permissionService } = await import('../../src/services/permissionService.js');
const DocumentPermission = (await import('../../src/models/DocumentPermission.js')).default;
const Document = (await import('../../src/models/Document.js')).default;

function mockLean(returnValue) {
  return { lean: vi.fn().mockResolvedValue(returnValue) };
}

describe('permissionService.defaultAllowedLevels', () => {
  it('gives employees the narrowest visibility', () => {
    expect(permissionService.defaultAllowedLevels('employee')).toEqual(['public', 'internal']);
  });
  it('gives managers one level further than employees', () => {
    expect(permissionService.defaultAllowedLevels('manager')).toEqual(['public', 'internal', 'confidential']);
  });
  it('gives admins full visibility', () => {
    expect(permissionService.defaultAllowedLevels('admin')).toEqual(['public', 'internal', 'confidential', 'restricted']);
  });
});

describe('permissionService.resolveAccessLevel', () => {
  const baseUser = { id: 'user-1', tenantId: 'tenant-1', role: 'employee', department: 'HR' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns "none" when the document does not exist (or is invisible) for this tenant', async () => {
    Document.findOne.mockReturnValue(mockLean(null));
    const level = await permissionService.resolveAccessLevel(baseUser, 'doc-404');
    expect(level).toBe('none');
  });

  it('returns "cite" for a public document regardless of department', async () => {
    Document.findOne.mockReturnValue(mockLean({ securityLevel: 'public', department: 'Finance', allowedRoles: [] }));
    DocumentPermission.findOne.mockReturnValue(mockLean(null));
    const level = await permissionService.resolveAccessLevel(baseUser, 'doc-1');
    expect(level).toBe('cite');
  });

  it('returns "none" for a confidential document outside the employee role scope', async () => {
    Document.findOne.mockReturnValue(mockLean({ securityLevel: 'confidential', department: 'HR', allowedRoles: [] }));
    DocumentPermission.findOne.mockReturnValue(mockLean(null));
    const level = await permissionService.resolveAccessLevel(baseUser, 'doc-2');
    expect(level).toBe('none'); // employees don't get confidential by default
  });

  it('a user-specific override wins over the default department rule', async () => {
    Document.findOne.mockReturnValue(mockLean({ securityLevel: 'restricted', department: 'Legal', allowedRoles: [] }));
    DocumentPermission.findOne.mockReturnValueOnce(mockLean({ accessLevel: 'view' })); // user override
    const level = await permissionService.resolveAccessLevel(baseUser, 'doc-3');
    expect(level).toBe('view');
  });

  it('grants access when department matches and security level is within role scope', async () => {
    Document.findOne.mockReturnValue(mockLean({ securityLevel: 'internal', department: 'HR', allowedRoles: [] }));
    DocumentPermission.findOne.mockReturnValue(mockLean(null));
    const level = await permissionService.resolveAccessLevel(baseUser, 'doc-4');
    expect(level).toBe('cite');
  });
});
