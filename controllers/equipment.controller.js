import { getDb } from "../config/db.js";
import { ObjectId } from "mongodb";

const COLLECTION = "equipment";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function equipmentCollection() {
  const db = getDb();
  return db?.collection(COLLECTION);
}

function db() {
  return getDb();
}

function handleDbError(res, operation = "operation") {
  return res.status(503).json({
    success: false,
    message: `Database unavailable. Please try again later.`,
    code: "DB_UNAVAILABLE",
  });
}

function sanitizeEquipment(body, ownerInfo) {
  const {
    name,
    description,
    category,
    location,
    price,
    rentalType,
    quantity,
    condition,
    brand,
    model,
    image,
    terms,
  } = body;

  if (!name || !description || !category || !location || !price || !rentalType || !quantity) {
    throw { status: 400, message: "Missing required fields: name, description, category, location, price, rentalType, quantity" };
  }

  const parsedPrice = parseFloat(price);
  const parsedQty = parseInt(quantity, 10);

  if (isNaN(parsedPrice) || parsedPrice <= 0) throw { status: 400, message: "price must be a positive number" };
  if (isNaN(parsedQty) || parsedQty < 1) throw { status: 400, message: "quantity must be a positive integer" };

  const validRentalTypes = ["daily", "weekly", "monthly"];
  if (!validRentalTypes.includes(rentalType)) {
    throw { status: 400, message: `rentalType must be one of: ${validRentalTypes.join(", ")}` };
  }

  const validConditions = ["new", "excellent", "good", "fair"];
  if (condition && !validConditions.includes(condition)) {
    throw { status: 400, message: `condition must be one of: ${validConditions.join(", ")}` };
  }

  return {
    name: name.trim(),
    description: description.trim(),
    category: category.trim(),
    location: location.trim(),
    price: parsedPrice,
    rentalType,
    quantity: parsedQty,
    condition: condition || "good",
    brand: brand?.trim() || "",
    model: model?.trim() || "",
    image: image?.trim() || "",
    terms: terms?.trim() || "",
    owner: ownerInfo,
  };
}

// ─── Public Endpoints ─────────────────────────────────────────────────────────

/**
 * GET /api/equipment
 * Public — search, filter, sort, paginate (approved only)
 */
export async function getAllEquipment(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);

  const {
    search = "",
    category = "",
    rentalType = "",
    minPrice = "",
    maxPrice = "",
    available = "",
    sort = "newest",
    page = "1",
    limit = "12",
  } = req.query;

  const filter = { status: "approved" };

  // Text search (requires text index)
  if (search.trim()) {
    filter.$text = { $search: search.trim() };
  }

  if (category) filter.category = category;
  if (rentalType) filter.rentalType = rentalType;

  const priceFilter = {};
  if (minPrice) priceFilter.$gte = parseFloat(minPrice);
  if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
  if (Object.keys(priceFilter).length) filter.price = priceFilter;

  if (available === "true") filter.quantity = { $gt: 0 };

  const sortMap = {
    newest: { createdAt: -1 },
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
  };
  const sortOption = sortMap[sort] || sortMap.newest;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    col.find(filter).sort(sortOption).skip(skip).limit(limitNum).toArray(),
    col.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

/**
 * GET /api/equipment/featured
 * Public — 6 most recent approved items
 */
export async function getFeaturedEquipment(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);
  const items = await col
    .find({ status: "approved", quantity: { $gt: 0 } })
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();

  res.json({ success: true, data: items });
}

/**
 * GET /api/equipment/:id/availability
 * Public — check availability for a date range and quantity
 * Query: startDate, endDate, quantity
 */
export async function checkAvailability(req, res) {
  const col = equipmentCollection();
  const database = getDb();
  if (!col || !database) return handleDbError(res);
  const bookingsCol = database.collection("bookings");
  const { id } = req.params;
  const { startDate, endDate, quantity = 1 } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid equipment ID" });
  }

  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: "startDate and endDate are required" });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const qty = parseInt(quantity, 10);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ success: false, message: "Invalid date range" });
  }
  if (isNaN(qty) || qty < 1) {
    return res.status(400).json({ success: false, message: "quantity must be a positive integer" });
  }

  const equipment = await col.findOne({ _id: new ObjectId(id) });
  if (!equipment) {
    return res.status(404).json({ success: false, message: "Equipment not found" });
  }

  if (equipment.status !== "approved") {
    return res.json({ success: true, data: { available: false, message: "Equipment not available for booking" } });
  }

  // Count overlapping confirmed/pending bookings
  const overlapping = await bookingsCol
    .find({
      equipmentId: id.toString(),
      bookingStatus: { $in: ["confirmed", "pending", "completed"] },
      $or: [{ startDate: { $lt: end }, endDate: { $gt: start } }],
    })
    .toArray();

  const bookedQty = overlapping.reduce((sum, b) => sum + (b.quantity || 1), 0);
  const availableQty = (equipment.quantity || 0) - bookedQty;
  const isAvailable = qty <= availableQty;

  res.json({
    success: true,
    data: {
      available: isAvailable,
      availableQty: Math.max(0, availableQty),
      requestedQty: qty,
      message: isAvailable
        ? `${availableQty} unit(s) available for the selected dates`
        : `Only ${Math.max(0, availableQty)} unit(s) available for the selected dates`,
    },
  });
}

/**
 * GET /api/equipment/:id
 * Auth required — single item (all statuses visible if owner/admin, only approved for customer)
 */
