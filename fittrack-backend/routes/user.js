// routes/user.js
import { Router }       from "express";
import { pool }         from "../config/db.js";
import { requireAuthAPI } from "../auth.js";

const router = Router();

// Helper – coerce to finite number or null
const toNum = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ── GET /api/me ───────────────────────────────────────────────────────────────
router.get("/me", requireAuthAPI, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, email, name, created_at FROM users WHERE id = ?",
      [req.session.userId]
    );
    res.json({ user: rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

// ── GET /api/profile ──────────────────────────────────────────────────────────
router.get("/profile", requireAuthAPI, async (req, res) => {
  const userId = req.session.userId;
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.name,
              p.location, p.height_cm, p.birthday, p.weight_kg,
              p.body_fat, p.bmi, p.active_streak
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );
    const [countRows] = await pool.query(
      "SELECT COUNT(*) AS c FROM workouts WHERE user_id = ?",
      [userId]
    );
    res.json({
      profile: { ...rows[0], total_workouts: Number(countRows[0]?.c || 0) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

// ── PUT /api/profile ──────────────────────────────────────────────────────────
router.put("/profile", requireAuthAPI, async (req, res) => {
  const userId = req.session.userId;
  const p      = req.body || {};

  const name        = String(p.name || "").trim() || null;
  const location    = String(p.location || "").trim() || null;
  const birthday    = String(p.birthday || "").trim() || null;
  const heightCm    = toNum(p.height_cm);
  const weightKg    = toNum(p.weight_kg);
  const bodyFat     = toNum(p.body_fat);
  const bmi         = toNum(p.bmi);
  const activeStreak = Math.max(0, parseInt(p.active_streak, 10) || 0);

  try {
    if (name) {
      await pool.query(
        "UPDATE users SET name = ? WHERE id = ?",
        [name, userId]
      );
    }

    // UPSERT (MySQL: INSERT … ON DUPLICATE KEY UPDATE)
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
         active_streak = VALUES(active_streak),
         updated_at    = CURRENT_TIMESTAMP`,
      [userId, location, heightCm, birthday || null, weightKg, bodyFat, bmi, activeStreak]
    );

    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.name,
              p.location, p.height_cm, p.birthday, p.weight_kg,
              p.body_fat, p.bmi, p.active_streak
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );
    res.json({ profile: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

export default router;
