import mongoose from 'mongoose';
import { env } from '../config/env.js';

// NOTE: the Atlas Vector Search index on `embedding` is created out-of-band
// (see backend/scripts/create-vector-index.js) — Mongoose schema indexes below
// cover the regular query paths only.
const documentChunkSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    department: { type: String, required: true }, // denormalized from parent Document for fast pre-filtering
    securityLevel: { type: String, required: true }, // denormalized from parent Document
    text: { type: String, required: true },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) => arr.length === env.vectorDimensions,
        message: (props) => `embedding must have ${env.vectorDimensions} dimensions, got ${props.value.length}`,
      },
    },
    page: { type: Number },
    section: { type: String },
    chunkIndex: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('DocumentChunk', documentChunkSchema);
