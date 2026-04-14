/**
 * GET /api/me
 *
 * Returns the basic info of the currently authenticated user.
 * Used by app.js to populate the avatar button and avatar dropdown menu
 * ([data-user-name], [data-user-email], [data-avatar]).
 */
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuthApi } from "../auth.js";

const router = Router();

router.get("/", requireAuthApi, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, email, name, created_at FROM users WHERE id = ?",
    [req.session.userId]
  );
  res.json({ user: rows[0] ?? null });
});

export default router;