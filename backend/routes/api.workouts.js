/**
 * Workouts routes
 *
 * GET    /api/workouts       – list all workouts (+ sets) for the current user
 * POST   /api/workouts       – create a new workout with its sets
 * DELETE /api/workouts/:id   – delete a single workout (cascades to sets)
 */
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuthApi, newId } from "../auth.js";
import { toNumberOrNull } from "../helpers.js";

const router = Router();

// ─── GET /api/workouts ────────────────────────────────────────────────────────
router.get("/", requireAuthApi, async (req, res) => {
  const [workouts] = await pool.query(
    `SELECT id, title, performed_at, notes, created_at
     FROM workouts
     WHERE user_id = ?
     ORDER BY performed_at DESC`,
    [req.session.userId]
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
});

// ─── POST /api/workouts ───────────────────────────────────────────────────────
router.post("/", requireAuthApi, async (req, res) => {
  const userId      = req.session.userId;
  const payload     = req.body || {};
  const title       = String(payload.title        || "").trim();
  const performedAt = String(payload.performed_at || "").trim();
  const notes       = String(payload.notes        || "").trim() || null;
  const sets        = Array.isArray(payload.sets) ? payload.sets : [];

  if (!title || !performedAt)
    return res.status(400).json({ error: "Missing title or performed_at." });
  if (!sets.length)
    return res.status(400).json({ error: "Please add at least one exercise set." });

  const workoutId = newId("wo_");
  const conn = await pool.getConnection();

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
        [newId("set_"), workoutId, exercise, toNumberOrNull(s.reps), toNumberOrNull(s.weight), toNumberOrNull(s.rpe)]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const [[workout]] = await pool.query(
    "SELECT id, title, performed_at, notes, created_at FROM workouts WHERE id = ?",
    [workoutId]
  );
  const [workoutSets] = await pool.query(
    "SELECT id, exercise, reps, weight, rpe FROM workout_sets WHERE workout_id = ? ORDER BY created_at ASC",
    [workoutId]
  );

  res.status(201).json({ workout: { ...workout, sets: workoutSets } });
});

// ─── DELETE /api/workouts/:id ─────────────────────────────────────────────────
router.delete("/:id", requireAuthApi, async (req, res) => {
  const userId    = req.session.userId;
  const workoutId = String(req.params.id || "");

  const [rows] = await pool.query(
    "SELECT id FROM workouts WHERE id = ? AND user_id = ?",
    [workoutId, userId]
  );
  if (!rows.length) return res.status(404).json({ error: "Workout not found." });

  await pool.query(
    "DELETE FROM workouts WHERE id = ? AND user_id = ?",
    [workoutId, userId]
  );

  res.json({ ok: true });
});

export default router;