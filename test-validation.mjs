import { z } from "zod";

// Server validation schema (from equipment.controller.js line 56)
const equipmentSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(2000),
  category: z.enum(['Construction', 'Photography', 'Vehicles & Transportation', 'Agriculture', 'Electronics', 'Event Equipment']),
  location: z.string().min(2).max(100),
  price: z.number().positive(),
  rentalType: z.enum(['daily', 'weekly', 'monthly']),
  quantity: z.number().int().positive(),
  condition: z.enum(['new', 'excellent', 'good', 'fair']),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  image: z.string().url().optional().or(z.literal("")),
  terms: z.string().max(2000).optional(),
});

// Test with EXACT values from user form:
const userFormData = {
  name: "CAT 320 Hydraulic Excavator",
  description: "Excellent condition, great for construction work on any site",
  category: "Construction",
  location: "Mirpur, Dhaka",
  price: 25000,
  rentalType: "daily",
  quantity: 1,
  condition: "excellent",
  brand: "Caterpillar",
  model: "320D",
  image: "https://i.ibb.co/test-image.jpg",
  terms: "Fuel not included"
};

try {
  const result = equipmentSchema.parse(userFormData);
  console.log("SUCCESS: All validation passed");
  console.log("Condition:", userFormData.condition);
} catch (e) {
  console.log("FAILED:", JSON.stringify(e.errors));
}