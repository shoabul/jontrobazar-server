import express from "express";
import {
  createBooking,
  getMyRentals,
  getOwnerRentals,
  getAllBookings,
  updateBookingStatus,
} from "../controllers/bookings.controller.js";
import { verifyToken, verifyCustomer, verifyOwner, verifyAdmin } from "../middlewares/auth.js";

const router = express.Router();

// Customer creates a booking
router.post("/", verifyToken, verifyCustomer, createBooking);              // POST   /api/bookings

// Customer views their rentals
router.get("/my-rentals", verifyToken, getMyRentals);                      // GET    /api/bookings/my-rentals

// Owner views rentals for their equipment
router.get("/owner-rentals", verifyToken, verifyOwner, getOwnerRentals);    // GET    /api/bookings/owner-rentals

// Admin views all bookings
router.get("/all", verifyToken, verifyAdmin, getAllBookings);               // GET    /api/bookings/all

// Owner (for their equipment) or Admin updates booking status
router.patch("/:id/status", verifyToken, updateBookingStatus);             // PATCH  /api/bookings/:id/status

export default router;