import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getUserByEmail } from "../repositories/user.repository.js";
import { loginSchema } from "../validators/auth.validator.js";

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await getUserByEmail(data.email);

    if (!user || !user.is_active) {
      return next({ status: 401, message: "Credenciales incorrectas." });
    }

    const passwordOk = await bcrypt.compare(data.password, user.password_hash);
    if (!passwordOk) {
      return next({ status: 401, message: "Credenciales incorrectas." });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}
