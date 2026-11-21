import express from "express";
import {
  createCheckoutSession,
  verifyPayment,
  stripeWebhook,
} from "../controllers/payments.controller.js";
import { verifyToken, verifyAdmin } from "../middlewares/auth.js";
import { validate, schemas } from "../middlewares/validate.js";

const router = express.Router();

// Customer creates a Stripe checkout session for a booking
router.post("/create-checkout-session", verifyToken, validate(schemas.createCheckoutSession), createCheckoutSession); // POST /api/payments/create-checkout-session

// Customer/Admin verifies a checkout session (idempotent)
router.post("/verify", verifyToken, validate(schemas.verifyPayment), verifyPayment);                               // POST /api/payments/verify

// Stripe webhook — needs raw body, mounted separately in index.js with express.raw()
// router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

export default router;