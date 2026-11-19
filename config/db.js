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

    // Ensure indexes — users
    try {
      await db.collection("users").createIndex({ email: 1 }, { unique: true });
      await db.collection("users").createIndex({ role: 1 });
    } catch (indexErr) {
      console.warn("Notice: users indexes verified or already exist:", indexErr.message);
    }

    // Ensure indexes — equipment
    try {
      await db.collection("equipment").createIndex(
        { name: "text", description: "text", location: "text", category: "text", brand: "text" },
        { name: "equipment_text_search" }
      );
      await db.collection("equipment").createIndex({ status: 1 });
      await db.collection("equipment").createIndex({ "owner.email": 1 });
      await db.collection("equipment").createIndex({ category: 1 });
      await db.collection("equipment").createIndex({ createdAt: -1 });
    } catch (indexErr) {
      console.warn("Notice: equipment indexes verified or already exist:", indexErr.message);
    }

    // Ensure indexes — favorites (one favorite per user per equipment)
    try {
      await db.collection("favorites").createIndex(
        { userEmail: 1, equipmentId: 1 },
        { unique: true, name: "user_equipment_unique" }
      );
      await db.collection("favorites").createIndex({ userEmail: 1 });
      await db.collection("favorites").createIndex({ equipmentId: 1 });
    } catch (indexErr) {
      console.warn("Notice: favorites indexes verified or already exist:", indexErr.message);
    }

    // Ensure indexes — bookings
    try {
      await db.collection("bookings").createIndex({ "customer.email": 1 });
      await db.collection("bookings").createIndex({ "owner.email": 1 });
      await db.collection("bookings").createIndex({ equipmentId: 1 });
      await db.collection("bookings").createIndex({ bookingStatus: 1 });
      await db.collection("bookings").createIndex({ paymentStatus: 1 });
      await db.collection("bookings").createIndex({ createdAt: -1 });
      // Compound for availability checks
      await db.collection("bookings").createIndex({ equipmentId: 1, bookingStatus: 1, startDate: 1, endDate: 1 });
    } catch (indexErr) {
      console.warn("Notice: bookings indexes verified or already exist:", indexErr.message);
    }

    // Ensure indexes — payments
    try {
      await db.collection("payments").createIndex({ bookingId: 1 });
      await db.collection("payments").createIndex({ transactionId: 1 }, { unique: true });
      await db.collection("payments").createIndex({ customerEmail: 1 });
      await db.collection("payments").createIndex({ createdAt: -1 });
    } catch (indexErr) {
      console.warn("Notice: payments indexes verified or already exist:", indexErr.message);
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
