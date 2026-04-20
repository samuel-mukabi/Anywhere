import { buildApp } from './app';
import mongoose from 'mongoose';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3004;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anywhere_groups';

async function start() {
  await mongoose.connect(MONGO_URI);
  const app = await buildApp();
  
  app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Group Service listening at ${address}`);
  });
}

start();
