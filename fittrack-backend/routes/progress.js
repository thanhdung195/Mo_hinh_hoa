// routes/progress.js
// Optional endpoint for storing arbitrary body-metric snapshots
// (weight, body_fat, etc.) from the Progress page.
import { Router }       from "express";
import { pool }         from "../config/db.js";
import { newId }        from "../auth.js";
import { requireAuthAPI } from "../auth.js";

const router = Router();

// ── GET /api/progress ─────────────────────────────────────────────────────────
// Returns the last 90 entries for the authenticated user.
router.get("/", requireAuthAPI, async (req, res) => {
  const userId = req.session.userId;
  try {
    const [rows] = await pool.query(
      `SELECT id, metric, value, unit, recorded_at
       FROM progress_metrics
       WHERE user_id = ?
       ORDER BY recorded_at DESC
       LIMIT 90`,
      [userId]
    );
    res.json({ metrics: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

// ── POST /api/progress ────────────────────────────────────────────────────────
// Body: { metric: "weight_kg", value: 72.5, unit: "kg", recorded_at: "2024-06-01" }
router.post("/", requireAuthAPI, async (req, res) => {
  const userId = req.session.userId;
  const b      = req.body || {};

  const metric      = String(b.metric || "").trim();
  const value       = Number(b.value);
  const unit        = String(b.unit || "").trim() || null;
  const recordedAt  = String(b.recorded_at || "").trim() || new Date().toISOString().slice(0, 10);

  if (!metric || !Number.isFinite(value)) {
    return res.status(400).json({ error: "metric and value are required." });
  }

  try {
    const id = newId("pm_");
    await pool.query(
      "INSERT INTO progress_metrics (id, user_id, metric, value, unit, recorded_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, userId, metric, value, unit, recordedAt]
    );
    res.status(201).json({ metric: { id, metric, value, unit, recorded_at: recordedAt } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

export default router;
