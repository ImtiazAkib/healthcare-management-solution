import mongoose from 'mongoose';

import { env } from '@/env/server';

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
    /*
      Read through the validated `env` module, never `process.env` — that is what keeps the
      validation honest, and why there is no missing-value check here: `MONGODB_URI` is
      required by the schema from step 3a, so an absent one fails the build rather than the
      first request that needed a database.
    */
    cache.promise = mongoose.connect(env.MONGODB_URI, {
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
