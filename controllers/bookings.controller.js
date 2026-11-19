import { getDb } from "../config/db.js";
import { ObjectId } from "mongodb";

const BOOKINGS_COLLECTION = "bookings";
const EQUIPMENT_COLLECTION = "equipment";

function bookingsCollection() {
  const db = getDb();
  if (!db) throw new Error("Database not connected");
  return db.collection(BOOKINGS_COLLECTION);
}

function equipmentCollection() {
  const db = getDb();
  if (!db) throw new Error("Database not connected");
  return db.collection(EQUIPMENT_COLLECTION);
}

function userId(req) {
  return req.user?.id || req.user?._id;
}

function userEmail(req) {
  return (req.user?.email || "").toLowerCase();
}

function userRole(req) {
  return req.user?.role || "customer";
}

function userName(req) {
  return req.user?.name || "";
}

// ─── POST /api/bookings ────────────────────────────────────────────────────────
// Customer creates a booking request. Validates equipment availability for the
// date range and quantity, computes total, creates booking with status "pending"
// and paymentStatus "unpaid".
export async function createBooking(req, res) {
  try {
    const {
      equipmentId,
      startDate,
      endDate,
      quantity = 1,
      contact,
      address,
      notes = "",
    } = req.body;

    // Validate required fields
    if (!equipmentId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "equipmentId, startDate, and endDate are required",
      });
    }

    let equipmentOid;
    try {
      equipmentOid = new ObjectId(equipmentId);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid equipmentId format" });
    }

    // Fetch equipment
    const equipCol = equipmentCollection();
    const equipment = await equipCol.findOne({ _id: equipmentOid });

    if (!equipment) {
      return res.status(404).json({ success: false, message: "Equipment not found" });
    }

    if (equipment.status !== "approved") {
      return res.status(400).json({ success: false, message: "Equipment is not available for booking" });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    if (end <= start) {
      return res.status(400).json({ success: false, message: "endDate must be after startDate" });
    }

    // Calculate days (minimum 1 day)
    const diffMs = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Validate quantity
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: "quantity must be a positive integer" });
    }

    // Check availability: ensure no overlapping confirmed/completed bookings exceed available quantity
    const bookingsCol = bookingsCollection();
    const overlappingBookings = await bookingsCol
      .find({
        equipmentId: equipmentId.toString(),
        bookingStatus: { $in: ["confirmed", "completed", "pending"] },
        $or: [
          { startDate: { $lt: end }, endDate: { $gt: start } }, // Overlaps with requested range
        ],
      })
      .toArray();

    const bookedQty = overlappingBookings.reduce((sum, b) => sum + (b.quantity || 1), 0);
    const availableQty = (equipment.quantity || 0) - bookedQty;

    if (qty > availableQty) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableQty} unit(s) available for the selected dates`,
        available: availableQty,
      });
    }

    // Compute total amount (daily price × days × quantity)
    const dailyPrice = parseFloat(equipment.price);
    const totalAmount = dailyPrice * days * qty;

    // Build booking document
    const booking = {
      equipmentId: equipmentId.toString(),
      equipment: {
        name: equipment.name,
        category: equipment.category,
        price: dailyPrice,
        rentalType: equipment.rentalType,
        image: equipment.image,
      },
      customer: {
        id: userId(req),
        email: userEmail(req),
        name: userName(req),
      },
      owner: {
        email: equipment.owner?.email || "",
        name: equipment.owner?.name || "",
      },
      startDate: start,
      endDate: end,
      days,
      quantity: qty,
      contact: contact || "",
      address: address || "",
      notes,
      totalAmount,
      paymentStatus: "unpaid",
      bookingStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await bookingsCol.insertOne(booking);
    booking._id = result.insertedId;

    res.status(201).json({
      success: true,
      message: "Booking created. Proceed to payment.",
      data: booking,
    });
  } catch (err) {
    console.error("createBooking error:", err);
    res.status(500).json({ success: false, message: "Failed to create booking" });
  }
}

// ─── GET /api/bookings/my-rentals ──────────────────────────────────────────────
// Customer views their own bookings
export async function getMyRentals(req, res) {
  try {
    const col = bookingsCollection();
    const email = userEmail(req);

    const bookings = await col
      .find({ "customer.email": email })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: bookings });
  } catch (err) {
    console.error("getMyRentals error:", err);
    res.status(500).json({ success: false, message: "Failed to load rentals" });
  }
}

// ─── GET /api/bookings/owner-rentals ───────────────────────────────────────────
// Owner views rentals for their equipment
export async function getOwnerRentals(req, res) {
  try {
    const col = bookingsCollection();
    const email = userEmail(req);

    const bookings = await col
      .find({ "owner.email": email })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: bookings });
  } catch (err) {
    console.error("getOwnerRentals error:", err);
    res.status(500).json({ success: false, message: "Failed to load owner rentals" });
  }
}

// ─── GET /api/bookings/all ─────────────────────────────────────────────────────
// Admin views all bookings
export async function getAllBookings(req, res) {
  try {
    const col = bookingsCollection();

    const bookings = await col.find({}).sort({ createdAt: -1 }).toArray();

    res.json({ success: true, data: bookings, total: bookings.length });
  } catch (err) {
    console.error("getAllBookings error:", err);
    res.status(500).json({ success: false, message: "Failed to load all bookings" });
  }
}

// ─── PATCH /api/bookings/:id/status ────────────────────────────────────────────
// Owner (for their equipment) or Admin updates booking status
export async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { bookingStatus } = req.body;

    const validStatuses = ["confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: `bookingStatus must be one of: ${validStatuses.join(", ")}`,
      });
    }

    let bookingOid;
    try {
      bookingOid = new ObjectId(id);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const col = bookingsCollection();
    const booking = await col.findOne({ _id: bookingOid });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Authorization: owner of the equipment or admin
    const role = userRole(req);
    const email = userEmail(req);
    if (role !== "admin" && booking.owner?.email !== email) {
      return res.status(403).json({
        success: false,
        message: "You can only update bookings for your own equipment",
      });
    }

    const result = await col.findOneAndUpdate(
      { _id: bookingOid },
      { $set: { bookingStatus, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, message: `Booking ${bookingStatus}`, data: result });
  } catch (err) {
    console.error("updateBookingStatus error:", err);
    res.status(500).json({ success: false, message: "Failed to update booking status" });
  }
}