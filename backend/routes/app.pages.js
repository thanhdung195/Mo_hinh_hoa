/**
 * App page routes  (all require an active session)
 *
 * GET /app            → user/home.html      (Profile / Dashboard)
 * GET /app/workouts   → user/workouts.html  (Create & list workouts)
 * GET /app/progress   → user/progress.html  (Progress overview)
 */
import { Router } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const USER_DIR   = path.join(__dirname, "../../user"); // → project-root/user/

const router = Router();

router.get("/",          requireAuth, (_req, res) => res.sendFile(path.join(USER_DIR, "home.html")));
router.get("/workouts",  requireAuth, (_req, res) => res.sendFile(path.join(USER_DIR, "workouts.html")));
router.get("/progress",  requireAuth, (_req, res) => res.sendFile(path.join(USER_DIR, "progress.html")));

export default router;