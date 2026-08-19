import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    supabaseUserId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ['employee', 'manager', 'admin'], default: 'employee' },
    department: { type: String, required: true },
    status: { type: String, enum: ['active', 'invited', 'suspended'], default: 'invited' },
    lastLoginAt: { type: Date },
    notificationPreferences: {
      documentUpdates: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false },
    },
    /**
     * "Log out everywhere" marker. Any token minted before this instant is
     * rejected by requireAuth and by the refresh exchange. Since sessions are
     * stateless JWTs, this timestamp is what makes global revocation possible
     * without a session table — bumping it invalidates every outstanding token
     * for this user at once.
     */
    sessionsValidFrom: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ tenantId: 1, department: 1 });

export default mongoose.model('User', userSchema);