export async function getEquipmentById(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid equipment ID" });
  }

  const item = await col.findOne({ _id: new ObjectId(id) });
  if (!item) return res.status(404).json({ success: false, message: "Equipment not found" });

  // Customers can only see approved items (unless they own it — not applicable for customers)
  const role = req.user?.role || "customer";
  if (role === "customer" && item.status !== "approved") {
    return res.status(404).json({ success: false, message: "Equipment not found" });
  }

  res.json({ success: true, data: item });
}

// ─── Owner Endpoints ──────────────────────────────────────────────────────────

/**
 * POST /api/equipment
 * Owner — create new equipment (status: pending)
 */
export async function addEquipment(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);
  const ownerInfo = {
    name: req.user.name,
    email: req.user.email,
    photo: req.user.image || req.user.photo || "",
  };

  const data = sanitizeEquipment(req.body, ownerInfo);
  data.status = "pending";
  data.createdAt = new Date();
  data.updatedAt = new Date();

  const result = await col.insertOne(data);
  res.status(201).json({
    success: true,
    message: "Equipment submitted for review. It will appear after admin approval.",
    data: { _id: result.insertedId, ...data },
  });
}

/**
 * GET /api/equipment/my-equipment
 * Owner — list own equipment (all statuses)
 */
export async function getMyEquipment(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);
  const items = await col
    .find({ "owner.email": req.user.email })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, data: items });
}

/**
 * PUT /api/equipment/:id
 * Owner — update own equipment (resets status to pending if changed significantly)
 */
export async function updateEquipment(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid equipment ID" });
  }

  const existing = await col.findOne({ _id: new ObjectId(id) });
  if (!existing) return res.status(404).json({ success: false, message: "Equipment not found" });
  if (existing.owner.email !== req.user.email) {
    return res.status(403).json({ success: false, message: "You can only update your own equipment" });
  }

  // Build update — keep existing owner, reset to pending if core fields changed
  const ownerInfo = existing.owner;
  const data = sanitizeEquipment(req.body, ownerInfo);

  const coreChanged =
    data.name !== existing.name ||
    data.description !== existing.description ||
    data.price !== existing.price ||
    data.category !== existing.category;

  data.status = coreChanged ? "pending" : existing.status;
  data.updatedAt = new Date();
  data.createdAt = existing.createdAt;

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: data },
    { returnDocument: "after" }
  );

  res.json({
    success: true,
    message: coreChanged
      ? "Equipment updated and re-submitted for review."
      : "Equipment updated.",
    data: result,
  });
}

/**
 * DELETE /api/equipment/:id
 * Owner — delete own equipment
 */
export async function deleteEquipment(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid equipment ID" });
  }

  const existing = await col.findOne({ _id: new ObjectId(id) });
  if (!existing) return res.status(404).json({ success: false, message: "Equipment not found" });
  if (existing.owner.email !== req.user.email) {
    return res.status(403).json({ success: false, message: "You can only delete your own equipment" });
  }

  await col.deleteOne({ _id: new ObjectId(id) });
  res.json({ success: true, message: "Equipment deleted successfully" });
}

// ─── Admin Endpoints ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/equipment
 * Admin — all equipment (all statuses), with optional status filter
 */
export async function getAllEquipmentAdmin(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;

  const items = await col.find(filter).sort({ createdAt: -1 }).toArray();
  res.json({ success: true, data: items, total: items.length });
}

/**
 * PATCH /api/equipment/:id/status
 * Admin — approve or reject equipment
 */
export async function updateEquipmentStatus(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);
  const { id } = req.params;
  const { status } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid equipment ID" });
  }

  const validStatuses = ["approved", "rejected", "pending"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "status must be: approved, rejected, or pending" });
  }

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!result) return res.status(404).json({ success: false, message: "Equipment not found" });

  res.json({ success: true, message: `Equipment ${status}.`, data: result });
}

/**
 * DELETE /api/admin/equipment/:id
 * Admin — delete any equipment
 */
export async function adminDeleteEquipment(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid equipment ID" });
  }

  const existing = await col.findOne({ _id: new ObjectId(id) });
  if (!existing) return res.status(404).json({ success: false, message: "Equipment not found" });

  await col.deleteOne({ _id: new ObjectId(id) });
  res.json({ success: true, message: "Equipment deleted by admin." });
}

/**
 * PUT /api/admin/equipment/:id
 * Admin — update any equipment (without resetting status)
 */
export async function adminUpdateEquipment(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid equipment ID" });
  }

  const existing = await col.findOne({ _id: new ObjectId(id) });
  if (!existing) return res.status(404).json({ success: false, message: "Equipment not found" });

  const data = sanitizeEquipment(req.body, existing.owner);
  data.status = req.body.status || existing.status;
  data.updatedAt = new Date();
  data.createdAt = existing.createdAt;

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: data },
    { returnDocument: "after" }
  );

  res.json({ success: true, message: "Equipment updated by admin.", data: result });
}

// ─── Categories helper ────────────────────────────────────────────────────────

/**
 * GET /api/equipment/categories
 * Public — distinct categories from approved equipment
 */
export async function getCategories(req, res) {
  const col = equipmentCollection();
  if (!col) return handleDbError(res);
  const categories = await col
    .aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: "$category" } },
      { $project: { _id: 0, category: "$_id" } },
      { $sort: { category: 1 } },
    ])
    .toArray();
  res.json({ success: true, data: categories.map((c) => c.category) });
}
