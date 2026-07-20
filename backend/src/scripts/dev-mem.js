/**
 * Run the API with a throwaway in-memory MongoDB — no local Mongo install needed.
 * Great for demos and local development.
 *
 * Usage: npm run dev:mem
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri('leadcall_ai');
console.log(`[dev:mem] in-memory MongoDB ready at ${process.env.MONGODB_URI}`);

// Import the server AFTER setting MONGODB_URI so config/env picks it up.
await import('../server.js');

const shutdown = async () => {
  await mongod.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
