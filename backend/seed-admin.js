
import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "./db.js";

async function createAdmin() {
  try {
    const username = process.env.ADMIN_USERNAME?.trim();
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password || password.length < 12) {
      throw new Error(
        "Set ADMIN_USERNAME and ADMIN_PASSWORD in .env. Password must be at least 12 characters."
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `UPDATE users
       SET full_name = ?,
           password_hash = ?,
           role = 'admin',
           is_active = 1
       WHERE username = ?`,
      ["System Administrator", passwordHash, username]
    );

    if (result.affectedRows > 0) {
      console.log(`Admin account "${username}" updated successfully.`);
    } else {
      await pool.execute(
        `INSERT INTO users (full_name, username, password_hash, role, is_active)
         VALUES (?, ?, ?, 'admin', 1)`,
        ["System Administrator", username, passwordHash]
      );

      console.log(`Admin account "${username}" created successfully.`);
    }
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createAdmin();
