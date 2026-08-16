import mongoose from 'mongoose';

// Imported from the module, not the barrel — this file is loaded by standalone
// scripts, and the barrel re-exports UI constants that pull in `lucide-react`.
import { DATABASE_NAME } from '@/constants/database.const';

/*
  Next.js reloads server modules on every change in development, and every route handler
  runs in its own module scope in production. Without a cache that means a fresh connection
  per reload, which exhausts the connection pool. The cache is parked on `globalThis` so it
  survives module re-evaluation.
*/
type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache: MongooseCache = globalWithMongoose.mongooseCache ?? { connection: null, promise: null };
globalWithMongoose.mongooseCache = cache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  /*
    Read straight off `process.env` for now. Step 1 introduces the zod-validated `env`
    module and this becomes `env.MONGODB_URI`, at which point a missing or malformed value
    fails the build rather than the first request that needs a database.
  */
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set.');
  }

  /*
    A cached Mongoose object is not necessarily a live socket. After an idle period the
    driver can close it while this module cache survives, which otherwise leaves the first
    request in a newly opened tab waiting on a dead connection. Reuse only an actively
    connected instance; a disconnected one goes through the normal connect path again.
  */
  if (cache.connection?.connection.readyState === 1) {
    return cache.connection;
  }

  if (cache.connection) {
    cache.connection = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      // Owned by the code, not by whoever pasted the connection string.
      dbName: DATABASE_NAME,
      // Fail fast instead of queueing operations against a database that is not there.
      bufferCommands: false,
    });
  }

  try {
    cache.connection = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.connection;
}
