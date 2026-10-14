import { In } from "typeorm";
import { Request, Response,NextFunction } from "express";
import * as bcrypt from "bcrypt";
import { AppDataSource } from "../config/data.source";
import { User, UserRole, UserStatus } from "../entities/user.entity";
import { Organization } from "../entities/organization.entity";
import { onboardingSchema } from "../validations/user.validator";

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


export async function registerOrganization(req: Request, res: Response) {

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

      return { org, newUser };
    });

    return res.status(201).json({
      organizationId: result.org.id,
      userId: result.newUser.id,
    });
  } catch (err: any) {
    // Postgres unique violation: email or slug already exists
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "Email or workspace URL already in use" });
    }
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
}