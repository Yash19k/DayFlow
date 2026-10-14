import { Router } from "express";
import { createProject } from "../controllers/project.controller";

const router = Router();

router.post("/", createProject);
router.get("/", getProjects);
router.get("/:projectId", getProjectById);
router.patch("/:projectId", updateProject);
router.delete("/:projectId", deleteProject);

export default router;