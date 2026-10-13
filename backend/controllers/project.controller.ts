import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/data.source";
import {
  Project,
  ProjectVisibility,
} from "../entities/project.entity";
import { User } from "../entities/user.entity";
import { AppError } from "../errors/app.error";

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const {
    name,
    key,
    description,
    startDate,
    endDate,
    visibility,
  } = req.body;

  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(
      "Authentication required.",
      401,
      "UNAUTHORIZED",
    );
  }

  const userRepository = AppDataSource.getRepository(User);
  const projectRepository = AppDataSource.getRepository(Project);

  const user = await userRepository.findOne({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(
      "Authenticated user not found.",
      401,
      "USER_NOT_FOUND",
    );
  }

  if (!user.organizationId) {
    throw new AppError(
      "You are not associated with an organization.",
      403,
      "ORGANIZATION_NOT_FOUND",
    );
  }

  const normalizedKey = key.toUpperCase();

  const existingProject = await projectRepository.findOne({
    where: {
      organizationId: user.organizationId,
      key: normalizedKey,
    },
    select: {
      id: true,
    },
  });

  if (existingProject) {
    throw new AppError(
      "This project key is already used in your organization.",
      409,
      "PROJECT_KEY_CONFLICT",
    );
  }

  const project = projectRepository.create({
    name,
    key: normalizedKey,
    description: description?.trim() || null,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    visibility: visibility ?? ProjectVisibility.PRIVATE,
    organizationId: user.organizationId,
    createdById: user.id,
  });

  const savedProject = await projectRepository.save(project);

  res.status(201).json({
    message: "Project created successfully.",
    project: savedProject,
  });
}