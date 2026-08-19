// One-off script: `node scripts/set-user-role.js <email> [role]`
//
// Promotes (or demotes) a user. Needed at least once on every fresh install:
// POST /api/auth/signup deliberately hardcodes role: "employee" so self-signup
// can never grant admin, which means the first admin has to be set out-of-band.
// Without this, nobody can reach the Admin console or the Storage/AI Integration
// tabs in Settings, since those are admin-only.
//
// Also sets status to "active" — a freshly signed-up user is "invited" until
// their first successful login, and an inactive user is rejected by requireAuth.
import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import User from '../src/models/User.js';

const VALID_ROLES = ['employee', 'manager', 'admin'];

async function main() {
  const [email, role = 'admin'] = process.argv.slice(2);

  if (!email) {
    console.error('Usage: node scripts/set-user-role.js <email> [employee|manager|admin]');
    console.error('Example: node scripts/set-user-role.js you@company.com admin');
    process.exit(1);
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(`[set-user-role] "${role}" is not a valid role. Use one of: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  await mongoose.connect(env.mongodbUri, { dbName: env.mongodbDbName });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`[set-user-role] no user found with email "${email}".`);
    const all = await User.find({}, 'email role').lean();
    if (all.length) {
      console.error('Known users:');
      all.forEach((u) => console.error(`  ${u.email} (${u.role})`));
    } else {
      console.error('There are no users yet — sign up through the app first.');
    }
    process.exit(1);
  }

  const previousRole = user.role;
  user.role = role;
  user.status = 'active';
  await user.save();

  console.log(`[set-user-role] ${user.email}: ${previousRole} -> ${user.role} (status: ${user.status})`);
  // requireAuth re-reads the user on every request, so this takes effect on the
  // next API call. The frontend caches the role from login, so an already-open
  // tab needs a refresh before the new nav items appear.
  console.log('[set-user-role] refresh any open browser tab to pick up the new role.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[set-user-role] failed', err);
  process.exit(1);
});
