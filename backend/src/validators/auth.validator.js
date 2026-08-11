import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo invalido."),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
});
