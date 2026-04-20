// server.js  ──  FitTrack backend (MySQL / XAMPP edition)
// Drop this entire `fittrack-backend/` folder next to your frontend folder,
// run `npm install` then `npm run dev`.
//
// The server serves the frontend's static files AND handles all API/auth routes.
// Point it at your frontend root via FRONTEND_DIR env var (default: ../  relative
// to this file, i.e. the sibling folder where index.html lives).

import express  from "express";
import session  from "express-session";
import path     from "node:path";
import { fileURLToPath } from "node:url";

import { migrate }      from "./config/db.js";
import { requireAuth }  from "./auth.js";

import authRoutes     from "./routes/auth.js";
import userRoutes     from "./routes/user.js";
import workoutRoutes  from "./routes/workouts.js";
import progressRoutes from "./routes/progress.js";

// ─── Paths ────────────────────────────────────────────────────────────────────
const __filename   = fileURLToPath(import.meta.url);
const __dirname    = path.dirname(__filename);
// Default: serve the frontend that lives one level up (sibling folder)
const FRONTEND_DIR = process.env.FRONTEND_DIR
  ? path.resolve(process.env.FRONTEND_DIR)
  : path.resolve(__dirname, "..");

// ─── App setup ────────────────────────────────────────────────────────────────
const app  = express();
const PORT = Number(process.env.PORT || 3000);

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

// Run DB migrations before accepting traffic
await migrate();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    name:   "fittrack.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure:   false,   // set to true when behind HTTPS in production
    },
  })
);

// Serve frontend static assets (css, js, images, html pages)
app.use(express.static(FRONTEND_DIR));

// ─── Routes ───────────────────────────────────────────────────────────────────

// Auth pages: redirect already-logged-in users to /app
app.get(["/login.html", "/register.html"], (req, res, next) => {
  if (req.session?.userId) return res.redirect("/app");
  next();
});

// Auth flow (register / login / logout)
app.use("/auth", authRoutes);

// JSON APIs
app.use("/api",          userRoutes);      // /api/me, /api/profile
app.use("/api/workouts", workoutRoutes);   // /api/workouts
app.use("/api/progress", progressRoutes);  // /api/progress

// ─── Guarded app pages ────────────────────────────────────────────────────────
const send = (file) => (_req, res) =>
  res.sendFile(path.join(FRONTEND_DIR, "user", file));

app.get("/app",           requireAuth, send("home.html"));
app.get("/app/workouts",  requireAuth, send("workouts.html"));
app.get("/app/progress",  requireAuth, send("progress.html"));

// Root
app.get("/", (_req, res) =>
  res.sendFile(path.join(FRONTEND_DIR, "index.html"))
);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  FitTrack running at http://localhost:${PORT}`);
  console.log(`    Serving frontend from: ${FRONTEND_DIR}`);
});

// Keep alive on Windows terminals
setInterval(() => {}, 60_000);
