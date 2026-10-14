import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/data.source";
import { User, UserRole, UserStatus } from "../entities/user.entity";
import { signupSchema } from "../validations/user.validator";
import { userSignUp } from "../controllers/user.controller";
import { isLoggedIn } from "../middleware/is.loggedin";

const router = Router();
const userRepository = AppDataSource.getRepository(User);

router.post("/auth", userSignUp);

export default router;
