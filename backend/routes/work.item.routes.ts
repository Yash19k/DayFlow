import { checkPermission } from './../middleware/check.permissions';

import { Router } from "express";
import {validateCreateWorkItem,} from "../validations/work.item.validations";
import { isLoggedIn } from "../middleware/is.loggedin";
import { createWorkItem, getProjectWorkItems } from "../controllers/task.controller";
import { asyncHandler } from "../middleware/async.handler";

const router = Router();


router.post("/", isLoggedIn,checkPermission ,validateCreateWorkItem, asyncHandler(createWorkItem));
router.get( "/project/:projectId",isLoggedIn , checkPermission,asyncHandler(getProjectWorkItems));

export default router;
