import mongoose from 'mongoose';

const documentPermissionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    grantType: { type: String, enum: ['role', 'user'], required: true },
    role: { type: String, enum: ['employee', 'manager', 'admin'] }, // if grantType === 'role'
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // if grantType === 'user'
    accessLevel: { type: String, enum: ['view', 'cite'], default: 'view' },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

documentPermissionSchema.index({ tenantId: 1, documentId: 1 });

export default mongoose.model('DocumentPermission', documentPermissionSchema);
