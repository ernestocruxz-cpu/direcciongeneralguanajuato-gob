import { createVehicleRecord, getVehicleByFolio, listVehicleRecords } from "../repositories/vehicle.repository.js";
import { buildPermitPdf } from "../services/permitPdf.service.js";
import { createVehicleSchema } from "../validators/vehicle.validator.js";

export async function listVehicles(req, res, next) {
  try {
    const vehicles = await listVehicleRecords();
    res.json({ ok: true, vehicles });
  } catch (error) {
    next(error);
  }
}

export async function createVehicle(req, res, next) {
  try {
    const data = createVehicleSchema.parse(req.body);
    const vehicle = await createVehicleRecord(data, req.user.id);
    res.status(201).json({ ok: true, vehicle });
  } catch (error) {
    next(error);
  }
}

export async function downloadVehiclePermit(req, res, next) {
  try {
    const folio = String(req.params.folio || "").trim();

    if (!/^\d{5}$/.test(folio)) {
      return next({ status: 400, message: "El folio debe tener 5 digitos." });
    }

    const vehicle = await getVehicleByFolio(folio);
    if (!vehicle) {
      return next({ status: 404, message: "Folio no encontrado." });
    }

    const pdf = await buildPermitPdf(vehicle);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=\"permiso-${folio}.pdf\"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
}
