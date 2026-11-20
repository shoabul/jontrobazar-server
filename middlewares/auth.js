import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_key_jontrobazar_2026_super_secure";

/**
 * Middleware: Verify JWT in Authorization header
 * Expected format: Authorization: Bearer <token>
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Access token missing or invalid format (Bearer token required)",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token missing",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Normalize user payload
    req.user = {
      id: decoded.id || decoded.sub || decoded._id,
      email: decoded.email ? decoded.email.toLowerCase() : undefined,
      role: decoded.role || "customer",
      name: decoded.name,
      ...decoded,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token has expired. Please login again.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid access token",
    });
  }
};

/**
 * Middleware: Optionally verify JWT in Authorization header.
 * Sets req.user when a valid token is present, otherwise continues without
 * it (req.user remains undefined). Used on routes that are public but show
 * more data to authenticated users (e.g. equipment details by status).
 */
export const optionalVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.id || decoded.sub || decoded._id,
        email: decoded.email ? decoded.email.toLowerCase() : undefined,
        role: decoded.role || "customer",
        name: decoded.name,
        ...decoded,
      };
    } catch {
      // Invalid/expired token — treat as anonymous, don't block the request
    }
  }
  next();
};

/**
 * Middleware: Verify Customer role
 * Customers, Owners, and Admins can all access customer-level features
 */
export const verifyCustomer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Authentication required",
    });
  }

  const role = req.user.role;
  if (role === "customer" || role === "owner" || role === "admin") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden: Customer access required",
  });
};

/**
 * Middleware: Verify Owner role
 * Only Owners and Admins can access owner-level features
 */
export const verifyOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Authentication required",
    });
  }

  const role = req.user.role;
  if (role === "owner" || role === "admin") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden: Owner access required",
  });
};

/**
 * Middleware: Verify Admin role
 * Only Admins can access admin-level features
 */
export const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Authentication required",
    });
  }

  if (req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden: Admin access required",
  });
};
