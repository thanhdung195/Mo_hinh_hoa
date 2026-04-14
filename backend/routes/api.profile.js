/**
 * Profile routes
 *
 * GET /api/profile   – fetch current user's profile + total workout count
 * PUT /api/profile   – upsert user_profiles row + update users.name
 */
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuthApi } from "../auth.js";
import { toNumberOrNull } from "../helpers.js";

const router = Router();

// ─── Shared profile SELECT ────────────────────────────────────────────────────
async function selectProfile(userId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.name,
            p.location, p.height_cm, p.birthday,
            p.weight_kg, p.body_fat, p.bmi, p.active_streak
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );
  return rows[0] ?? null;
}

// ─── GET ──────────────────────────────────────────────────────────────────────
router.get("/", requireAuthApi, async (req, res) => {
  const userId = req.session.userId;
  const profile = await selectProfile(userId);

  const [[{ c }]] = await pool.query(
    "SELECT COUNT(*) AS c FROM workouts WHERE user_id = ?", [userId]
  );

  res.json({ profile: { ...profile, total_workouts: c } });
});

// ─── PUT ──────────────────────────────────────────────────────────────────────
router.put("/", requireAuthApi, async (req, res) => {
  const userId  = req.session.userId;
  const payload = req.body || {};

  const name         = String(payload.name     || "").trim() || null;
  const location     = String(payload.location || "").trim() || null;
  const birthday     = String(payload.birthday || "").trim() || null;
  const heightCm     = toNumberOrNull(payload.height_cm);
  const weightKg     = toNumberOrNull(payload.weight_kg);
  const bodyFat      = toNumberOrNull(payload.body_fat);
  const bmi          = toNumberOrNull(payload.bmi);
  const activeStreak = Number.isInteger(Number(payload.active_streak))
    ? Math.max(0, Number(payload.active_streak))
    : 0;

  // Update display name if provided
  if (name) {
    await pool.query("UPDATE users SET name = ? WHERE id = ?", [name, userId]);
  }

  // Upsert profile row (MySQL INSERT … ON DUPLICATE KEY UPDATE)
  await pool.query(
    `INSERT INTO user_profiles
       (user_id, location, height_cm, birthday, weight_kg, body_fat, bmi, active_streak)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       location      = VALUES(location),
       height_cm     = VALUES(height_cm),
       birthday      = VALUES(birthday),
       weight_kg     = VALUES(weight_kg),
       body_fat      = VALUES(body_fat),
       bmi           = VALUES(bmi),
       active_streak = VALUES(active_streak)`,
    [userId, location, heightCm, birthday, weightKg, bodyFat, bmi, activeStreak]
  );

  res.json({ profile: await selectProfile(userId) });
});

export default router;