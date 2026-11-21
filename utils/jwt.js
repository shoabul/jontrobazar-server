import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required but not set");
}

/**
 * Generate a signed JWT token
 * @param {Object} payload - User object (e.g. { id, email, role, name })
 * @param {string} expiresIn - Token lifetime (e.g. "7d", "1h")
 * @returns {string} Signed JWT
 */
export const generateToken = (payload, expiresIn = "7d") => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Verify a JWT token and return decoded payload
 * @param {string} token - Bearer token string
 * @returns {Object} Decoded user payload
 */
export const verifyJWT = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
