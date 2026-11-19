import { getDb } from "../config/db.js";
import { ObjectId } from "mongodb";

const COLLECTION = "favorites";

function favoritesCollection() {
  const db = getDb();
  if (!db) throw new Error("Database not connected");
  return db.collection(COLLECTION);
}

function userId(req) {
  return req.user?.id || req.user?._id;
}

function userEmail(req) {
  return (req.user?.email || "").toLowerCase();
}

// ─── GET /api/favorites ────────────────────────────────────────────────────────
// Returns the logged-in user's favorite equipment items, populated from the
// `equipment` collection so the client gets full listing data in one call.
export async function getFavorites(req, res) {
  try {
    const col = favoritesCollection();
    const email = userEmail(req);

    const entries = await col
      .find({ userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    // Resolve equipment docs in one query (handles empty list gracefully)
    const equipmentIds = entries.map((e) => new ObjectId(e.equipmentId));
    const equipCol = getDb().collection("equipment");
    const equipmentDocs = equipmentIds.length
      ? await equipCol.find({ _id: { $in: equipmentIds } }).toArray()
      : [];

    const byId = new Map(equipmentDocs.map((d) => [d._id.toString(), d]));

    const result = entries.map((entry) => {
      const eq = byId.get(entry.equipmentId);
      return {
        _id: entry._id,
        equipmentId: entry.equipmentId,
        createdAt: entry.createdAt,
        equipment: eq || null,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("getFavorites error:", err);
    res.status(500).json({ success: false, message: "Failed to load favorites" });
  }
}

// ─── POST /api/favorites ───────────────────────────────────────────────────────
// Body: { equipmentId }
// Creates a favorite entry if one doesn't already exist for this user.
export async function addFavorite(req, res) {
  try {
    const { equipmentId } = req.body;
    if (!equipmentId) {
      return res.status(400).json({ success: false, message: "equipmentId is required" });
    }

    let oid;
    try {
      oid = new ObjectId(equipmentId);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid equipmentId format" });
    }

    const col = favoritesCollection();
    const email = userEmail(req);

    // Verify the equipment actually exists and is approved (so users can't
    // favorite unapproved or deleted listings)
    const equipCol = getDb().collection("equipment");
    const equipment = await equipCol.findOne({ _id: oid });
    if (!equipment) {
      return res.status(404).json({ success: false, message: "Equipment not found" });
    }

    // Idempotent — return existing favorite instead of duplicating
    const existing = await col.findOne({ userEmail, equipmentId: equipmentId.toString() });
    if (existing) {
      return res.json({ success: true, data: existing, message: "Already in favorites" });
    }

    const doc = {
      userEmail,
      equipmentId: equipmentId.toString(),
      createdAt: new Date(),
    };

    const result = await col.insertOne(doc);
    doc._id = result.insertedId;

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("addFavorite error:", err);
    res.status(500).json({ success: false, message: "Failed to add favorite" });
  }
}

// ─── DELETE /api/favorites/:equipmentId ────────────────────────────────────────
export async function removeFavorite(req, res) {
  try {
    const { equipmentId } = req.params;
    const col = favoritesCollection();
    const email = userEmail(req);

    const result = await col.deleteOne({
      userEmail,
      equipmentId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Favorite not found" });
    }

    res.json({ success: true, message: "Removed from favorites" });
  } catch (err) {
    console.error("removeFavorite error:", err);
    res.status(500).json({ success: false, message: "Failed to remove favorite" });
  }
}

// ─── GET /api/favorites/check/:equipmentId ─────────────────────────────────────
// Returns { isFavorite: boolean } — used by the details page heart toggle.
export async function checkFavorite(req, res) {
  try {
    const { equipmentId } = req.params;
    const col = favoritesCollection();
    const email = userEmail(req);

    const entry = await col.findOne({ userEmail, equipmentId });
    res.json({ success: true, isFavorite: !!entry });
  } catch (err) {
    console.error("checkFavorite error:", err);
    res.status(500).json({ success: false, message: "Failed to check favorite status" });
  }
}