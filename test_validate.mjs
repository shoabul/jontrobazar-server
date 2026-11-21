// Test Zod validation
import { z } from "zod";

const schemas = {
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
};

try {
  const data = schemas.equipmentQuery.safeParse({});
  console.log("Empty object result:", data.success);
  console.log("Error:", data.error?.issues);
} catch (e) {
  console.error("Exception:", e.message);
}

// Test with undefined
try {
  const data = schemas.equipmentQuery.safeParse(undefined);
  console.log("Undefined result:", data.success);
} catch (e) {
  console.error("Exception on undefined:", e.message);
}

// Test with actual query data
try {
  const data = schemas.equipmentQuery.safeParse({ search: "hello", page: 1 });
  console.log("With data result:", data.success);
  console.log("Parsed data:", JSON.stringify(data.data));
} catch (e) {
  console.error("Exception with data:", e.message);
}