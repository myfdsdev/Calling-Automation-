import mongoose from 'mongoose';
import { env } from './env.js';

let connected = false;

export const isDbConnected = () => connected;

/**
 * Connect to MongoDB. On failure we log and keep the process alive so the API
 * surface is still inspectable; routes that need the DB return a clean 503.
 */
export async function connectDb() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    connected = true;
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('disconnected', () => {
    connected = false;
    console.warn('[db] MongoDB disconnected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB error:', err.message);
  });

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.warn(
      `[db] Could not connect to MongoDB (${err.message}). ` +
        'Server will run but DB-backed routes will return 503 until a database is available.',
    );
  }
}
