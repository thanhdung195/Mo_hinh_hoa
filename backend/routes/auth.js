/**
 * Authentication routes
 *
 * POST /auth/register  – create account + auto-login → redirect /app
 * POST /auth/login     – verify credentials → redirect /app
 * POST /auth/logout    – destroy session → redirect /
 */
import { Router } from "express";
import { pool } from "../db.js";
import { hashPassword, newId, normalizeEmail, verifyPassword } from "../auth.js";

const router = Router();

// ─── Register ─────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const email    = normalizeEmail(req.body?.email);
  const name     = String(req.body?.name || "").trim() || null;
  const password = String(req.body?.password || "");

  if (!email || password.length < 6)
    return res.redirect("/register.html?e=invalid");

  const [rows] = await pool.query(
    "SELECT id FROM users WHERE email = ?", [email]
  );
  if (rows.length) return res.redirect("/register.html?e=taken");

  const id           = newId("usr_");
  const passwordHash = await hashPassword(password);

  await pool.query(
    "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
    [id, email, name, passwordHash]
  );

  req.session.userId = id;
  res.redirect("/app");
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const email    = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!email || !password) return res.redirect("/login.html?e=missing");

  const [rows] = await pool.query(
    "SELECT id, password_hash FROM users WHERE email = ?", [email]
  );
  if (!rows.length) return res.redirect("/login.html?e=auth");

  const ok = await verifyPassword(password, rows[0].password_hash);
  if (!ok) return res.redirect("/login.html?e=auth");

  req.session.userId = rows[0].id;
  res.redirect("/app");
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("fittrack.sid");
    res.redirect("/");
  });
});

export default router;