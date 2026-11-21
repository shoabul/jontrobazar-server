import { z } from "zod";

/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Where to validate: 'body', 'query', 'params'
 */
export const validate = (schema, source = "body") => (req, res, next) => {
  try {
    const data = req[source];
    
    // For query source, we can't assign to req.query (getter in Express)
    // Instead, store validated data on req validatedQuery or similar
    let toAssign;
    if (source === "query") {
      toAssign = "validatedQuery";
    } else {
      toAssign = source;
    }
    
    // If schema is empty or data is empty/undefined, allow pass-through
    if (!data || Object.keys(data).length === 0) {
      req[toAssign] = {};
      return next();
    }

    const result = schema.safeParse(data);
    
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const messages = Object.entries(errors).flatMap(([field, msgs]) => 
        msgs.map(msg => `${field}: ${msg}`)
      );
      
      console.error("Validation failed for path:", req.originalUrl, "data:", data, "errors:", messages);
      
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }
    
    // Replace with validated/transformed data
    req[toAssign] = result.data;
    next();
  } catch (err) {
    console.error("Validation middleware error:", err);
    res.status(500).json({ success: false, message: "Validation error" });
  }
};

// ─── Common validation schemas ──────────────────────────────────────────────────

export const schemas = {
  // Auth
  devToken: z.object({
    email: z.string().email("Invalid email format"),
    role: z.enum(["customer", "owner", "admin"]).default("customer"),
    name: z.string().min(1, "Name is required").max(100),
    id: z.string().optional(),
  }),

  // User profile
  updateProfile: z.object({
    name: z.string().min(1).max(100).optional(),
    photo: z.string().url("Photo must be a valid URL").optional().or(z.literal("")),
    phone: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
  }),

  updateUserRole: z.object({
    role: z.enum(["customer", "owner", "admin"]),
  }),

  // Equipment
  addEquipment: z.object({
    name: z.string().min(2).max(100),
    description: z.string().min(10).max(2000),
    category: z.enum([
      "Construction",
      "Photography", 
      "Vehicles & Transportation",
      "Agriculture",
      "Electronics",
      "Event Equipment",
    ]),
    location: z.string().min(2).max(100),
    price: z.number().positive(),
    rentalType: z.enum(["daily", "weekly", "monthly"]),
    quantity: z.number().int().positive(),
    condition: z.enum(["new", "like-new", "good", "fair"]).default("good"),
    brand: z.string().max(100).optional(),
    model: z.string().max(100).optional(),
    image: z.string().url().optional().or(z.literal("")),
    terms: z.string().max(2000).optional(),
  }),

  updateEquipment: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().min(10).max(2000).optional(),
    category: z.enum([
      "Construction",
      "Photography", 
      "Vehicles & Transportation",
      "Agriculture",
      "Electronics",
      "Event Equipment",
    ]).optional(),
    location: z.string().min(2).max(100).optional(),
    price: z.number().positive().optional(),
    rentalType: z.enum(["daily", "weekly", "monthly"]).optional(),
    quantity: z.number().int().positive().optional(),
    condition: z.enum(["new", "like-new", "good", "fair"]).optional(),
    brand: z.string().max(100).optional(),
    model: z.string().max(100).optional(),
    image: z.string().url().optional().or(z.literal("")),
    terms: z.string().max(2000).optional(),
  }),

  equipmentStatus: z.object({
    status: z.enum(["approved", "rejected", "pending"]),
  }),

  equipmentQuery: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    rentalType: z.enum(["daily", "weekly", "monthly"]).optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    available: z.enum(["true", "false"]).optional(),
    sort: z.enum(["newest", "price-asc", "price-desc"]).default("newest"),
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
  }),

  availabilityCheck: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
    quantity: z.number().int().min(1).default(1),
  }),

  // Bookings
  createBooking: z.object({
    equipmentId: z.string().min(1),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
    quantity: z.number().int().min(1).default(1),
    contact: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
  }),

  bookingStatus: z.object({
    bookingStatus: z.enum(["confirmed", "completed", "cancelled"]),
  }),

  // Payments
  createCheckoutSession: z.object({
    bookingId: z.string().min(1),
  }),

  verifyPayment: z.object({
    sessionId: z.string().min(1),
  }),

  // Favorites
  addFavorite: z.object({
    equipmentId: z.string().min(1),
  }),

  favoriteCheck: z.object({
    equipmentId: z.string().min(1),
  }),

  // Admin
  adminEquipmentQuery: z.object({
    status: z.string().optional(),
    category: z.string().optional(),
  }),
};