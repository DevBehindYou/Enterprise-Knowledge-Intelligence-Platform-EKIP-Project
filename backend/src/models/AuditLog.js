import mongoose from 'mongoose';

// Append-only by convention: no update/delete routes are ever exposed for this collection.
const auditLogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true }, // e.g. "document.upload", "document.access", "permission.change"
    targetType: {
      type: String,
      enum: ['document', 'user', 'permission', 'session', 'file', 'ai_provider', 'storage_config'],
      required: true,
      index: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, targetType: 1, targetId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
