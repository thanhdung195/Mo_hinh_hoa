import express from "express";
import session from "express-session";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { db, migrate } from "./db.js";
import { hashPassword, newId, normalizeEmail, requireAuth, verifyPassword } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const toNumberOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// DB migrations
migrate();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    name: "fittrack.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    }
  })
);

// Serve static assets in project root (styles.css, app.js, images, etc.)
app.use(express.static(__dirname));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Redirect logged-in users away from auth pages
app.get(["/login.html", "/register.html"], (req, res, next) => {
  if (req.session?.userId) return res.redirect("/app");
  next();
});

app.post("/auth/register", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const name = String(req.body?.name || "").trim() || null;
  const password = String(req.body?.password || "");

  if (!email || password.length < 6) {
    return res.redirect("/register.html?e=invalid");
  }

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) return res.redirect("/register.html?e=taken");

  const id = newId("usr_");
  const passwordHash = await hashPassword(password);
  db.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?,?,?,?)").run(id, email, name, passwordHash);

  req.session.userId = id;
  res.redirect("/app");
});

app.post("/auth/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  if (!email || !password) return res.redirect("/login.html?e=missing");

  const user = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email);
  if (!user) return res.redirect("/login.html?e=auth");

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.redirect("/login.html?e=auth");

  req.session.userId = user.id;
  res.redirect("/app");
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("fittrack.sid");
    res.redirect("/");
  });
});

app.get("/api/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT id, email, name, created_at FROM users WHERE id = ?").get(req.session.userId);
  res.json({ user });
});

app.get("/api/profile", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, p.location, p.height_cm, p.birthday, p.weight_kg, p.body_fat, p.bmi, p.active_streak
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ?`
    )
    .get(userId);
  const totalWorkouts = db.prepare("SELECT COUNT(*) AS c FROM workouts WHERE user_id = ?").get(userId)?.c || 0;
  res.json({
    profile: {
      ...row,
      total_workouts: totalWorkouts
    }
  });
});

app.put("/api/profile", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const payload = req.body || {};
  const name = String(payload.name || "").trim() || null;
  const location = String(payload.location || "").trim() || null;
  const birthday = String(payload.birthday || "").trim() || null;
  const heightCm = toNumberOrNull(payload.height_cm);
  const weightKg = toNumberOrNull(payload.weight_kg);
  const bodyFat = toNumberOrNull(payload.body_fat);
  const bmi = toNumberOrNull(payload.bmi);
  const activeStreak = Number.isInteger(Number(payload.active_streak))
    ? Math.max(0, Number(payload.active_streak))
    : 0;

  db.prepare("UPDATE users SET name = COALESCE(?, name) WHERE id = ?").run(name, userId);
  db.prepare(
    `INSERT INTO user_profiles (user_id, location, height_cm, birthday, weight_kg, body_fat, bmi, active_streak, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       location = excluded.location,
       height_cm = excluded.height_cm,
       birthday = excluded.birthday,
       weight_kg = excluded.weight_kg,
       body_fat = excluded.body_fat,
       bmi = excluded.bmi,
       active_streak = excluded.active_streak,
       updated_at = datetime('now')`
  ).run(userId, location, heightCm, birthday, weightKg, bodyFat, bmi, activeStreak);

  const profile = db
    .prepare(
      `SELECT u.id, u.email, u.name, p.location, p.height_cm, p.birthday, p.weight_kg, p.body_fat, p.bmi, p.active_streak
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ?`
    )
    .get(userId);
  res.json({ profile });
});

app.get("/api/workouts", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const workouts = db
    .prepare("SELECT id, title, performed_at, notes, created_at FROM workouts WHERE user_id = ? ORDER BY datetime(performed_at) DESC")
    .all(userId);
  const setStmt = db.prepare(
    "SELECT id, exercise, reps, weight, rpe FROM workout_sets WHERE workout_id = ? ORDER BY created_at ASC"
  );
  const result = workouts.map((w) => ({ ...w, sets: setStmt.all(w.id) }));
  res.json({ workouts: result });
});

app.post("/api/workouts", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const payload = req.body || {};
  const title = String(payload.title || "").trim();
  const performedAt = String(payload.performed_at || "").trim();
  const notes = String(payload.notes || "").trim() || null;
  const sets = Array.isArray(payload.sets) ? payload.sets : [];
  if (!title || !performedAt) return res.status(400).json({ error: "Missing title or performed_at." });
  if (!sets.length) return res.status(400).json({ error: "Please add at least one exercise set." });

  const workoutId = newId("wo_");
  const insertWorkout = db.prepare("INSERT INTO workouts (id, user_id, title, performed_at, notes) VALUES (?,?,?,?,?)");
  const insertSet = db.prepare(
    "INSERT INTO workout_sets (id, workout_id, exercise, reps, weight, rpe) VALUES (?,?,?,?,?,?)"
  );

  const tx = db.transaction(() => {
    insertWorkout.run(workoutId, userId, title, performedAt, notes);
    for (const s of sets) {
      const exercise = String(s?.exercise || "").trim();
      if (!exercise) continue;
      insertSet.run(newId("set_"), workoutId, exercise, toNumberOrNull(s.reps), toNumberOrNull(s.weight), toNumberOrNull(s.rpe));
    }
  });
  tx();

  const workout = db.prepare("SELECT id, title, performed_at, notes, created_at FROM workouts WHERE id = ?").get(workoutId);
  const workoutSets = db
    .prepare("SELECT id, exercise, reps, weight, rpe FROM workout_sets WHERE workout_id = ? ORDER BY created_at ASC")
    .all(workoutId);
  res.status(201).json({ workout: { ...workout, sets: workoutSets } });
});

app.delete("/api/workouts/:id", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const workoutId = String(req.params.id || "");
  const row = db.prepare("SELECT id FROM workouts WHERE id = ? AND user_id = ?").get(workoutId, userId);
  if (!row) return res.status(404).json({ error: "Workout not found." });
  db.prepare("DELETE FROM workouts WHERE id = ? AND user_id = ?").run(workoutId, userId);
  res.json({ ok: true });
});

// Logged-in app (demo)
app.get("/app", requireAuth, (_req, res) => res.sendFile(path.join(__dirname, "user", "home.html")));
app.get("/app/workouts", requireAuth, (_req, res) => res.sendFile(path.join(__dirname, "user", "workouts.html")));
app.get("/app/progress", requireAuth, (_req, res) => res.sendFile(path.join(__dirname, "user", "progress.html")));

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

server.on("close", () => {
  console.log("HTTP server closed");
});

process.on("SIGINT", () => {
  console.log("SIGINT received");
});
process.on("SIGTERM", () => {
  console.log("SIGTERM received");
});

// Keep the process alive reliably on Windows terminals
setInterval(() => {}, 60_000);

