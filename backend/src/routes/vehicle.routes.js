import { Router } from "express";
import { createVehicle, downloadVehiclePermit, listVehicles } from "../controllers/vehicle.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", requireRole("admin", "capturista"), listVehicles);
router.get("/:folio/pdf", requireRole("admin", "capturista"), downloadVehiclePermit);
router.post("/", requireRole("admin", "capturista"), createVehicle);

export default router;
