import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/data.source";
import {
  Project,
  ProjectVisibility,
} from "../entities/project.entity";
import { User } from "../entities/user.entity";
import { ProjectMember, ProjectRole } from "../entities/project.member.entity";
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

  const result = await AppDataSource.transaction(async (manager) => {
    const userRepository = manager.getRepository(User);
    const projectRepository = manager.getRepository(Project);
    const memberRepository = manager.getRepository(ProjectMember);

    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new AppError("Authenticated user not found.", 401, "USER_NOT_FOUND");
    }

    if (!user.organizationId) {
      throw new AppError("You are not associated with an organization.", 403, "ORGANIZATION_NOT_FOUND");
    }

    const normalizedKey = key.toUpperCase();

    const existingProject = await projectRepository.findOne({
      where: { organizationId: user.organizationId, key: normalizedKey },
      select: { id: true },
    });

    if (existingProject) {
      throw new AppError("This project key is already used in your organization.", 409, "PROJECT_KEY_CONFLICT");
    }

    const project = await projectRepository.save(projectRepository.create({
      name,
      key: normalizedKey,
      description: description?.trim() || null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      visibility: visibility ?? ProjectVisibility.PRIVATE,
      organizationId: user.organizationId,
      createdById: user.id,
    }));

    await memberRepository.save(memberRepository.create({
      projectId: project.id,
      userId: user.id,
      addedById: user.id,
      role: ProjectRole.ADMIN,
    }));

    return project;
  });

  res.status(201).json({
    success: true,
    message: "Project created successfully.",
    project: result,
    data: result,
  });
}


export const viewProjects = 
  async (req: Request, res: Response) => {
    // 1. Get the authenticated user's ID.
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(
        "Authentication required",
        401,
        "UNAUTHORIZED"
      );
    }

    const userRepository = AppDataSource.getRepository(User);

const user = await userRepository.findOne({
  where: { id: userId },
  select: {
    id: true,
    organizationId: true,
  },
});


    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "USER_NOT_FOUND"
      );
    }

    const projectRepository = AppDataSource.getRepository(Project);

    const projects = await projectRepository
      .createQueryBuilder("project")
      .leftJoin(
        "project.memberships",
        "accessMembership",
        "accessMembership.userId = :userId",
        { userId: user.id }
      )
      .leftJoinAndSelect("project.memberships", "membership")
      .where("project.organizationId = :organizationId", {
        organizationId: user.organizationId,
      })
      .andWhere(
        `(
          project.visibility = :publicVisibility
          OR accessMembership.userId = :userId
        )`,
        {
          publicVisibility: ProjectVisibility.PUBLIC,
          userId: user.id,
        }
      )
      .orderBy("project.createdAt", "DESC")
      .getMany();

    res.status(200).json({
      success: true,
      message: "Projects retrieved successfully",
      count: projects.length,
      data: projects,
    });
  }

export const viewProject = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const projectId = req.params.projectId;

  if (!userId || typeof projectId !== "string") {
    throw new AppError("Invalid project request.", 400, "INVALID_PROJECT_ID");
  }

  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: userId },
    select: { id: true, organizationId: true, role: true },
  });

  const project = await AppDataSource.getRepository(Project).findOne({
    where: { id: projectId, organizationId: user?.organizationId },
  });

  if (!user || !project) {
    throw new AppError("Project not found.", 404, "PROJECT_NOT_FOUND");
  }

  if (project.visibility === ProjectVisibility.PRIVATE && user.role !== "ADMIN") {
    const membership = await AppDataSource.getRepository(ProjectMember).findOne({
      where: { projectId, userId: user.id },
      select: { projectId: true, userId: true },
    });

    if (!membership) {
      throw new AppError("Project not found.", 404, "PROJECT_NOT_FOUND");
    }
  }

  res.status(200).json({
    success: true,
    message: "Project retrieved successfully.",
    project,
    data: project,
  });
};

