import mongoose from 'mongoose';

const ingestionJobSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    stage: {
      type: String,
      enum: ['extraction', 'chunking', 'embedding', 'indexing', 'done', 'failed'],
      default: 'extraction',
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('IngestionJob', ingestionJobSchema);
