import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'docx', 'txt', 'csv', 'pptx', 'md'], required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, required: true, index: true },
    securityLevel: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'internal',
      index: true,
    },
    allowedRoles: [{ type: String, enum: ['employee', 'manager', 'admin'] }],
    status: { type: String, enum: ['queued', 'processing', 'ready', 'failed'], default: 'queued', index: true },
    processingError: { type: String },
    pageCount: { type: Number },
    sizeBytes: { type: Number },
    storageUrl: { type: String },
    tags: [{ type: String, index: true }],
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

documentSchema.index({ tenantId: 1, department: 1, securityLevel: 1 });
documentSchema.index({ originalName: 'text', tags: 'text' });

export default mongoose.model('Document', documentSchema);

