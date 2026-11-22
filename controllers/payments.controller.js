import Stripe from "stripe";
import { getDbAsync } from "../config/db.js";
import { ObjectId } from "mongodb";

const BOOKINGS_COLLECTION = "bookings";
const PAYMENTS_COLLECTION = "payments";

let stripe = null;
function getStripe() {
  if (!stripe) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret || secret.includes("your_stripe_secret_key")) {
      console.warn("⚠️ STRIPE_SECRET_KEY not configured — Stripe features disabled");
      return null;
    }
    stripe = new Stripe(secret, { apiVersion: "2024-06-20" });
  }
  return stripe;
}

async function bookingsCollection() {
  const db = await getDbAsync();
  return db?.collection(BOOKINGS_COLLECTION);
}

async function paymentsCollection() {
  const db = await getDbAsync();
  return db?.collection(PAYMENTS_COLLECTION);
}

function userEmail(req) {
  return (req.user?.email || "").toLowerCase();
}

function userRole(req) {
  return req.user?.role || "customer";
}

function userId(req) {
  return req.user?.id || req.user?._id;
}

function handleDbError(res) {
  return res.status(503).json({
    success: false,
    message: "Database unavailable. Please try again later.",
    code: "DB_UNAVAILABLE",
  });
}

// ─── POST /api/payments/create-checkout-session ────────────────────────────────
// Creates a Stripe Checkout Session for a booking
export async function createCheckoutSession(req, res) {
  try {
    const bookingsCol = await bookingsCollection();
    if (!bookingsCol) return handleDbError(res);

    const stripeClient = getStripe();
    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        message: "Stripe not configured on server",
      });
    }

    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required" });
    }

    let bookingOid;
    try {
      bookingOid = new ObjectId(bookingId);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid bookingId format" });
    }

    const booking = await bookingsCol.findOne({ _id: bookingOid });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Authorization: only the booking customer can pay
    const email = userEmail(req);
    if (booking.customer?.email !== email) {
      return res.status(403).json({ success: false, message: "Not authorized to pay for this booking" });
    }

    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ success: false, message: "Booking already paid" });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const equipmentId = booking.equipmentId;

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "bdt", // Bangladesh Taka
            unit_amount: Math.round(booking.totalAmount * 100), // Stripe expects cents/poisha
            product_data: {
              name: booking.equipment?.name || "Equipment Rental",
              description: `${booking.days} day(s) × ${booking.quantity} unit(s) — ${booking.equipment?.category || ""}`,
              images: booking.equipment?.image ? [booking.equipment.image] : [],
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        bookingId: bookingId.toString(),
        customerEmail: email,
      },
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("createCheckoutSession error:", err);
    res.status(500).json({ success: false, message: "Failed to create checkout session" });
  }
}

// ─── POST /api/payments/verify ─────────────────────────────────────────────────
// Verifies a Stripe Checkout Session (idempotent) and updates booking + creates payment record
export async function verifyPayment(req, res) {
  try {
    const bookingsCol = await bookingsCollection();
    const paymentsCol = await paymentsCollection();
    if (!bookingsCol || !paymentsCol) return handleDbError(res);

    const stripeClient = getStripe();
    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        message: "Stripe not configured on server",
      });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: `Payment not completed (status: ${session.payment_status})`,
      });
    }

    const bookingId = session.metadata?.bookingId;
    const customerEmail = session.metadata?.customerEmail;

    if (!bookingId || !customerEmail) {
      return res.status(400).json({ success: false, message: "Missing metadata on session" });
    }

    // Authorization
    const email = userEmail(req);
    if (customerEmail !== email && userRole(req) !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to verify this payment" });
    }

    let bookingOid;
    try {
      bookingOid = new ObjectId(bookingId);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid bookingId in session metadata" });
    }

    // Check if payment already recorded (idempotency)
    const existingPayment = await paymentsCol.findOne({ transactionId: session.payment_intent });
    if (existingPayment) {
      // Still update booking if needed
      await bookingsCol.updateOne(
        { _id: bookingOid },
        { $set: { paymentStatus: "paid", bookingStatus: "confirmed", updatedAt: new Date() } }
      );
      // Fetch booking for consistent response structure
      const updatedBooking = await bookingsCol.findOne({ _id: bookingOid });
      return res.json({
        success: true,
        message: "Payment already recorded",
        data: { payment: existingPayment, booking: updatedBooking },
      });
    }

    // Create payment record
    const payment = {
      bookingId: bookingId.toString(),
      transactionId: session.payment_intent,
      amount: session.amount_total / 100, // Convert from cents/poisha
      customerEmail,
      status: "completed",
      stripeSessionId: session.id,
      createdAt: new Date(),
    };

    const paymentResult = await paymentsCol.insertOne(payment);
    payment._id = paymentResult.insertedId;

    // Update booking
    await bookingsCol.updateOne(
      { _id: bookingOid },
      { $set: { paymentStatus: "paid", bookingStatus: "confirmed", updatedAt: new Date() } }
    );

    // Fetch updated booking
    const updatedBooking = await bookingsCol.findOne({ _id: bookingOid });

    res.json({
      success: true,
      message: "Payment verified and booking confirmed",
      data: { payment, booking: updatedBooking },
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ success: false, message: "Failed to verify payment" });
  }
}

// ─── POST /api/payments/webhook ────────────────────────────────────────────────
// Stripe webhook handler for checkout.session.completed (async fallback)
export async function stripeWebhook(req, res) {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        message: "Stripe not configured on server",
      });
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || webhookSecret.includes("your_stripe_webhook_secret")) {
      console.warn("⚠️ STRIPE_WEBHOOK_SECRET not configured — webhook will fail verification");
      return res.status(500).json({ success: false, message: "Webhook secret not configured" });
    }

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ success: false, message: `Webhook Error: ${err.message}` });
    }

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.payment_status === "paid") {
        const bookingId = session.metadata?.bookingId;
        const customerEmail = session.metadata?.customerEmail;

        if (bookingId && customerEmail) {
          try {
            const bookingsCol = await bookingsCollection();
            const paymentsCol = await paymentsCollection();

            let bookingOid;
            try {
              bookingOid = new ObjectId(bookingId);
            } catch {
              console.error("Invalid bookingId in webhook:", bookingId);
            }

            if (bookingOid) {
              // Check if already recorded
              const existing = await paymentsCol.findOne({ transactionId: session.payment_intent });
              if (!existing) {
                const payment = {
                  bookingId,
                  transactionId: session.payment_intent,
                  amount: session.amount_total / 100,
                  customerEmail,
                  status: "completed",
                  stripeSessionId: session.id,
                  createdAt: new Date(),
                };
                await paymentsCol.insertOne(payment);

                await bookingsCol.updateOne(
                  { _id: bookingOid },
                  { $set: { paymentStatus: "paid", bookingStatus: "confirmed", updatedAt: new Date() } }
                );
                console.log(`✅ Webhook: payment recorded for booking ${bookingId}`);
              }
            }
          } catch (dbErr) {
            console.error("Webhook DB error:", dbErr);
            // Don't fail the webhook — Stripe will retry
          }
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("stripeWebhook error:", err);
    res.status(500).json({ success: false, message: "Webhook handler failed" });
  }
}