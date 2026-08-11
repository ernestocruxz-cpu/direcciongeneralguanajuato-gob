import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getUserById } from "../repositories/user.repository.js";

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return next({ status: 401, message: "Token requerido." });
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await getUserById(payload.sub);

    if (!user || !user.is_active) {
      return next({ status: 401, message: "Sesion no valida." });
    }

    req.user = user;
    next();
  } catch {
    next({ status: 401, message: "Token invalido o expirado." });
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next({ status: 403, message: "No tienes permiso para esta accion." });
    }
    next();
  };
}
