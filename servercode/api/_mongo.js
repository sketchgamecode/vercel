import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) throw new Error("Missing MONGODB_URI");
if (!dbName) throw new Error("Missing MONGODB_DB");

let cached = global._mongo;
if (!cached) cached = global._mongo = { client: null, db: null };

export async function getDb() {
  if (cached.db) return cached.db;
  if (!cached.client) {
    cached.client = new MongoClient(uri, { maxPoolSize: 5 });
    await cached.client.connect();
  }
  cached.db = cached.client.db(dbName);
  return cached.db;
}