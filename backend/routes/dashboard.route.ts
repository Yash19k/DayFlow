import { Router } from "express";
import { getProjectDashboard } from "../controllers/dashboard.controller";
import { isLoggedIn } from "../middleware/is.loggedin";
import { checkPermission } from "../middleware/check.permissions";


const router = Router();

router.get(
  "/projects/:projectId/dashboard",
 isLoggedIn,checkPermission,
  getProjectDashboard
);

export default router;