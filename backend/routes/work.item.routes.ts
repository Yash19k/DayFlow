import { Router } from "express";
import { validateCreateWorkItem, validateUpdateWorkItem, validateViewProjectWorkItems } from "../validations/work.item.validations";
import { isLoggedIn } from "../middleware/is.loggedin";
import { createWorkItem, deleteWorkItem, getProjectWorkItems, updateWorkItem } from "../controllers/task.controller";
import { asyncHandler } from "../middleware/async.handler";
import { checkPermission } from "../middleware/check.permissions";

const router = Router();


router.post("/", isLoggedIn, checkPermission("task:create"), validateCreateWorkItem, asyncHandler(createWorkItem));
router.patch("/:workItemId", isLoggedIn, checkPermission("task:update"), validateUpdateWorkItem, asyncHandler(updateWorkItem));
router.delete("/:workItemId", isLoggedIn, checkPermission("task:delete"), asyncHandler(deleteWorkItem));
router.get("/project/:projectId", isLoggedIn, checkPermission("task:read"), validateViewProjectWorkItems, asyncHandler(getProjectWorkItems));

export default router;
