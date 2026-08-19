import mongoose from 'mongoose';

const citationSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    documentName: { type: String },
    page: { type: Number },
    section: { type: String },
    chunkId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentChunk' },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
    citations: [citationSchema],
    confidence: { type: Number, min: 0, max: 1 },
    feedback: { type: String, enum: ['up', 'down', null], default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const conversationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New conversation' },
    messages: [messageSchema],
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

conversationSchema.index({ tenantId: 1, userId: 1, updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
