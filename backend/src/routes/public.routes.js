import { Router } from "express";
import { getVehicleByFolioPublic } from "../controllers/public.controller.js";

const router = Router();

router.get("/folios/:folio", getVehicleByFolioPublic);

export default router;
