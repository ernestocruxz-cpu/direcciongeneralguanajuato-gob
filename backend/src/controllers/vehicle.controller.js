import {
  cancelVehicleRecord,
  createVehicleRecord,
  getVehicleByFolio,
  listVehicleRecords,
  updateVehicleRecord,
} from "../repositories/vehicle.repository.js";
import { buildPermitPdf } from "../services/permitPdf.service.js";
import { createVehicleSchema } from "../validators/vehicle.validator.js";

function parseFolio(value) {
  const folio = String(value || "").trim();

  if (!/^\d{6}$/.test(folio)) {
    throw { status: 400, message: "El folio debe tener 6 digitos." };
  }

  return folio;
}

export async function listVehicles(req, res, next) {
  try {
    const result = await listVehicleRecords({
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search,
      createdDate: req.query.createdDate,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getVehicle(req, res, next) {
  try {
    const folio = parseFolio(req.params.folio);
    const vehicle = await getVehicleByFolio(folio);

    if (!vehicle) {
      return next({ status: 404, message: "Folio no encontrado." });
    }

    res.json({ ok: true, vehicle });
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

export async function updateVehicle(req, res, next) {
  try {
    const folio = parseFolio(req.params.folio);
    const data = createVehicleSchema.parse(req.body);
    const vehicle = await updateVehicleRecord(folio, data);

    if (!vehicle) {
      return next({ status: 404, message: "Folio no encontrado." });
    }

    res.json({ ok: true, vehicle });
  } catch (error) {
    next(error);
  }
}

export async function deleteVehicle(req, res, next) {
  try {
    const folio = parseFolio(req.params.folio);
    const vehicle = await cancelVehicleRecord(folio);

    if (!vehicle) {
      return next({ status: 404, message: "Folio no encontrado." });
    }

    res.json({ ok: true, message: "Registro eliminado." });
  } catch (error) {
    next(error);
  }
}

export async function downloadVehiclePermit(req, res, next) {
  try {
    const folio = parseFolio(req.params.folio);

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
