import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import * as bcrypt from "bcrypt";
import { AppDataSource } from "../config/data.source";
import { User, UserRole, UserStatus } from "../entities/user.entity";
import { Organization } from "../entities/organization.entity";
import { onboardingSchema } from "../validations/user.validator";
import { generateAccessToken, generateRefreshToken } from "../utils/auth.token";
import { UserSession } from "../entities/user.session.entity";

const userRepository = AppDataSource.getRepository(User);

export interface InvitedMember {
  email: string;
  role: UserRole;
}

export interface RegisterOrganizationPayload {
  fullName: string;
  email: string;
  passwordHash: string;
  orgName: string;
  slug: string;
  invitedMembers?: InvitedMember[];
}

export async function registerOrganization(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { error, value } = onboardingSchema.validate(req.body, {
    abortEarly: false, // return all errors, not just the first
    stripUnknown: true, // drop fields you didn't define
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      errors: error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      })),
    });
  }
  const { user, organization } = value;

  try {
    // hash before the transaction so the DB connection isn't held while hashing

    const passwordHash = await bcrypt.hash(user.password, 12);

    const result = await AppDataSource.transaction(async (m) => {
      // step 2 data: organization
      const Exiuser = await m.findOne(User, {
        where: { email: user.email },
      });
      if (Exiuser) {
        return null;
      }

      const org = await m.save(Organization, {
        name: organization.name,
        slug: organization.slug.toLowerCase(),
      });

      // step 1 data: user, linked to the organization
      const newUser = await m.save(User, {
        organizationId: org.id,
        fullName: user.fullName,
        email: user.email.toLowerCase(),
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const { rawRefreshToken, tokenHash, refreshExpiry } =
        generateRefreshToken();

      const uses = await m.save(UserSession, {
        userId: newUser.id,
        tokenHash,
        expiresAt: refreshExpiry,
        revokedAt: null,
        lastUsedAt: null,
      });
      if (!uses) {
        return null;
      }
      return { org, newUser, rawRefreshToken, refreshExpiry };
    });

    if (!result) {
      return res.status(409).json({
        message: "email already in use",
        errors: [{ field: "user.email", message: "already in use" }],
      });
    }

    const { org, newUser, rawRefreshToken, refreshExpiry } = result;

    const accessToken = generateAccessToken({
      userId: newUser.id,
      organizationId: org.id,
      role: newUser.role,
    });

    res.cookie("refreshToken", rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/refresh",
      expires: refreshExpiry,
    });

    return res.status(201).json({
      success: true,
      accessToken,
      data: {
        organizationId: org.id,
        userId: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
      },
    });
  } catch (err: any) {
    // Postgres unique violation: email or slug already exists
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "Email or workspace URL already in use" });
    }
    console.error(err);
    // return res.status(500).json({ message: "Something went wrong" });
    return next(err);
  }
}
