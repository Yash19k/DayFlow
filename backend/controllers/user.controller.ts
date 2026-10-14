import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/data.source";
import { User, UserRole, UserStatus } from "../entities/user.entity";
import { signupSchema } from "../validations/user.validator";

const userRepository = AppDataSource.getRepository(User);

export const userSignUp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((detail) => detail.message),
      });
    }
    const { fullName, email, password } = value;
    // 2. Get organization ID from trusted server-side context
    // const organizationId = res.locals.organizationId as string | undefined;

    // if (!organizationId) {
    //   return res.status(400).json({
    //     message: "Valid organization or signup invitation is required",
    //   });
    // }

    // 3. Check if email already exists
    const existingUser = await userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = userRepository.create({
      // organizationId,
      fullName,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.PENDING,
    });

    const savedUser = await userRepository.save(user);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: savedUser.id,
        // organizationId: savedUser.organizationId,
        fullName: savedUser.fullName,
        email: savedUser.email,
        role: savedUser.role,
        status: savedUser.status,
        createdAt: savedUser.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};
