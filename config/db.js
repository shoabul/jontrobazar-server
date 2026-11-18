import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
let client = null;
let db = null;

export const connectDB = async () => {
  if (db) return db;

  if (!uri || uri.includes("<username>")) {
    console.warn("⚠️  MONGO_URI is not configured in .env. Skipping DB connection until configured.");
    return null;
  }

  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();
    // Ping to confirm successful connection
    await client.db("admin").command({ ping: 1 });
    const dbName = process.env.DB_NAME || "jontrobazar";
    db = client.db(dbName);
    console.log(`✅ MongoDB connected successfully to database: "${dbName}"`);

    // Ensure collections and unique indexes
    try {
      await db.collection("users").createIndex({ email: 1 }, { unique: true });
      await db.collection("users").createIndex({ role: 1 });
    } catch (indexErr) {
      console.warn("Notice: users indexes verified or already exist:", indexErr.message);
    }

    return db;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};

export const getDb = () => {
  return db;
};

export const closeDB = async () => {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log("MongoDB connection closed.");
  }
};
