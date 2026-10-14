import { Router } from "express";

import { createSprint } from "../controllers/sprint.controller";
import { isLoggedIn } from "../middleware/is.loggedin";
import { validateCreateSprint } from "../middleware/sprint.validate"
import { checkPermission } from "../middleware/check.permissions";
import { asyncHandler } from "../middleware/async.handler";
const router = Router();

// Create a sprint and optionally create work items inside it
router.post(
  "/projects/:projectId/sprints",
  isLoggedIn,checkPermission,
  validateCreateSprint,
  asyncHandler(createSprint)
);

export default router;