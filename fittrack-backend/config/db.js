// config/db.js
// MySQL connection pool using mysql2/promise (works with XAMPP's MySQL)
// Edit host/user/password/database to match your XAMPP setup.

import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT || 3306),
  user:     process.env.DB_USER     || "root",       // XAMPP default
  password: process.env.DB_PASS     || "",           // XAMPP default (empty)
  database: process.env.DB_NAME     || "fittrack",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

// ─── Schema migration ─────────────────────────────────────────────────────────
// Run once on server start. Safe to call repeatedly (uses IF NOT EXISTS).
export async function migrate() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`fittrack\``);
    await conn.query(`USE \`fittrack\``);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           VARCHAR(64)  PRIMARY KEY,
        email        VARCHAR(255) NOT NULL UNIQUE,
        name         VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id      VARCHAR(64)  PRIMARY KEY,
        location     VARCHAR(255),
        height_cm    FLOAT,
        birthday     DATE,
        weight_kg    FLOAT,
        body_fat     FLOAT,
        bmi          FLOAT,
        active_streak INT NOT NULL DEFAULT 0,
        updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id           VARCHAR(64)  PRIMARY KEY,
        user_id      VARCHAR(64)  NOT NULL,
        title        VARCHAR(255) NOT NULL,
        performed_at DATETIME     NOT NULL,
        notes        TEXT,
        created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS workout_sets (
        id          VARCHAR(64) PRIMARY KEY,
        workout_id  VARCHAR(64) NOT NULL,
        exercise    VARCHAR(255) NOT NULL,
        reps        INT,
        weight      FLOAT,
        rpe         FLOAT,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS progress_metrics (
        id          VARCHAR(64) PRIMARY KEY,
        user_id     VARCHAR(64) NOT NULL,
        metric      VARCHAR(100) NOT NULL,
        value       FLOAT NOT NULL,
        unit        VARCHAR(50),
        recorded_at DATETIME NOT NULL,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log("✅  MySQL migration complete");
  } finally {
    conn.release();
  }
}
