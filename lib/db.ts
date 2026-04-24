import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

declare global {
  var mongooseConnection: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
  var mongoMemoryUri: string | null | undefined;
}

const DB_NAME = "report-management-system";
const EMBEDDED_DESKTOP_DB = process.env.ELECTRON_EMBEDDED_DB === "true";

if (!global.mongooseConnection) {
  global.mongooseConnection = { conn: null, promise: null };
}

async function resolveMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  if (process.env.NODE_ENV === "production" && !EMBEDDED_DESKTOP_DB) {
    throw new Error("MONGODB_URI is required in production.");
  }

  if (global.mongoMemoryUri) {
    return global.mongoMemoryUri;
  }

  const memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: DB_NAME,
      storageEngine: "wiredTiger",
    },
  });

  global.mongoMemoryUri = memoryServer.getUri(DB_NAME);
  return global.mongoMemoryUri;
}

export async function connectToDatabase() {
  if (global.mongooseConnection?.conn) {
    return global.mongooseConnection.conn;
  }

  if (!global.mongooseConnection?.promise) {
    global.mongooseConnection!.promise = (async () => {
      const configuredUri = process.env.MONGODB_URI;

      if (configuredUri) {
        try {
          return await mongoose.connect(configuredUri, {
            dbName: DB_NAME,
            serverSelectionTimeoutMS: 4000,
          });
        } catch (error) {
          if (process.env.NODE_ENV === "production" && !EMBEDDED_DESKTOP_DB) {
            throw error;
          }

          console.warn("Falling back to mongodb-memory-server because the configured MongoDB instance is unreachable.");
        }
      }

      const mongoUri = await resolveMongoUri();
      return mongoose.connect(mongoUri, {
        dbName: DB_NAME,
        serverSelectionTimeoutMS: 4000,
      });
    })();
  }

  global.mongooseConnection!.conn = await global.mongooseConnection!.promise;
  return global.mongooseConnection!.conn;
}
