import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "jontrobazar";

// Global singleton for serverless (Vercel caches modules between invocations)
let cachedClient = null;
let cachedDb = null;
let connectionPromise = null;

/**
 * Creates a new MongoClient with serverless-optimized options
 */
function createClient() {
  if (!uri || uri.includes("<username>")) {
    return null;
  }

  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    // Serverless-optimized connection pool settings
    maxPoolSize: 10, // Limit connections per instance
    minPoolSize: 0, // Allow pool to shrink to 0 when idle
    maxIdleTimeMS: 30000, // Close idle connections after 30s
    serverSelectionTimeoutMS: 10000, // Fail fast if server unavailable
    socketTimeoutMS: 45000, // Socket timeout
    connectTimeoutMS: 10000, // Initial connection timeout
    retryWrites: true,
    retryReads: true,
  });
}

/**
 * Connect to MongoDB with retry logic (serverless-friendly)
 * Returns db instance or null if connection fails (doesn't throw)
 */
export const connectDB = async () => {
  // Return cached connection if valid
  if (cachedDb && cachedClient) {
    try {
      // Quick ping to verify connection is alive
      await cachedClient.db("admin").command({ ping: 1 });
      return cachedDb;
    } catch {
      // Connection stale, will reconnect
      cachedClient = null;
      cachedDb = null;
      connectionPromise = null;
    }
  }

  // Prevent multiple simultaneous connection attempts
  if (connectionPromise) {
    return connectionPromise;
  }

  if (!uri || uri.includes("<username>")) {
    console.warn("⚠️  MONGO_URI is not configured in .env. Database features unavailable.");
    return null;
  }

  connectionPromise = (async () => {
    const client = createClient();
    if (!client) return null;

    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        await client.connect();
        // Ping to confirm successful connection
        await client.db("admin").command({ ping: 1 });
        
        const db = client.db(dbName);
        console.log(`✅ MongoDB connected successfully to database: "${dbName}"`);

        // Ensure indexes (run once per connection)
        await ensureIndexes(db);

        cachedClient = client;
        cachedDb = db;
        return db;
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          console.warn(`⚠️ MongoDB connection failed, retrying... (${retries} retries left):`, error.message);
          await new Promise((r) => setTimeout(r, 1000 * (4 - retries))); // 1s, 2s, 3s backoff
        }
      }
    }

    console.error("❌ MongoDB connection failed after retries:", lastError?.message);
    await client.close().catch(() => {});
    return null;
  })();

  return connectionPromise;
};

async function ensureIndexes(db) {
  const indexes = [
    // user
    { coll: "user", index: { email: 1 }, options: { unique: true } },
    { coll: "user", index: { role: 1 } },
    // equipment
    { coll: "equipment", index: { name: "text", description: "text", location: "text", category: "text", brand: "text" }, options: { name: "equipment_text_search" } },
    { coll: "equipment", index: { status: 1 } },
    { coll: "equipment", index: { "owner.email": 1 } },
    { coll: "equipment", index: { category: 1 } },
    { coll: "equipment", index: { createdAt: -1 } },
    // favorites
    { coll: "favorites", index: { userEmail: 1, equipmentId: 1 }, options: { unique: true, name: "user_equipment_unique" } },
    { coll: "favorites", index: { userEmail: 1 } },
    { coll: "favorites", index: { equipmentId: 1 } },
    // bookings
    { coll: "bookings", index: { "customer.email": 1 } },
    { coll: "bookings", index: { "owner.email": 1 } },
    { coll: "bookings", index: { equipmentId: 1 } },
    { coll: "bookings", index: { bookingStatus: 1 } },
    { coll: "bookings", index: { paymentStatus: 1 } },
    { coll: "bookings", index: { createdAt: -1 } },
    { coll: "bookings", index: { equipmentId: 1, bookingStatus: 1, startDate: 1, endDate: 1 } },
    // payments
    { coll: "payments", index: { bookingId: 1 } },
    { coll: "payments", index: { transactionId: 1 }, options: { unique: true } },
    { coll: "payments", index: { customerEmail: 1 } },
    { coll: "payments", index: { createdAt: -1 } },
  ];

  for (const { coll, index, options } of indexes) {
    try {
      await db.collection(coll).createIndex(index, options);
    } catch (indexErr) {
      // Ignore "already exists" errors
      if (!indexErr.message?.includes("already exists") && !indexErr.codeName?.includes("IndexOptionsConflict")) {
        console.warn(`Notice: ${coll} index issue:`, indexErr.message);
      }
    }
  }
}

export const getDb = () => {
  return cachedDb;
};

/**
 * Force close and reset connection (useful for testing or cleanup)
 */
export const closeDB = async () => {
  if (cachedClient) {
    try {
      await cachedClient.close();
      console.log("MongoDB connection closed.");
    } catch (err) {
      console.warn("Error closing MongoDB connection:", err.message);
    } finally {
      cachedClient = null;
      cachedDb = null;
      connectionPromise = null;
    }
  }
};

/**
 * Health check - verifies DB is reachable
 */
export const checkDbHealth = async () => {
  try {
    const db = await connectDB();
    if (!db) return { status: "disconnected", reason: "No connection" };
    await db.command({ ping: 1 });
    return { status: "connected" };
  } catch (err) {
    return { status: "disconnected", reason: err.message };
  }
};
