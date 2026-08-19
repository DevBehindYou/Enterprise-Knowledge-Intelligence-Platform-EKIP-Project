import mongoose from 'mongoose';

const feedbackEventSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    messageId: { type: mongoose.Schema.Types.ObjectId, required: true },
    rating: { type: String, enum: ['up', 'down'], required: true },
    retrievalScoreAtTime: { type: Number },
    reviewed: { type: Boolean, default: false, index: true },
    reviewNotes: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('FeedbackEvent', feedbackEventSchema);
