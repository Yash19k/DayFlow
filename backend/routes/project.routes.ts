import { Router } from "express";
import { createProject, viewProject, viewProjects } from "../controllers/project.controller";
import { validateCreateProject, validateProjectId } from "../validations/project.validations";
import { isLoggedIn } from "../middleware/is.loggedin";
import { asyncHandler } from "../middleware/async.handler";
import { checkPermission } from "../middleware/check.permissions";
const router = Router();

router.post("/", isLoggedIn, checkPermission("project:create"), validateCreateProject, asyncHandler(createProject));
router.get("/", isLoggedIn, checkPermission("project:read"), asyncHandler(viewProjects));
router.get("/:projectId", isLoggedIn, checkPermission("project:read"), validateProjectId, asyncHandler(viewProject));


export default router;