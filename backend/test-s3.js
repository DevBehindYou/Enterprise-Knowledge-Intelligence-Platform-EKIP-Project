import 'dotenv/config';
import mongoose from 'mongoose';
import { buildS3Client, HeadBucketCommand } from './src/services/storage/s3Client.js';
import StorageConfig from './src/models/StorageConfig.js';

async function testCurrentConfig() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  
  const config = await StorageConfig.findOne().sort({ createdAt: -1 });
  if (!config) {
    console.log('No config found.');
    process.exit(1);
  }
  
  console.log('Testing config for bucket:', config.bucket, 'Endpoint:', config.endpoint, 'Region:', config.region);
  
  const client = buildS3Client(config);
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    console.log('Success!');
  } catch (err) {
    console.error('Raw Error:', err);
    console.error('Error Code:', err.Code || err.name);
    console.error('Error Message:', err.message);
  } finally {
    process.exit();
  }
}
testCurrentConfig();
