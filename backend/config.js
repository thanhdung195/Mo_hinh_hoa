// ─── App Configuration ────────────────────────────────────────────────────────
// XAMPP MySQL defaults: host=127.0.0.1, port=3306, user=root, no password.
// Override any value with a .env file + dotenv, or set environment variables.

export const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

export const SESSION_SECRET =
  process.env.SESSION_SECRET || "dev-secret-change-me";

export const DB_CONFIG = {
  host:     process.env.DB_HOST     || "127.0.0.1",
  port:     process.env.DB_PORT     ? Number(process.env.DB_PORT) : 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",          // XAMPP default: empty
  database: process.env.DB_NAME     || "fittrack",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
};