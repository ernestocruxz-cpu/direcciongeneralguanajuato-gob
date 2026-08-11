import { z } from "zod";

export const createVehicleSchema = z
  .object({
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de expedicion invalida."),
    expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de vencimiento invalida."),
    brand: z.string().trim().min(2).max(80),
    line: z.string().trim().min(1).max(80),
    modelYear: z.coerce.number().int().min(1000).max(9999),
    color: z.string().trim().min(2).max(60),
    ownerName: z.string().trim().min(3).max(160),
    serialNumber: z.string().trim().min(5).max(17),
    engineNumber: z.string().trim().min(1).max(40),
  })
  .refine((data) => data.expirationDate > data.issueDate, {
    message: "La fecha de vencimiento debe ser posterior a la fecha de expedicion.",
    path: ["expirationDate"],
  });
