// routes/auth.js
import { Router } from "express";
import { pool }   from "../config/db.js";
import { hashPassword, newId, normalizeEmail, verifyPassword } from "../auth.js";

const router = Router();

// ── POST /auth/register ───────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const email    = normalizeEmail(req.body?.email);
  const name     = String(req.body?.name || "").trim() || null;
  const password = String(req.body?.password || "");

  if (!email || password.length < 6) {
    return res.redirect("/register.html?e=invalid");
  }

  try {
    const [rows] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
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
  } catch (err) {
    console.error("Register error:", err);
    res.redirect("/register.html?e=invalid");
  }
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const email    = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!email || !password) return res.redirect("/login.html?e=missing");

  try {
    const [rows] = await pool.query(
      "SELECT id, password_hash FROM users WHERE email = ?",
      [email]
    );
    const user = rows[0];
    if (!user) return res.redirect("/login.html?e=auth");

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.redirect("/login.html?e=auth");

    req.session.userId = user.id;
    res.redirect("/app");
  } catch (err) {
    console.error("Login error:", err);
    res.redirect("/login.html?e=auth");
  }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("fittrack.sid");
    res.redirect("/");
  });
});

export default router;
