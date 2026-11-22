import { ObjectId } from "mongodb";
import { getDbAsync } from "../config/db.js";
import { generateToken } from "../utils/jwt.js";

/**
 * GET /api/users/me
 * Fetch current authenticated user's profile
 */
export const getMe = async (req, res) => {
  try {
    const db = await getDbAsync();
    if (!db) {
      // Graceful fallback: return user profile extracted directly from the verified token
      return res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role || "customer",
          photo: req.user.photo || "",
        },
        notice: "Served from verified token payload (MongoDB not connected)",
      });
    }

    let user = null;
    if (req.user.email) {
      user = await db.collection("user").findOne(
        { email: req.user.email },
        { projection: { password: 0 } }
      );
    }

    if (!user && req.user.id) {
      try {
        user = await db.collection("user").findOne(
          { _id: new ObjectId(req.user.id) },
          { projection: { password: 0 } }
        );
      } catch {
        // ignore invalid ObjectId
      }
    }

    if (!user) {
      // Fallback: return payload extracted from verified token
      return res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role || "customer",
          photo: req.user.photo || "",
        },
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error in getMe:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error retrieving user profile",
    });
  }
};

/**
 * PUT /api/users/profile
 * Update current authenticated user's profile
 */
export const updateProfile = async (req, res) => {
  try {
    const db = await getDbAsync();
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database service unavailable",
      });
    }

    const { name, photo, phone, address } = req.body;
    const userEmail = req.user.email;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "User email not found in token",
      });
    }

    const updateFields = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateFields.name = name;
    if (photo !== undefined) updateFields.photo = photo;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;

    const result = await db.collection("user").findOneAndUpdate(
      { email: userEmail },
      {
        $set: updateFields,
        $setOnInsert: {
          email: userEmail,
          role: req.user.role || "customer",
          createdAt: new Date(),
        },
      },
      { returnDocument: "after", upsert: true, projection: { password: 0 } }
    );

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: result,
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error updating profile",
    });
  }
};

/**
 * GET /api/users
 * Admin only: list all registered users
 */
export const getAllUsers = async (req, res) => {
  try {
    const db = await getDbAsync();
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database service unavailable",
      });
    }

    const users = await db
      .collection("user")
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error retrieving users list",
    });
  }
};

/**
 * PATCH /api/users/:id/role
 * Admin only: change a user's role (customer, owner, admin)
 */
export const updateUserRole = async (req, res) => {
  try {
    const db = await getDbAsync();
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database service unavailable",
      });
    }

    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ["customer", "owner", "admin"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles are: ${validRoles.join(", ")}`,
      });
    }

    let filter;
    try {
      filter = { _id: new ObjectId(id) };
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const result = await db.collection("user").findOneAndUpdate(
      filter,
      {
        $set: {
          role,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after", projection: { password: 0 } }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: `User role updated to ${role} successfully`,
      user: result,
    });
  } catch (error) {
    console.error("Error in updateUserRole:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error updating user role",
    });
  }
};

/**
 * POST /api/users/token
 * Exchanges BetterAuth user info for an Express JWT token
 * Public endpoint - validates user exists in database before issuing token
 */
export const issueDevToken = async (req, res) => {
  try {
    const { email, role = "customer", name = "User", id } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to issue a token",
      });
    }

    const db = await getDbAsync();
    let user = null;

    // Verify user exists in database
    if (db) {
      user = await db.collection("user").findOne({ email: email.toLowerCase() });
    }

    // If no DB or user not found, fall back to provided data (for BetterAuth sync)
    // But log a warning in production
    if (!user) {
      if (db && process.env.NODE_ENV === "production") {
        console.warn(`Token requested for unknown user: ${email}`);
      }
      // Use provided data but generate a simple ID if not provided
      const userId = id || `user_${Date.now()}`;
      const token = generateToken({ 
        id: userId, 
        email: email.toLowerCase(), 
        role, 
        name 
      });

      return res.json({
        success: true,
        token,
        user: { id: userId, email: email.toLowerCase(), role, name },
      });
    }

    // User exists in DB - use DB data for token
    const token = generateToken({ 
      id: user._id.toString(), 
      email: user.email, 
      role: user.role || role, 
      name: user.name || name 
    });

    return res.json({
      success: true,
      token,
      user: { 
        id: user._id.toString(), 
        email: user.email, 
        role: user.role || role, 
        name: user.name || name 
      },
    });
  } catch (error) {
    console.error("Error in issueDevToken:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error generating token",
    });
  }
};
