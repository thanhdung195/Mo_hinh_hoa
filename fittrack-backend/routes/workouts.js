// routes/workouts.js
import { Router }       from "express";
import { pool }         from "../config/db.js";
import { newId }        from "../auth.js";
import { requireAuthAPI } from "../auth.js";

const router = Router();

const toNum = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ── GET /api/workouts ─────────────────────────────────────────────────────────
router.get("/", requireAuthAPI, async (req, res) => {
  const userId = req.session.userId;
  try {
    const [workouts] = await pool.query(
      `SELECT id, title, performed_at, notes, created_at
       FROM workouts
       WHERE user_id = ?
       ORDER BY performed_at DESC`,
      [userId]
    );

    // Attach sets to each workout
    const result = await Promise.all(
      workouts.map(async (w) => {
        const [sets] = await pool.query(
          `SELECT id, exercise, reps, weight, rpe
           FROM workout_sets
           WHERE workout_id = ?
           ORDER BY created_at ASC`,
          [w.id]
        );
        return { ...w, sets };
      })
    );

    res.json({ workouts: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

// ── POST /api/workouts ────────────────────────────────────────────────────────
router.post("/", requireAuthAPI, async (req, res) => {
  const userId = req.session.userId;
  const body   = req.body || {};

  const title       = String(body.title || "").trim();
  const performedAt = String(body.performed_at || "").trim();
  const notes       = String(body.notes || "").trim() || null;
  const sets        = Array.isArray(body.sets) ? body.sets : [];

  if (!title || !performedAt) {
    return res.status(400).json({ error: "Missing title or performed_at." });
  }
  if (!sets.length) {
    return res.status(400).json({ error: "Please add at least one exercise set." });
  }

  const workoutId = newId("wo_");
  const conn      = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      "INSERT INTO workouts (id, user_id, title, performed_at, notes) VALUES (?, ?, ?, ?, ?)",
      [workoutId, userId, title, performedAt, notes]
    );

    for (const s of sets) {
      const exercise = String(s?.exercise || "").trim();
      if (!exercise) continue;
      await conn.query(
        "INSERT INTO workout_sets (id, workout_id, exercise, reps, weight, rpe) VALUES (?, ?, ?, ?, ?, ?)",
        [newId("set_"), workoutId, exercise, toNum(s.reps), toNum(s.weight), toNum(s.rpe)]
      );
    }

    await conn.commit();

    // Return the newly-created workout with its sets
    const [[workout]] = await conn.query(
      "SELECT id, title, performed_at, notes, created_at FROM workouts WHERE id = ?",
      [workoutId]
    );
    const [workoutSets] = await conn.query(
      "SELECT id, exercise, reps, weight, rpe FROM workout_sets WHERE workout_id = ? ORDER BY created_at ASC",
      [workoutId]
    );

    res.status(201).json({ workout: { ...workout, sets: workoutSets } });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Server error." });
  } finally {
    conn.release();
  }
});

// ── DELETE /api/workouts/:id ──────────────────────────────────────────────────
router.delete("/:id", requireAuthAPI, async (req, res) => {
  const userId    = req.session.userId;
  const workoutId = String(req.params.id || "");

  try {
    const [[row]] = await pool.query(
      "SELECT id FROM workouts WHERE id = ? AND user_id = ?",
      [workoutId, userId]
    );
    if (!row) return res.status(404).json({ error: "Workout not found." });

    await pool.query(
      "DELETE FROM workouts WHERE id = ? AND user_id = ?",
      [workoutId, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

export default router;
