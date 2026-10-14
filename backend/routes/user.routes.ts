import { Router, Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/data.source";
import { User, UserRole, UserStatus } from "../entities/user.entity";
import { registerOrganization } from "../controllers/user.controller";


const router = Router();
const userRepository = AppDataSource.getRepository(User);

router.post("/", registerOrganization);

export default router;
