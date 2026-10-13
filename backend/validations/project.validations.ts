import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/data.source";
import {
  Project,
  ProjectVisibility,
} from "../entities/project.entity";
import { User } from "../entities/user.entity";
import { AppError } from "../errors/app.error";
import { ProjectMember } from "../entities/project.member.entity";

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, key, description, startDate, endDate, visibility  } = req.body;

  const userId = req.user?.id;

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
};
export const viewProject = async (
req: Request,
res: Response,
next: NextFunction,
) => {
const userId = req.user?.id;
const projectId = req.params.projectId;

if (!userId) {
throw new AppError(
"Authentication required.",
401,
"UNAUTHORIZED",
);
}

const userRepository = AppDataSource.getRepository(User);
const projectRepository = AppDataSource.getRepository(Project);
const projectMemberRepository =
AppDataSource.getRepository(ProjectMember);

const user = await userRepository.findOne({
where: { id: userId },
select: {
id: true,
organizationId: true,
role: true,
},
});

if (!user) {
throw new AppError(
"Authenticated user not found.",
401,
"USER_NOT_FOUND",
);
}


if (typeof projectId !== "string") {
  throw new AppError(
    "Invalid project ID.",
    400,
    "INVALID_PROJECT_ID",
  );
}

const project = await projectRepository.findOne({
where: { id: projectId },
});

if (!project) {
throw new AppError(
"Project not found.",
404,
"PROJECT_NOT_FOUND",
);
}
if (project.visibility === ProjectVisibility.PUBLIC) {
res.status(200).json({
message: "Project retrieved successfully.",
project,
});
return;
}
const belongsToSameOrganization =
user.organizationId === project.organizationId;
if (!belongsToSameOrganization) {
throw new AppError(
"You do not have permission to view this project.",
404,
"PROJECT_NOT_FOUND",
);
}
if (user.role === "ADMIN") {
res.status(200).json({
message: "Project retrieved successfully.",
project,
});
return;
}
const membership = await projectMemberRepository.findOne({
where: {
projectId: project.id,
userId: user.id,
},
select: {
projectId: true,
userId: true,
},
});

if (!membership) {
throw new AppError(
"You do not have permission to view this project.",
404,
"PROJECT_NOT_FOUND",
);
}

res.status(200).json({
message: "Project retrieved successfully.",
project,
});
};