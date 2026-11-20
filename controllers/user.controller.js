import { ObjectId } from "mongodb";
import { getDb } from "../config/db.js";
import { generateToken } from "../utils/jwt.js";

/**
 * GET /api/users/me
 * Fetch current authenticated user's profile
 */
export const getMe = async (req, res) => {
  try {
    const db = getDb();
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
    const db = getDb();
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
    const db = getDb();
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
    const db = getDb();
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
 * POST /api/auth/token (Dev/Utility)
 * Issues a JWT token for testing roles and client integration
 */
export const issueDevToken = async (req, res) => {
  try {
    const { email, role = "customer", name = "Test User", id = "673c00000000000000000001" } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to issue a test token",
      });
    }

    const token = generateToken({ id, email: email.toLowerCase(), role, name });

    return res.json({
      success: true,
      token,
      user: { id, email: email.toLowerCase(), role, name },
    });
  } catch (error) {
    console.error("Error in issueDevToken:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error generating token",
    });
  }
};
