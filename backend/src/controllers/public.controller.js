import { getVehicleByFolio } from "../repositories/vehicle.repository.js";

export async function getVehicleByFolioPublic(req, res, next) {
  try {
    const folio = String(req.params.folio || "").trim();

    if (!/^\d{5}$/.test(folio)) {
      return next({ status: 400, message: "El folio debe tener 5 digitos." });
    }

    const vehicle = await getVehicleByFolio(folio);
    if (!vehicle) {
      return next({ status: 404, message: "Folio no encontrado." });
    }

    res.json({ ok: true, vehicle });
  } catch (error) {
    next(error);
  }
}
