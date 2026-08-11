import { query } from "../config/db.js";

export async function getUserByEmail(email) {
  const result = await query(
    `select id, name, email, password_hash, role, is_active
     from users
     where email = $1
     limit 1`,
    [email.toLowerCase()]
  );

  return result.rows[0] || null;
}

export async function getUserById(id) {
  const result = await query(
    `select id, name, email, role, is_active
     from users
     where id = $1
     limit 1`,
    [id]
  );

  return result.rows[0] || null;
}
