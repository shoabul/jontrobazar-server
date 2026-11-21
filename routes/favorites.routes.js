import express from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
} from "../controllers/favorites.controller.js";
import { verifyToken } from "../middlewares/auth.js";
import { validate, schemas } from "../middlewares/validate.js";

const router = express.Router();

// All favorite routes require authentication
router.get("/", verifyToken, getFavorites);                                    // GET   /api/favorites
router.post("/", verifyToken, validate(schemas.addFavorite), addFavorite);     // POST  /api/favorites
router.get("/check/:equipmentId", verifyToken, validate(schemas.favoriteCheck), checkFavorite); // GET   /api/favorites/check/:equipmentId
router.delete("/:equipmentId", verifyToken, removeFavorite);                   // DELETE /api/favorites/:equipmentId

export default router;