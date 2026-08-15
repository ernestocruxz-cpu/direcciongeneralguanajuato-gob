import { Router } from "express";
import {
  createVehicle,
  deleteVehicle,
  downloadVehiclePermit,
  getVehicle,
  listVehicles,
  updateVehicle,
} from "../controllers/vehicle.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", requireRole("admin", "capturista"), listVehicles);
router.get("/:folio", requireRole("admin", "capturista"), getVehicle);
router.get("/:folio/pdf", requireRole("admin", "capturista"), downloadVehiclePermit);
router.post("/", requireRole("admin", "capturista"), createVehicle);
router.put("/:folio", requireRole("admin", "capturista"), updateVehicle);
router.delete("/:folio", requireRole("admin", "capturista"), deleteVehicle);

export default router;
