import 'dotenv/config';
import mongoose from 'mongoose';

async function findAdmins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
    const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String, name: String }, { strict: false }));
    const admins = await User.find({ role: 'admin' }).lean();
    console.log('Admin Accounts Found:');
    console.log(JSON.stringify(admins, null, 2));
    
    // Check if demo user is admin
    const demo = await User.findOne({ email: 'demo@ekip.com' }).lean();
    if (demo) {
      console.log('Demo User Role:', demo.role);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
findAdmins();
