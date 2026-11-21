import express from "express";
import {
  createBooking,
  getMyRentals,
  getOwnerRentals,
  getAllBookings,
  updateBookingStatus,
} from "../controllers/bookings.controller.js";
import { verifyToken, verifyCustomer, verifyOwner, verifyAdmin } from "../middlewares/auth.js";
import { validate, schemas } from "../middlewares/validate.js";

const router = express.Router();

// Customer creates a booking
router.post("/", verifyToken, verifyCustomer, validate(schemas.createBooking), createBooking);  // POST   /api/bookings

// Customer views their rentals
router.get("/my-rentals", verifyToken, getMyRentals);                      // GET    /api/bookings/my-rentals

// Owner views rentals for their equipment
router.get("/owner-rentals", verifyToken, verifyOwner, getOwnerRentals);    // GET    /api/bookings/owner-rentals

// Admin views all bookings
router.get("/all", verifyToken, verifyAdmin, getAllBookings);               // GET    /api/bookings/all

// Owner (for their equipment) or Admin updates booking status
router.patch("/:id/status", verifyToken, verifyOwner, validate(schemas.bookingStatus), updateBookingStatus); // PATCH  /api/bookings/:id/status

export default router;