import mysql from "mysql2/promise";
import { DB_CONFIG } from "./config.js";

// ─── Connection pool ──────────────────────────────────────────────────────────
// mysql2 promise pool: all queries return Promises, compatible with async/await.
export const pool = mysql.createPool(DB_CONFIG);

// ─── Migrations ───────────────────────────────────────────────────────────────
// Creates all tables the first time (IF NOT EXISTS).
// Run once at startup from server.js.
export async function migrate() {
  const conn = await pool.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            VARCHAR(64)  NOT NULL PRIMARY KEY,
        email         VARCHAR(255) NOT NULL UNIQUE,
        name          VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id           VARCHAR(64)  NOT NULL PRIMARY KEY,
        user_id      VARCHAR(64)  NOT NULL,
        title        VARCHAR(255) NOT NULL,
        performed_at DATETIME     NOT NULL,
        notes        TEXT,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS workout_sets (
        id         VARCHAR(64)  NOT NULL PRIMARY KEY,
        workout_id VARCHAR(64)  NOT NULL,
        exercise   VARCHAR(255) NOT NULL,
        reps       INT,
        weight     FLOAT,
        rpe        FLOAT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS progress_metrics (
        id          VARCHAR(64)  NOT NULL PRIMARY KEY,
        user_id     VARCHAR(64)  NOT NULL,
        metric      VARCHAR(100) NOT NULL,
        value       FLOAT        NOT NULL,
        unit        VARCHAR(50),
        recorded_at DATETIME     NOT NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id       VARCHAR(64) NOT NULL PRIMARY KEY,
        location      VARCHAR(255),
        height_cm     FLOAT,
        birthday      DATE,
        weight_kg     FLOAT,
        body_fat      FLOAT,
        bmi           FLOAT,
        active_streak INT         NOT NULL DEFAULT 0,
        updated_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("✅  MySQL migrations complete.");
  } finally {
    conn.release();
  }
}